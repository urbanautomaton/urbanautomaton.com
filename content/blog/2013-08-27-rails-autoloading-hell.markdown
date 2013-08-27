---
kind: article
title: "Rails Autoloading and the Pit of Despair"
created_at: 2013-08-27 12:00
comments: true
draft: false
categories: [Rails, autoloading, magic]
---

Rails is, in part, known and loved for its ease of initial development.
A big part of the "wow!" factor of DHH's famous blog demonstration, its
conveniences lower the turnaround time between writing code and seeing
the results in the browser. Two of the key features are:

* Automatically loading our code's classes
* Dynamically reloading our code when we change it

Autoloading means we don't ever have to write `require`, or worry too
much about load paths; our classes are accessible from anywhere, so we
can just refer to them directly and they'll appear, as if by magic.[^1]

Reloading means we can edit our code and see the results in our browser
right away, without reloading our server. This means we can move much
more quickly between the browser and editor, and comes almost as a free
side-effect of autoloading[^2].

## So what's the problem?

I'm not going to address whether these features are good for our
development practices. I happen to believe they're both harmful, but
that's another article. Instead I'm going to talk about the significant
complexity lying behind them, and the problems it can cause.

Before that, though, some background on Ruby's constant lookup.

## Ruby Constant Lookup

Constant lookup in Ruby is reasonably simple, once you know the rules,
but it isn't always totally intuitive. When you refer to a constant in a
given lexical scope, that constant is searched for in:

1. Each entry in
   [`Module.nesting`](http://ruby-doc.org/core-2.0/Module.html#method-c-nesting)
2. Each entry in `Module.nesting.first.ancestors`
3. Each entry in `Object.ancestors` if `Module.nesting.first` is nil or
   a module.

Loosely speaking, the search first works upwards through the nesting at
the point of reference, then upwards through the inheritance chain of
either the containing class (if there is one), or that of `Object`
otherwise.

A good set of examples and a thorough explanation can be found [at
Conrad Irwin's blog](http://cirw.in/blog/constant-lookup.html) - for our
purposes it's sufficient to note that the following lookups perform
differently, because they are made in differently-nested lexical scopes:

```ruby
C = "At the top level"

module A
  C = "In A"
end

module A
  module B
    puts Module.nesting # => [A::B, A]
    puts C              # => "In A"
  end
end

module A::B
  puts Module.nesting # => [A::B]
  puts C              # => "At the top level"
end
```

In the first example, because `A` is a member of `Module.nesting`, it
can be searched for the constant `C`, so as `A::C` exists, it is
returned. In the second example, `A` is not part of the nesting, so
`::C` is returned.

Loins suitably girded, let's move on to the main topic:

## Rails Constant Autoloading

Ruby has a built-in
[`autoload`](http://ruby-doc.org/core-2.0/Module.html#method-i-autoload)
feature[^3], which allows the programmer to specify the file location at
which a given constant can be found. Ruby will then load that file when
the constant is first referred to by the program.

Rails, however, autoloads arbitrary constants at runtime - even ones
whose files didn't exist when the app was started. It can't simply use
Ruby's built-in `autoload`, because that needs to know both the name and
file location of each constant up front, and Rails knows neither of
these things at boot.

Instead, it implements its own autoload system, augmenting Ruby's
constant lookup with a set set of inference rules specifying which files
are expected to define a given constant name. These can be lazily
loaded when the constant is first used.

But how does this work?

### The autoload entry-point

Most Rubyists will be familiar with `#method_missing`, the method that
is invoked when a message is sent to a receiver that does not respond to
that message (they may also be familiar with the havoc that can be
wreaked by its injudicious use).

It has a counterpart for constant lookup,
[`Module#const_missing`](http://ruby-doc.org/core-2.0/Module.html#method-i-const_missing),
which is invoked when a reference to a constant fails to be resolved:

```ruby
module Foo
  def self.const_missing(name)
    puts "In #{self} looking for #{name}..."
    super
  end
end
```
```
> Foo::Bar
"In Foo looking for Bar..."
NameError: uninitialized constant Foo::Bar
```

When you refer to a constant, Ruby first attempts to find it according
to its built-in lookup rules, described above. If no matching constant
can be found, `Module#const_missing` is invoked - in the case of the
example above, the call is `Foo.const_missing("Bar")`.

This is where Rails takes over. Using a file lookup convention and its
knowledge about which constants have already been loaded, Rails
overrides `#const_missing` to load missing constants without the need
for explicit `require` calls by the programmer.

### File Lookup Rules

In contrast with Ruby's autoload, which requires the location of each
autoloaded constant to be specified in advance, Rails follows a simple
convention that maps constant names to filenames. Nesting corresponds to
directories, and constant names are underscored:

```ruby
MyModule::SomeClass # => my_module/some_class.rb
```

For a given constant, this inferred filename is then searched for within
a number of autoload paths, as determined by the `autoload_paths`
configuration option. By default, Rails searches in all immediate
subdirectories of the `app/` directory, and additional paths can be
added:

```ruby
# config/application.rb
module MyApp
  class Application < Rails::Application
    config.autoload_paths << Rails.root.join("lib")
  end
end
```

If `autoload_paths` is set to `["app/models", "lib"]`, a constant lookup
for a constant `User` would look for:

* `app/models/user.rb`
* `lib/user.rb`

Rails checks each of these locations in turn, and when one exists, it
speculatively loads the file, watching the expected location of the new
constant. If it appears after the file is loaded, the algorithm
succeeds. Otherwise, an error is raised that may be familiar:

```
LoadError: Expected app/models/user.rb to define User
```

### Nesting lookup

At this point, we've only seen how a single constant name maps to a
single file name. But as we know, a constant reference in Ruby can
resolve to a number of different constant definitions, which vary
depending on the nesting in which the reference was made. How does Rails
handle this?

The answer is: partially. As `Module#const_missing` passes no nesting
information to the receiver, Rails does not know the nesting in which
the reference was made, and it must make an assumption. For any
reference to a constant `Foo::Bar::Baz`, it assumes the following:

```ruby
module Foo
  module Bar
    Baz # Module.nesting => [Foo::Bar, Foo]
  end
end
```

In other words, it assumes the maximum nesting possible for a given
constant reference. The example reference is therefore treated exactly
the same as the following:

```ruby
module Foo::Bar::Baz # Module.nesting => []

module Foo::Bar
  Baz # Module.nesting => [Foo::Bar]
end
```

While there's been a significant loss of information, Rails does have
some extra information it can use. It knows that Ruby failed to resolve
this particular constant reference using its regular lookup, meaning
that whatever constant it should refer to cannot already be loaded.

When `Foo::Bar::Baz` is referred to, then, Rails will attempt to load
the following constants in turn, until it finds one that is already
loaded:

* `Foo::Bar::Baz`
* `Foo::Baz`
* `Baz`

As soon as an already-loaded constant `Baz` is encountered, Rails knows
this cannot be the `Baz` it is looking for, and the algorithm raises a
`NameError`.

This is, I think, the hardest part of the process to understand, and
it's one that leads to some highly counter-intuitive behaviour, of which
we'll see an example soon.

### Putting it all together

We can now construct a sketch of how Rails autoloading works. (This
doesn't quite capture the full process, but it's a good enough
representation for the purposes of this article.)

An unloaded constant `Foo::Bar::Baz` is referenced. Ruby fails to
resolve it, and calls `Foo::Bar.const_missing("Baz")`. Rails then:

1. Looks within `autoload_paths` for `foo/bar/baz.rb`
2. If a matching file is found, it is speculatively loaded:
  - If the correct constant is defined, success
  - Otherwise, an error is raised
3. If no matching file is found, it looks instead for `Foo::Baz`, then
   `Baz`, unless they are already defined
4. If none of the candidate constants can be loaded, it raises a
   `NameError`

Rails has thus freed us from manually loading our code. It's done so by
employing several assumptions, however, which come at varying costs.
Let's take a look.

## Rails autoloading pitfalls

For the sake of an already over-long post, I'm going to cover in detail
just two of the ways Rails autoloading can trip us up. There are more,
but these are illustrative of the sort of problems autoloading causes.

### Lost nesting information

We've seen how the nesting in which a constant is referred to determines
where it is looked for by Ruby. But we also saw that Rails doesn't
receive any nesting information, so is forced to guess at the intended
constant, using an assumed nesting and knowledge of what's already
loaded.

Assume the following files exist in `autoload_paths`, and no constants
are currently loaded:

```ruby
# qux.rb
Qux = "I'm at the root!"

# foo.rb
module Foo
end

# foo/qux.rb
module Foo
  Qux = "I'm in Foo!"
end

# foo/bar.rb
class Foo::Bar
  def self.print_qux
    puts Qux
  end
end
```

What does `Foo::Bar.print_qux` do?

In a normal ruby context, the reference to `Qux` within `Foo::Bar` could
only resolve to `Foo::Bar::Qux` (which doesn't exist), or `::Qux`, so
if we loaded the appropriate files we would see:

```
# Using normal ruby loading
> Foo::Bar.print_qux
I'm at the root!
=> nil
```

In an autoloaded context, things are rather different. The first time
around, this happens:

```
# Using Rails autoloading
> Foo::Bar.print_qux
I'm in Foo!
=> nil
```

Why is this?

Well, Rails doesn't know about the nesting `Qux` was referred to from.
It knows only that Ruby has failed to resolve `Qux` to any constant. So
it first looks for `Foo::Bar::Qux`, which does not exist.

It then checks whether a constant `Foo::Qux` is already loaded.  It is
not, so it attempts to load it, and because `foo/qux.rb` exists and
defines an apparently-correct constant, it succeeds. Our pre-existing
knowledge about Ruby constant lookup has thus been subverted - we've
loaded a constant that the nesting would not normally permit.

But did I just say "the first time around"? I certainly did, which leads
to our second pitfall:

### Load order dependence

If constants are loaded only when they're first encountered at runtime,
then by necessity their load order depends on the individual execution
path. This can mean that the same constant reference resolves to
different constant definitions in two runs of the same code.  Worse
still, the same constant reference twice in a row can give different
results.

Let's go back to our last example. What happens if we call `.print_qux`
twice?

```
> Foo::Bar.print_qux
I'm in Foo!
=> nil
> Foo::Bar.print_qux
NameError: uninitialized constant Foo::Bar::Qux
```

This is disastrous! First we've been given the wrong result, and then
we've been incorrectly told that the constant we referred to doesn't
exist. What on earth led to this?

The first time, as before, is down to the loss of nesting information.
Rails can't know that `Foo::Qux` isn't what we're after, so once it
realises that `Foo::Bar::Qux` does not exist, it happily loads it.

The *second* time, however, `Foo::Qux` is already loaded. So our
reference can't have been to that constant, otherwise Ruby would have
resolved it, and autoloading would never have been invoked. So the
lookup terminates with a `NameError`, even though our reference could
(and should) have resolved to the as-yet-unloaded `::Qux`.

We can fix this by referring to `::Qux` first, ensuring that it's loaded
for Ruby to resolve the reference:

```
> Qux
=> "I'm at the root!"
> Foo::Bar.print_qux
I'm at the root!
=> nil
> Foo::Bar.print_qux
I'm at the root!
=> nil
```

A funny thing has happened here. In order to get correct behaviour, we
deliberately loaded the constant we needed before we used it (albeit
indiretly, by referring to it, rather than loading the file that defined
it).

But wait; isn't this suspiciously close to explicitly loading our
dependencies with `require`, the very thing autoloading was supposed to
save us from?

To be fair, we could also have fixed the issue by fully qualifying all
of our constant references, i.e. making sure that within `.print_qux` we
referred to `::Qux` and not the ambiguous `Qux`. But this still costs us
our existing intuitions about Ruby's behaviour. Moreover, without
intimate knowledge of the autoloading process, we would have been hard
pressed to deduce that this was necessary.

### Other pitfalls

These are only a couple of the potential problems. Things get worse in
the gap between development and production, as in production Rails
eagerly loads certain paths. This alters the load order, which as we've
seen has the potential to change the meaning of constant references.

More potential problems lurk if you reopen class or module definitions -
again, depending on load order, these could end up treated as the main
definition, preventing autoloading from finding the "real" definition.
And again, depending on execution path, you can end up with completely
different behaviour.

## Final thoughts

Rails autoloading is supposed to provide simplicity. Ostensibly, we're
freed from thinking about load paths and where our dependencies come
from, and can just get on with using the code that we write. Until, that
is, we hit trouble.

It's at this point that the trade-off between convenience and complexity
starts to bite. In the examples I've shown above, a decent grounding in
Ruby's constant lookup was not sufficient to understand the problem. We
needed a deep understanding of Rails' autoloading system to understand
what was going wrong. Far from providing simplicity, this supposed
convenience has markedly increased our cognitive load.

So what have we really gained? Certainly, we have to restart our
development server less often. But we haven't been freed from knowing
about loading. On the contrary: we've been forced to face baffling bugs,
and have had to delve far more deeply into the specifics of code loading
than we ever did before. Perhaps, because we always had autoloading as a
crutch, our existing knowledge has atrophied -- or never even developed
-- putting us at an even greater disadvantage.

As with so many of Rails' conveniences, autoloading removes a barrier to
entry, and that's a worthy goal. The more I wrestle with it, though, the
more I think it's something I'd prefer to avoid.

---

[^1]:
  More than that, Rails automatically loads all of our gems for us, so
  we don't even have to explicitly load *other* people's code. Reasons
  this might not be such a swell idea are covered by [Myron Marston on
  his blog](http://myronmars.to/n/dev-blog/2012/12/5-reasons-to-avoid-bundler-require).

[^2]:
  Autoloading tracks what is autoloaded as part of its basic operation.
  All reloading then requires is to keep an eye on changes to the
  filesystem, and unload everything if a file has been written to.
  Autoloading then just reloads it all.

[^3]:
  Although it [may not have it much
  longer...](https://www.ruby-forum.com/topic/3036681)

---
kind: article
title: "Rails Autoloading and the Pit of Despair"
created_at: 2013-07-24 12:00
comments: true
draft: false
categories: [Rails, autoloading, magic]
---

Rails is, in part, known and loved for its initial ease of development.
A big part of the "wow!" factor of DHH's famous blog demonstration, its
conveniences lower the turnaround time between writing code and seeing
the results in the browser. Two of the key features are:

* Automatically loading our code's classes
* Dynamically reloading our code when we change it

Autoloading means we don't ever have to write `require`, or worry too
much about load paths; our classes are accessible from anywhere, so we
can just refer to them directly and they'll appear, as if by magic[^1].

Reloading means we can edit our code and see the results in our browser
right away, without reloading our server. This means we can iterate much
more quickly between the browser and editor.

## What's the problem?

I'm not going to address whether these features are good for our
development practices. I happen to believe they're both harmful, but
that's another article. Instead I'm going to talk about the significant
complexity lying behind them, and the problems it can cause.

Before that, though, some background on Ruby's constant lookup and
built-in autoload.

## Ruby Constant Lookup

Constant lookup in Ruby is reasonably simple, once you know the rules,
but it isn't always totally intuitive. When you refer to a constant in a
given lexical scope, that constant is searched for in:

1. Each entry in
   [`Module.nesting`](http://ruby-doc.org/core-2.0/Module.html#method-c-nesting)
2. Each entry in `Module.nesting.first.ancestors`
3. Each entry in `Object.ancestors` if `Module.nesting.first` is nil or
   a module.

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

## Ruby Constant Autoloading

Ruby has a feature called `autoload`[^2], which allows the programmer to
specify a location at which a named constant is defined, but defer its
actual loading until the constant is first used. To do this,
`Module#autoload` is called with the name of the constant, and its file
location.

We might have the following:

```ruby
# a.rb
class A
  puts "loading A!"
end
```
```
irb> require 'a'
Loading A!
=> true
```
```
irb> autoload :A, 'a'
=> nil
irb> A.new
Loading A!
=> #<A:0x000001036d9fa8>
```

In the second example, the output statement is not triggered until the
`A.new` call; the loading of `a.rb` has been delayed until the first
reference to `A` was made.

If we want to autoload nested constants, we can do that too, by making
the `autoload` call with the containing module as the receiver:

```ruby
module A
  autoload :B, 'a/b' # Autoload A::B from 'a/b.rb'
end
A.autoload :C, 'a/c' # Autoload A::C from 'a/c.rb'
```

You might use this to improve startup time by delaying expensive loads
until later, or to declare autoload locations for multiple optional
adapters, so that only the one that actually gets used is loaded ([Rack
does this](https://github.com/rack/rack/blob/e6284a3b744fca5373e1119ec37958af5f27f155/lib/rack/handler.rb#L87-L95),
for example).

## Rails Constant Autoloading

Rails, however, autoloads arbitrary constants at runtime - even ones
whose files didn't exist when the app was started. It can't simply use
Ruby's built-in `autoload`, because that needs to know both the name of
each constant and its location up front, and Rails knows neither of
those things at boot.

Instead, it implements its own autoload system, augmenting Ruby's
constant lookup with a set set of inference rules specifying which files
are expected to define a given constant name.  These can be lazily
loaded when the constant is first used.

### The autoload entry-point

Most Rubyists will be familiar with `#method_missing`, the method that
is invoked when a message is sent to a receiver that does not respond to
that message (they may also be familiar with the havoc that can be
wreaked by its injudicious use).

It has a counterpart for constant lookup,
[`Module#const_missing`](http://ruby-doc.org/core-2.0/Module.html#method-i-const_missing),
which is invoked whenever a reference to a constant fails to be
resolved:

```ruby
module A
  def self.const_missing(name)
    puts "In #{self} looking for #{name}..."
    super
  end
end
```
```
> A::B
"In A looking for B..."
NameError: uninitialized constant A::B
```

When you refer to a constant, Ruby first attempts to find it according
to its built-in lookup rules, described above. If no matching constant
can be found, `Module#const_missing` is invoked - in the case of the
example above, the call is `A.const_missing("B")`.

This is where Rails takes over. Using a file lookup convention and its
knowledge about which constants have already been loaded, it overrides
`#const_missing` to load missing constants without the need for explicit
`require` calls by the programmer.

### File Lookup Rules

In contrast with Ruby's autoload, which requires the location of each
autoloaded constant to be specified in advance, Rails follows a simple
convention that maps constant names to filenames. Nesting corresponds to
directories, and constant names are underscored:

```ruby
MyModule::SomeClass # => my_module/some_class.rb
```

These filenames are then searched for within a number of autoload paths,
as determined by the `autoload_paths` configuration option. By default,
Rails searches in all immediate subdirectories of the `app/` directory,
and additional paths can be added:

```ruby
# config/application.rb
module MyApp
  class Application < Rails::Application
    config.autoload_paths << Rails.root.join("lib")
  end
end
```

So if `autoload_paths` is set to `["app/models", "lib"]`, a constant
lookup for `User` would look for:

* `app/models/user.rb`
* `lib/user.rb`

Rails iterates through these locations, and when one exists, it
speculatively loads the file. It watches the location of the expected
new constant, and if it appears after the file is loaded, the algorithm
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
information to the receiver, Rails must make an assumption. For a
reference to a constant `Foo::Bar::Baz`, it assumes the following:

```ruby
module Foo
  class Bar
    Baz # => Module.nesting = [Foo::Bar, Foo]
  end
end
```

The above reference to `Baz` will be therefore be treated identically to
the following:

```ruby
class Foo::Bar
  Baz
end
```

Rails does have some extra information it can use, however. It knows
that Ruby failed to resolve this particular constant reference using its
regular lookup, meaning that whatever constant it should refer to cannot
already be loaded.

Assuming no constant `Baz` is loaded, Rails will attempt to load the
following constants in turn, *if they are not already loaded*:

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
3. If no matching file is found, look instead for `Foo::Baz`, then
   `Baz`, unless they are already defined
4. If none of the candidate constants can be loaded, raise a `NameError`

Rails has thus freed us from manually loading our code. It's done so by
employing several assumptions, however, which come at varying costs.
Let's take a look.

## Rails autoloading pitfalls

For the sake of an already over-long post, I'm going to cover in detail
just two of the ways Rails autoloading has tripped me up. There are
more, but I hope these are illustrative of the sort of problems
autoloading causes.

### Lost nesting information

We've seen how the nesting in which a constant is referenced determines
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

Why is this? Well, Rails does not know about the nesting `Qux` was
referred to from.  It knows only that Ruby has failed to resolve `Qux`
to any constant. So it first looks for `Foo::Bar::Qux`, which does not
exist.  It then checks whether a constant `Foo::Qux` is already loaded.
It is not, so it attempts to load it, and succeeds.

Our pre-existing knowledge about Ruby constant lookup has thus been
subverted. But did I just say "the first time around"? I certainly did,
which leads to our second pitfall:

### Load order dependence

If constants are loaded only when they're first encountered at runtime,
then by necessity their load order depends on the individual execution
path. This can mean that the same constant reference resolves to
different constant definitions in two runs of the same code.  Worse
still, the same constant reference twice in a row can give different
results.

Let's go back to our last example. What happens if we call `print_qux`
twice?

```
> Foo::Bar.print_qux
I'm in Foo!
=> nil
> Foo::Bar.print_qux
NameError: uninitialized constant Foo::Bar::Qux
```

This is pretty disastrous. First we've been given the wrong result,
and then we've been incorrectly told that the constant we referred to
doesn't exist. What on earth led to this?

The first time, as before, is down to the loss of nesting information.
Rails can't know that `Foo::Qux` isn't what we're after, so it happily
loads it.

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

A funny thing has happened here. In order to get correct behaviour,
we've ended up deliberately loading the constant we needed before we
used it. Isn't this suspiciously close to explicitly loading our
dependencies with `require`, the very thing autoloading was supposed to
save us from?

To be fair, we could also have fixed the issue by fully qualifying all
of our constant references, i.e. referring to `::Qux` and not `Qux`.
But this is still costing us our existing intuitions about Ruby's
behaviour. Moreover, without intimate knowledge of the autoloading
process, it's extremely hard to deduce that this is necessary, let alone
why.

### Production- and development-only bugs

So far the problems we've seen have been restricted to a purely
autoloading environment. But Rails varies its autoload behaviour
depending on environment, and this is a rich source of extremely hard-
to-replicate bugs.

In production, Rails does not lazily load all constants. Instead, there
are a set of paths from which all files are eagerly loaded. This
defaults to every subdirectory of the `app/` directory. It does so
depth-first in lexical order:

```
- bar.rb
- foo.rb
- qux/
  - bar.rb
  - foo.rb

# => [bar.rb, foo.rb, qux/bar.rb, qux/foo.rb]
```

We've already seen how order-dependent loading affected our last
example, altering the inheritance structure. Now we can see how altering
the load procedure can have a similar effect. Again, we take a simple
set of class definitions:

```ruby
# bar.rb
class Bar
end

# foo.rb
class Foo
end

# qux/bar.rb
module Qux
  class Bar < Foo
  end
end

# qux/foo.rb
module Qux
  class Foo
  end
end
```

In development mode, it's the same problem as last time: if `::Foo` is
loaded before `Qux::Bar`, then `Qux::Bar` will inherit from it, instead
of `Qux::Foo` as you'd normally expect from Ruby's constant lookup
rules.

Let's assume that we never encountered this problem in development,
though - we got lucky, and our code always refers to `Qux::Bar` first.
Then we get to production, and suddenly we see `NoMethodError` cropping
up.

This is because the loading has changed. Rails eagerly loads all of
the files in the order shown. When it reaches `qux/bar.rb`, `::Foo` is
loaded, but `Qux::Foo` is not. So in production, regardless of the order
in which the constants are referred to, `Qux::Bar` *always* inherits
from `::Foo`, and all of a sudden we've got a production bug we can't
replicate locally.

## Final thoughts

Rails autoloading is supposed to provide simplicity. We're freed from
thinking about load paths, and where our dependencies come from, and can
just get on with using the code that we write. Until, that is, we hit
trouble.

It's at this point that the trade-off between convenience and complexity
starts to bite. In all of the examples I've shown above, a decent
grounding in Ruby's constant lookup is not sufficient to understand the
problem. We needed a deep understanding of Rails' autoloading system,
the ways in which it invalidates our existing assumptions, and its
inherent limitations and compromises. Instead of decreasing, our
cognitive load has markedly increased.

So what have we really gained? Certainly, we have to restart our
development server less often. But we haven't been freed from knowing
about loading. On the contrary: we've encountered baffling bugs, and
needed to grapple with a loading system far more complex than normal.

---

[^1]:
  More than that, Rails automatically loads all of our gems for us, so
  we don't even have to explicitly load *other* people's code. Reasons
  this might not be such a swell idea are covered by [Myron Marston on
  his blog](http://myronmars.to/n/dev-blog/2012/12/5-reasons-to-avoid-bundler-require).

[^2]:
  Although it [will not have it much longer...](https://www.ruby-forum.com/topic/3036681)

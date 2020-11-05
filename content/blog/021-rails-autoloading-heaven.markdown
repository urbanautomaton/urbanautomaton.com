---
kind: article
title: Rails autoloading &#8212; now it works, and how!
created_at: 2020-11-04T20:28:47+00:00
comments: true
categories: []
---

Rails has had autoloading since the beginning. Autoloading means that
when we want to refer to our `User` model, we don't have to bother
writing `require 'user'`. Ain't no-one got time for that; every file
needs to talk to `User`, right?

I've [written previously about Rails' original
autoloader](/blog/2013/08/27/rails-autoloading-hell/) (referred to now
as the "classic" autoloader): how it works, and the many pitfalls it
creates. At the time I was pretty grumpy about it, having lost days of
debugging time to its quirks.

The old post covers the details, but fundamental to classic
autoloading's problems is its mechanism of operation: it uses
[`Module#const_missing`](https://ruby-doc.org/core-2.7.2/Module.html#method-i-const_missing)
to detect when a constant fails to resolve via normal means, and then it
attempts to find and load a file that defines it.

There are two reasons this approach can't reliably work:

* `Module#const_missing` is only invoked when a constant fails to
  resolve via normal means. Because a given constant reference in ruby
  [can potentially resolve to a number of constant
  definitions](https://cirw.in/blog/constant-lookup.html), this means that
  in certain circumstances, ruby can return the wrong value for a
  constant reference before autoloading can even take place.
* When `Module#const_missing` *is* invoked, it [doesn't provide enough
  information](https://bugs.ruby-lang.org/issues/2740) to reliably
  determine which constant should have been returned. This means that
  autoloading, too, will sometimes return the wrong value for a constant
  reference.

Much of the classic autoloader's complexity was involved with
compensating for these two insurmountable problems, making it hard to
understand or debug when it did, inevitably, go wrong.

As of Rails 6, though, there's a new loader:
[Zeitwerk](https://github.com/fxn/zeitwerk). It [purports to solve all
of the
problems](https://medium.com/@fxn/zeitwerk-a-new-code-loader-for-ruby-ae7895977e73)
with the classic autoloader, which is fantastic news![^1]

To do this, it uses three key mechanisms:

* [`Module#autoload`](https://ruby-doc.org/core-2.7.2/Module.html#method-i-autoload)
* [`Kernel#require`](https://ruby-doc.org/core-2.7.2/Kernel.html#method-i-require)
* [`TracePoint`](https://ruby-doc.org/core-2.7.2/TracePoint.html)

Let's see how it puts them together.

## Goodbye `#const_missing`, hello `#autoload`

Ruby has a built-in autoload mechanism,
[Module#autoload](https://ruby-doc.org/core-2.6.2/Module.html#method-i-autoload).
This lets us tell ruby in advance which file will define a particular
constant, without going to the expense of loading that file immediately.
Only when we refer to that constant for the first time does ruby
actually load the specified file:

```ruby
# a.rb
puts "Loading a.rb"
A = "Hi! I'm ::A"
```
```ruby
autoload :A, 'a'

puts A
# Loading a.rb
# Hi! I'm ::A
```

The really important difference between this and `Module#const_missing`
is that we can tell ruby which file defines which constant before the
constant is used, and this information is taken into account during
normal constant resolution.

This potentially eliminates both of the key failures of the
`#const_missing` approach. We wouldn't be trying to detect and recover
from failure, we'd just be augmenting ruby's existing constant
resolution mechanism with extra information.

To use `Module#autoload`, you need to know which file will define a
given constant before that constant is used. Rails (and broad ruby
convention) defines a predictable mapping between constant names and
files, which in theory would let us automate this:

```ruby
MyModule::MyClass # => my_module/my_class.rb
```

However, the classic autoloader supported loading constants from files
that didn't exist when the loader was initialised. If I create a new
`User` model in `app/models/user.rb`, I can head straight to an
already-running rails console and call `User.create` without doing
anything else.

Unless there's some process that watches the filesystem for changes like
this, we can't use `Module#autoload` to autoload files that don't exist
when our loader is initialised. Watching filesystems tends to be fiddly
and unreliable, particularly if you need to support multiple operating
systems.

How useful is this capability, though? If we reduce the scope of our
loader to support only files that exist when it's initialised,
`Module#autoload` becomes an option. And indeed, that's what Zeitwerk
does.[^2] Let's watch it in action.

## Loading a single file

To use Zeitwerk, we initialise a loader, and give it one or more root
directories to load from. By adding a logger, we can see it in
operation:

```ruby
loader = Zeitwerk::Loader.new
loader.push_dir('/ex')
loader.logger = Logger.new(STDOUT)
```

Now we can put some files in our root directory, and start the loader.
In the example snippets throughout this article, I'll show printed
output as comments after the line that causes them.

```ruby
# /ex/a.rb
A = "Hi! I'm ::A"
```
```ruby
loader.setup
# Zeitwerk: autoload set for A, to be loaded from /ex/a.rb

puts A
# Zeitwerk: constant A loaded from file /ex/a.rb
# Hi! I'm ::A
```

When we call `loader.setup` we can see Zeitwerk [detecting our file and
preparing it to be
autoloaded](https://github.com/fxn/zeitwerk/blob/034ae30d73247b8dda7df2992903ce560cd7f47f/lib/zeitwerk/loader.rb#L511-L516)
(this is when `Module#autoload` gets invoked). Then when we refer to the
constant `A` for the first time, we see it get loaded from the
pre-determined file, and finally we see its value printed.

It's interesting that Zeitwerk can detect the actual load happening in
order to log it! To see how it does so, let's look at a more complex
case than a single file.

## Implicit namespaces

In our first example we looked at a single file in a loader root path.
Almost any project of significant size will have some degree of
directory structure, and some degree of module nesting.

If we create a file `c/d.rb`, we want that to load a constant `C::D`.
This means we first have to load `C`.

However, `C` might be an uninteresting namespace module; it would be
tedious if for every such namespace we had to create boilerplate files
for them like this:

```ruby
# /ex/c.rb
module C
end
```

Zeitwerk therefore allows these namespaces to be implicit. Instead of
having that boilerplate file, Zeitwerk "autovivifies" the namespace
module from the directory name; essentially, it declares a module named
`C` for us, without the need for a ruby file.

That presents a problem, though: we're using the default ruby
`Module#autoload` to do our actual loading, and that doesn't know
anything about turning directories into modules. So how do we tell ruby
how to load `C` in advance?

Let's look at what happens when we have a single file in a directory:

```ruby
# /ex/c/d.rb
C::D = "Hi! I'm C::D"
```
```ruby
loader.setup
# Zeitwerk: autoload set for C, to be autovivified from /ex/c
```

On the initial setup we can see that Zeitwerk only prepared `C` for
autoloading. It must therefore have only looked at things immediately in
the root directory.

In the root directory it only found a directory, `/ex/c`, so
instead of saying "`C`...  to be autoloaded" from a file, it said
"`C`... to be autovivified" from the directory.

```ruby
puts C
# Zeitwerk: module C autovivified from directory /ex/c
# Zeitwerk: autoload set for C::D, to be loaded from /ex/c/d.rb
# C
```

Then when we refer to `C`, we see it [get
autovivified](https://github.com/fxn/zeitwerk/blob/034ae30d73247b8dda7df2992903ce560cd7f47f/lib/zeitwerk/loader/callbacks.rb#L39-L40),
and then `C::D` gets set up for autoloading - Zeitwerk must have
descended into the `c` directory to look for more things to autoload.

```ruby
puts C::D
# Zeitwerk: constant C::D loaded from file /ex/c/d.rb
# Hi! I'm C::D
```

Finally we refer to `C::D`, and that gets autoloaded from `c/d.rb`,
a regular ruby file.

How does the autovivification of `C` work, then, if there's no ruby file
to be read?

Zeitwerk does this by hijacking the loading part of `Module#autoload`.
When we call `autoload :C, '/ex/c'`, this means that when `C` is
f[irst used, ruby will automatically call `require '/ex/c'`.

By default, if we try to `require` a directory, ruby will produce a
`LoadError`. But since `Kernel#require` is a ruby method like any
other, Zeitwerk is able to [intercept that `require`
call](https://github.com/fxn/zeitwerk/blob/034ae30d73247b8dda7df2992903ce560cd7f47f/lib/zeitwerk/kernel.rb#L24-L32)
with a bit of monkey-patching[^3]:

```ruby
# lib/zeitwerk/kernel.rb
module Kernel
  module_function

  alias_method :zeitwerk_original_require, :require

  def require(path)
    if loader = Zeitwerk::Registry.loader_for(path)
      if path.end_with?(".rb")
        zeitwerk_original_require(path).tap do |required|
          loader.on_file_autoloaded(path) if required
        end
      else
        loader.on_dir_autoloaded(path)
      end
    else
      # code to handle paths not managed by Zeitwerk
    end
  end
end
```

Now Zeitwerk gets a chance to look at paths that are being loaded before
the files even get read. By declaring its autoloads with absolute
filesystem paths and `.rb` extensions (which would otherwise be
optional), it can reliably know which `require` calls are in directories
it's responsible for, and which are for directories or ruby files.

For every file loaded in your program, Zeitwerk does the following:

* If it's a ruby file the loader manages&hellip;
  * *Let ruby load it, and mark the constant as autoloaded*
* If it's a directory the loader manages&hellip;
  * *Autovivify the module, and set up the subdirectory for autoloading*
* Else the loader doesn't manage it, so&hellip;
  * *Let ruby load it*[^4]

The directory-handling code is fairly dense, but [here we can see the
namespace module being
created](https://github.com/fxn/zeitwerk/blob/034ae30d73247b8dda7df2992903ce560cd7f47f/lib/zeitwerk/loader/callbacks.rb#L39-L40),
assigned to the relevant constant name, and then the load operation
logged.

So far, so good! We've loaded regular files, and we've seen an implicit
namespace, where the existence of a directory was used to infer the
existence of a namespace module. That covers two of the three main
tricks Zeitwerk is based on.

To see the last big trick in Zeitwerk's bag, let's look at one more
scenario.

## Explicit namespaces

Sometimes we *do* want to explicitly define namespace modules, for
example if there's a method on that module. In that case there'll be
both a ruby file defining the module and a directory for files defining
the namespaced constants.

That means when we load a regular ruby file, there's now extra work to
do. If that file defines a class or a module, and there's a matching
subdirectory in our load path, we need to make sure we set up
autoloading for that subdirectory, like we did for implicit namespaces.

This is where
[`TracePoint`](https://ruby-doc.org/core-2.7.2/TracePoint.html) comes
in. `TracePoint` is part of the ruby standard library, and lets us
define callbacks in response to certain events occurring in the ruby
interpreter: method calls, module or class definitions, and so forth.

We're particularly interested in the `:class` event, which tells us
whenever a module or class is defined:

```ruby
trace = TracePoint.new(:class) do |tp|
  puts [tp.event, tp.self].inspect
end
trace.enable

module A; end
# [:class, A]
```

By setting up a trace on this event, Zeitwerk is able to spot when any
new module is defined. And similarly to how it looks at `require` calls
to check if it's responsible for those paths, it looks at the name of
the class or module to see if it's a constant whose loading should be
managed by Zeitwerk.

Let's watch Zeitwerk do this:

```ruby
# /ex/c.rb
module C
  def self.hello
    "Hi! I'm ::C"
  end
end

# /ex/c/d.rb
module C
  D = "Hi! I'm C::D"
end
```
```ruby
loader.setup
# Zeitwerk: autoload set for C, to be loaded from /ex/c.rb

puts C.hello
# Zeitwerk: autoload set for C::D, to be loaded from /ex/c/d.rb
# Zeitwerk: constant C loaded from file /ex/c.rb
# Hi! I'm ::C

puts C::D
# Zeitwerk: constant C::D loaded from file /ex/c/d.rb
# Hi! I'm C::D
```

Here we can see that Zeitwerk was able to detect the definition of `C`
while `c.rb` was still being loaded. Since `C` is a constant it's
responsible for, and since there's a `c` directory in the loader's root
directory, it descends into the `c` directory and sets up autoloading
there, finding `d.rb` and setting up autoloading for `C::D`.

In fact, this is even more flexible than it appears. We can reopen
autoloaded constants from anywhere, even locations outside
Zeitwerk-managed paths, and the definition in the loader path will still
be respected.

Using the same files as our last example:

```ruby
loader.setup
# Zeitwerk: autoload set for C, to be loaded from /ex/c.rb

module C
  # Zeitwerk: autoload set for C::D, to be loaded from /ex/c/d.rb
  # Zeitwerk: constant C loaded from file /ex/c.rb
  # Zeitwerk: constant C::D loaded from file /ex/c/d.rb
  puts D
  # Hi! I'm C::D
end

puts C.hello
# Hi! I'm ::C
```

This is an example that would have defeated classic autoloading. When we
open the `C` module outside the load path and it isn't already loaded,
we're defining it; `Module#const_missing` isn't called at all.
Consequently `c.rb` would never be loaded, and the method `C.hello`
would never be defined.

With TracePoint, however, we can spot the re-definition of constants
that the autoloader should be responsible for, and pre-emptively load
the relevant file from our loader path (if it exists).

## Conclusion

There's more to Zeitwerk (eager loading, reloading, thread safety and
more), but this has gone on long enough.

This is all really pleasing. There's still complexity here, but the
foundations seem really solid. I haven't yet worked on an app using the
new loader, but when I do I feel like I'll have far more confidence that
I can use constants (and in particular, namespace modules) more or less
any way I please without having to think too hard about it.

Many thanks to Xavier Noria and [everyone
else](https://github.com/fxn/zeitwerk#thanks) who contributed to this
project!

[^1]:
  Yes, I'm over a year late. It's fine, nothing worth mentioning has
  happened in 2020.

[^2]:
  This isn't quite true; Zeitwerk lazily descends into subdirectories of
  its root paths, so some files can be autoloaded even if they're
  created after initialisation, as long as they're created in an
  as-yet-unloaded subdirectory. I don't think that's an important
  capability, though; my suspicion is that the laziness is more of a
  resource optimisation.

[^3]:
  As Tom Stuart [pointed out to me on
  Twitter](https://twitter.com/tomstuart/status/1324445849695432710),
  `Module#autoload` hasn't always called `Kernel#require`; it was
  [modified in
  2015](https://github.com/ruby/ruby/commit/cd465d552c3a00341f4cb7f1d7a793d0ebcb6cde),
  precisely to allow this sort of neat trick.

[^4]:
  There's actually some extra handling in the "unmanaged" path that I
  skipped over, and which I think is used to handle people calling
  `require 'some_zeitwerk_managed_file'` without an absolute reference.
  But I think that's a bit of an edge case.

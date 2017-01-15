---
kind: article
title: Tracking method history in git
created_at: 2014-09-22T14:23:00+00:00
comments: true
draft: false
categories: [git]
---

Have you ever wanted to see the history of a single method in your
codebase? Well, with git [correctly configured for language-aware
diffs](/blog/2011/07/28/git-grep-and-language-specific-diffs/), you can:

```diff
$ git log -L :some_method:lib/some_class.rb
312732c - Add a friendly method <Simon Coffey>
diff --git a/lib/some_class.rb b/lib/some_class.rb
--- a/lib/some_class.rb
+++ b/lib/some_class.rb
@@ -2,1 +3,5 @@
+  def some_method
+    "Hello Simon"
+  end
+
 end

b8eb1c2 - Make method more inclusive <Simon Coffey>
diff --git a/lib/some_class.rb b/lib/some_class.rb
--- a/lib/some_class.rb
+++ b/lib/some_class.rb
@@ -3,5 +3,5 @@
   def some_method
-    "Hello Simon"
+    "Hello Everybody!"
   end

 end
```

More generally, the `-L` option allows you to display the history of
[ranges within a specified
file](http://man7.org/linux/man-pages/man1/git-log.1.html), specified
either using line numbers or a regex:

```
$ git log -L <start>,<end>:<file>
$ git log -L :<regex>:<file>
```

The line-number version is self-explanatory, but the regex version is
less obvious. What is the regex matching? From the manpage:

> If `":<regex>"` is given in place of `<start>` and `<end>`, it denotes
> the range from the first funcname line that matches `<regex>`, up to
> the next funcname line.

The funcname is where the language-aware diff setting comes in. With the
following in our project's `.gitattributes` file, git is able to detect
Ruby method declarations, which it treats as funcnames:

```
*.rb diff=ruby
```

When we use the second form of `git -L`, the regex we provide is matched
only against funcname lines, i.e. the method declarations within the
specified file. So for example, the log command above would return the
history for only the marked lines:

```ruby
# lib/some_class.rb
class SomeClass

  def some_method         # funcname match    [start]
    "Hello Everybody!"    #                    ...
  end                     #                    ...
                          #                   [end] 
  def some_other_method   # next funcname
    "Goodbye Everybody!"
  end

end
```

Because the range is re-evaluated for each commit, the full method will
be shown even if its length changes or it moves within the file (which
is, after all, pretty likely).

## Writing an alias

Now, I don't know about you, but I can't remember this syntax for
toffee. I'd like to be able to write an alias like so:

```
$ git lm some_method lib/some_class.rb
```

Getting positional arguments interpolated into a git alias is a bit
fiddly. However, we can bind aliases to arbitrary shell code, supplied
as a string. This means we can define a temporary function to capture
our input and construct a command, then execute the function. Here's one
possible version (shown on multiple lines for clarity -- it needs to be
on one line in practice):

```bash
# ~/.gitconfig
[alias]
  lm = "!f() {
          local method=$1;
          local file=$2;
          [[ -n \"$method\" && -n \"$file\" ]] || exit 1;
          git log -L :$method:$file;
        }; f"
```

## Caveats

There are some clear limitations to this regex-based approach:

* It's not really language-aware
* It only works on a single file

Because git has no real concept of what a Ruby method is (it just knows
what the declaration of one looks like), we're not really tracking the
history of a specific method, just some lines that probably contain a
method with the same name. For example, we can't tell the differents
between an instance and a class method, so if we defined both
`SomeClass#some_method` and `SomeClass.some_method`, we'd get the
history of whichever came first in the file.

We're also unable to track a method if it moves to a different file,
simply because range logs only let us specify one file to look at.

## The `method_log` gem

Happily, a tool exists (for Ruby, at least) that solves both of these
problems: [`method_log`](https://github.com/freerange/method_log), a
ridiculously impressive gem by [James
Mead](https://twitter.com/floehopper) that analyses your code at each
commit using the [`parser`](https://github.com/whitequark/parser) gem.
It can therefore distinguish class methods from instance methods,
allowing us to specify exactly what we're interested in:

```
$ method_log SomeClass#some_method
```

This comes at some considerable performance cost, but in my view this is
absolutely fine; as you wait for your results, you have ample
opportunity to explain to a colleague just how cool history tracking can
be with a dash of semantic awareness. Their eyes may glaze over in awe;
this is a sign that you are doing fine work. For extra material, I
highly recommend reading James's [blog
post](http://gofreerange.com/tracing-the-git-history-of-a-ruby-method)
about the implementation and optimisation of `method_log`.

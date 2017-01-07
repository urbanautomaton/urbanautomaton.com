---
kind: article
title: env_hooker, a tiny shell environment switcher
created_at: 2017-01-05 21:23
comments: true
categories: []
---

News! I've released a thing that, god willing, no-one will ever use.

It's an environment switcher called
[`env_hooker`](https://github.com/urbanautomaton/env_hooker), along the
lines of [direnv](https://github.com/direnv/direnv) and
[autoenv](https://github.com/kennethreitz/autoenv), i.e. something that
solves problems of the following sort:

> I've `cd`'d to a directory containing a node project. I'd like to add
> `node_modules/.bin` to my `PATH`.

or

> I've `cd`'d to a directory containing a ruby project. I'd like to
> switch to the correct ruby version for the project, and set up gems
> to install and run from a project-specific location.

This seemed to be a recurrent class of problem I ran into while working
on multiple ruby, JS and go projects, so I wrote the thing, and am now
inflicting the thing upon you.

## How do I use it?

`env_hooker` lets you register hooks: shell functions that will run when
you enter or exit a directory containing a file with a specific name.
For example, to solve the above node project requirement, I might do
this (assuming I've [already defined `prepend_path` and
`remove_from_path`
functions](https://github.com/urbanautomaton/dotfiles/blob/b606358e79011e281b75616bb457dca7cc44e52d/bashrc#L42-L66)):


```bash
# ~/.bashrc

. /usr/local/share/env_hooker/env_hooker.sh

# This runs when you enter a directory containing a .nodeproject
function enter_node_project() {
  local -r project_dir=${1}

  prepend_path "${project_dir}/node_modules/.bin"
}

# This runs when you leave a directory containing a .nodeproject
function exit_node_project() {
  remove_from_path "${project_dir}/node_modules/.bin"
}

# This specifies the file to look for (.nodeproject) and the
# suffix for the hook functions to run on entry and exit
register_env_hook .nodeproject node_project
```

Then, to designate a directory as a node project, I just have to ensure
that a `.nodeproject` file is present:

```
$ cd /path/to/my_node_project
$ echo $PATH
/bin:/usr/bin
$ touch .nodeproject
$ echo $PATH
/path/to/my_node_project/node_modules/.bin:/bin:/usr/bin
$ cd /
$ echo $PATH
/bin:/usr/bin
```

For a more complex example setting up chruby and gemsets for a ruby
project, you can have a look
[here](https://github.com/urbanautomaton/dotfiles/blob/cb3e08d52a3bc05349e9d711b78e14f29afb7cde/env_hooks/ruby).

## Why did you do this when those other things?

Excellent question.

Normally at this point it would be traditional to say something like my
solution is "lightweight" or "minimal" or "unopinionated" or "100%
written in bash"[^1], but the honest truth is that while it *is* pretty
tiny, this started as a hacky ruby-specific script derived from
[chruby's
auto-switching](https://github.com/postmodern/chruby/blob/d02904da6d5b634845bd42639e3a4c80fd8bfc78/share/chruby/auto.sh),
and got out of hand before I even knew direnv existed.

Along the way I learned a ton of bash (probably enough to convince me
that I'd like to avoid bash as much as possible from now on). I learned
that you can [lint bash](https://www.shellcheck.net/), and even [test
bash](http://ssb.stsci.edu/testing/shunit2/shunit2.html). Who knew?

## Why should I use this when those other things?

Excellent question.

You should probably use direnv to be quite honest.  (I'm sure autoenv is
fine too, but it doesn't support teardown which is really nice to have
IMO.)

Reasons you might prefer direnv:

* It's widely used and well documented
* It handles teardown automatically (environment changes are undone when
  you leave the project directory without writing your own exit hook)
* It has a bunch of built-in project templates (e.g. rubygems and
  bundler config for ruby projects)
* It has some stdlib helpers for path manipulation etc.
* It supports more shells (lots) than `env_hooker` (bash, zsh)

Reasons you might prefer `env_hooker`:

* It only ever runs code you control - direnv needs to maintain a
  whitelist of permitted `.envrc` files to prevent malicious files
  messing with your machine
* It works in non-interactive shells (although tbh if you want this,
  it'd be pretty easy to tweak direnv to do so, too)
* Different project types can be composed (e.g. you don't need to write
  a new node + ruby `.envrc`, you can just add the node and ruby hook
  files to the same directory)
* It supports nested projects of different types, e.g. you can enter a
  go project, and within that a ruby project
* You really like writing bash

## To sum up then

I reinvented a wheel and it only slightly goes clonk. Behold my [clonky
wheel](https://github.com/urbanautomaton/env_hooker).

[^1]:
  It is 100% written in bash though.

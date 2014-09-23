---
kind: article
title: Redirecting bash script output to syslog
created_at: 2014-09-09 14:07
comments: true
draft: false
categories: [bash, shell, logging, syslog]
---

That's right, a post about logging from bash scripts. Cool as *fuck*.

Anyway, this was prompted by the following tweet:

<blockquote class="twitter-tweet" lang="en"><p>Pretty much the best
thing ever you could put at the top of your bash script:<span class="nowrap"><code>&#10;&#10;exec
1&gt; &gt;(logger -s -t $(basename $0)) 2&gt;&amp;1</code></span></p>&mdash; Eric
Lindvall (@lindvall) <a
href="https://twitter.com/lindvall/status/509054237267853312">September
8, 2014</a></blockquote>

I could see roughly what was going on here, but I didn't quite
understand how it worked. In particular, what on earth was the <span class="nowrap">`1> >(logger ...)`<span>
bit all about?

## What does it do?

Adding this line to the top of your bash script will cause anything
printed on stdout and stderr to be sent to the syslog[^1], as well as being
echoed back to the original shell's stderr.

It's certainly desirable to have your script output sent to a
predictable location, so how does this work?

## Deconstructing the command

The whole line again:

```bash
exec 1> >(logger -s -t $(basename $0)) 2>&1
```

`exec` is a bash builtin, so to see what it does, we run `help exec`:

```
exec: exec [-cl] [-a name] [command [args ...]] [redirection ...]
  Replace the shell with the given command.

  Execute COMMAND, replacing this shell with the specified program.
  ARGUMENTS become the arguments to COMMAND.  If COMMAND is not
  specified, any redirections take effect in the current shell.
```

In this case `exec` is being used without `COMMAND` -- this line is
redirecting I/O for the current shell. So what do the redirections do?
To simplify things let's clear out the nested commands and just look at
the redirection:

```bash
exec 1> >(some-command) 2>&1
```

This is pretty simple redirection, obscured by that charming and easily
google-able bash syntax that we all <s>know and love</s> bluff and
tolerate. There are two redirections, the first being:

```bash
1> >(some-command)
```

This redirects file descriptor 1 (stdout) to the location
`>(some-command)`. That's not a normal filename, though: it's a [process
substitution](http://tldp.org/LDP/abs/html/process-sub.html), which is a
non-[POSIX](http://en.wikipedia.org/wiki/POSIX) bash feature[^2].
`>(some-command)` returns a file descriptor that `some-command` will use
as its stdin. This is exactly the same as piping our script's stdout
into `some-command`.

Then we redirect file descriptor 2 (stderr) to the same location as file
descriptor 1:

```bash
2>&1
```

In summary, we've redirected both stdout and stderr for our script to
the same place: the stdin for another process, which is a command
running in the background. In effect, this is the same as running the
script at the command line like so:

```
$ ./some-script 2>&1 | some-command
```
In this case, `some-command` is:

```bash
logger -s -t $(basename $0)
```

From the [`logger(1)`
manpage](http://unixhelp.ed.ac.uk/CGI/man-cgi?logger+1) we can see that
this writes entries to syslog, tagged (`-t`) with the filename of our script
(`$(basename $0)`) and echoing them to standard error (`-s`).

So the full line takes both stdout and stderr from our script, and
redirects them to the `logger` command, which sends them to the syslog
and echoes them back to stderr.

## Testing it out

Let's write a very simple test script, `logger_test`:

```bash
#!/bin/bash

exec 1> >(logger -s -t $(basename $0)) 2>&1

echo "writing to stdout"
echo "writing to stderr" >&2
```

When we run this on a Ubuntu system we see the following:

```
$ ./logger_test
logger_test: writing to stdout
logger_test: writing to stderr
```

We can also inspect the syslog (you may need root privileges):

```
$ grep logger_test /var/log/syslog
Sep  9 15:39:37 my-machine logger_test: writing to stdout
Sep  9 15:39:37 my-machine logger_test: writing to stderr
```

Great! We've got our output in the syslog and in our own console. What's
the downside?

### Mixed stderr and stdout

Because we're redirecting both stdout and stderr to a `logger` process,
and getting them back on stderr, we can no longer distinguish between
normal and error output, either in the syslog or in our terminal.

We could address this by using two background processes:

```bash
#!/bin/bash

exec 1> >(logger -s -t $(basename $0) 2>&1)
exec 2> >(logger -s -t $(basename $0))

echo "writing to stdout"
echo "writing to stderr" >&2
```

Here we send stdout to a separate `logger` process, but redirect *that*
process's stderr back to stdout. We can now distinguish between stderr
and stdout in our terminal, but we run into a second problem&hellip;

### Out-of-order messages

If we run our new script several times we are very likely to see the
following:

```
$ ./logger_test
logger_test: writing to stderr
logger_test: writing to stdout
```

This is because two separate background processes are handling our
stdout and stderr messages, and there's no guarantee that they'll write
their output in order.

We're caught: if we're getting our terminal output from background
processes, we can either use one background process, and receive ordered
messages but lose the ability to distinguish stdout and stderr; or we
can use separate background processes, and distinguish between stdout
and stderr but lose guaranteed message ordering.

## An alternative approach

Ideally we would like the following:

* log messages sent to syslog
* stdout and stderr kept separate
* stdout and stderr message order preserved

We've established that we can't have all of this by simply redirecting
our output to background processes. An alternative approach would be to
use helper functions for logging:

```bash
#!/bin/bash

readonly SCRIPT_NAME=$(basename $0)

log() {
  echo "$@"
  logger -p user.notice -t $SCRIPT_NAME "$@"
}

err() {
  echo "$@" >&2
  logger -p user.error -t $SCRIPT_NAME "$@"
}

log "writing to stdout"
err "writing to stderr"
```

This way we get our normal terminal output via the shell's own stdout
and stderr, but we can still send messages to syslog and tag them with
appropriate priorities (we can also fancy up our terminal output with
timestamps and colours if we want to).

The downside is that we have to explicitly log everything we want sent
to syslog. If we want the output of a command our script runs to be sent
to syslog, then we have to capture that output and log it, too.

## Conclusions

I'm not very good at these. Um&hellip;

* Centralised logging is good
* But so is separable and ordered output
* So use whatever approach is most appropriate for your task I guess?

Earth-shattering.

[^1]:
  Per Wikipedia, [Syslog is a standard for computer message
  logging](http://en.wikipedia.org/wiki/Syslog). In practice, this means
  that on any Unix-like system there will be a daemon running that will
  accept syslog messages, storing them in a central repository. This
  makes it a useful place to go looking for information about system
  processes and other processes that aren't necessarily important enough
  for dedicated log files.

[^2]:
  The same effect could be achieved in a POSIX-compliant way using
  [named pipes](http://mywiki.wooledge.org/NamedPipes).

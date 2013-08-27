---
kind: article
title: "Stop using development mode (and start using VMs)"
created_at: 2013-07-16 18:00
draft: true
comments: true
author: "Simon Coffey"
categories: [Devops, Chef, Configuration Management, Rails]
---

I recently spoke at LRUG about my experiences with Chef. One of the most
important points I wanted to make was that configuration management can
give us the tools to transform our development practices.

In the event, however, I ran out of time somewhat and rather garbled
this message (or at least failed to justify it), so I'm going to have
another stab at it here.

## Stop using development mode!

I referred in passing to a talk by a Tom Stuart, ["Stop Using
Development Mode"](http://www.youtube.com/watch?v=TQrEKwb5lR0), which he
gave at Railsberry in 2012. I highly recommend watching it if you
haven't seen it already.

If I can brutalise his main argument for the sake of brevity, however,
it is that development mode encourages:

1. Cowboy programming
2. Testless programming
3. Inside-out programming

All of which are detrimental to our code and products. Instead of
abusing development mode and hammering F5, we should be writing
acceptance tests where possible, and working from the external
requirements of our software *inwards*, so that we can be confident the
code we're writing satisfies a genuine need, and is not just some thing
we think might be useful later.

## Development mode lies to you

As well as encouraging bad practice, however, development mode is a rich
source of production-only (or development-only) bugs, for two main
reasons:

1. Convenience misfeatures (hello, lazy auto-loading!)
2. Ad-hoc dependency configurations

It's the latter point to which Chef pertains. I laboured this point a
bit in my talk, but it bears repeating: our software dependencies have a
potentially enormous effect on the meaning of our code.

By way of example, the following simple line in `/etc/my.cnf` is the
difference between MySQL silently truncating over-long strings, and
raising an error, almost as if it were an actual RDBMS:

```
sql_mode = 'STRICT_TRANS_TABLES'
```

These things are our responsibility as developers to handle, and if we
mess up configuring our dependencies (or if we don't, but our production
system is messed up), we're going to write bugs. So why are we `brew
install`ing all of this crucial stuff?

## Okay, but really? No development mode?

Well, not *no* development mode. As Tom points out in his talk, some
things simply aren't amenable to acceptance testing - look and feel, UI
"snappiness", and so forth.

For these things it's really cool that development mode is there, and
that our round-trip time for manual experimentation is low. But we
should be disciplined about using it. And when we do, it should still be
as close to production as possible.

## So... what, then?

Here's where configuration management / automated provisioning comes in,
and why in my opinion Chef gives you a great deal more than a bunch of
setup scripts in a language you happen to like.

Imagine this: a VM provisioned with the same code as your production
servers, running locally with:

1. Test and development databases with production config
2. A fully-deployable production-like web stack

Once you've got your app's server roles sorted out in Chef and
you're comfortable with Vagrant, this is a 10-minute job. You might
create a node definition like so:

```javascript
{
  "name": "development"
  "run_list": [
    "role[db_master]",
    "role[web]",
    "role[worker]",
    "role[memcache]"
  ],
  "attributes": {
    // tweak memory settings
  }
}
```

Then, thanks to the stupendous work done by Mitchell Hashimoto on
Vagrant, you really do just have to pipe this to a suitable VM config
and before you know it, you'll be simulating your entire production
setup on your laptop.

As a result, we see instant benefits:

1. Tests run against production-like config
2. You're using your whole production stack daily
3. You don't have to manually configure everything
4. You have to deploy your code to see it running

## Wait, 4 is a benefit?

Well, yes, I think it is. It sounds like a pain, and for some workflows
it will be. But for the most part it's *good* pain. It's good for the
same reason that suffering a Rails boot time every time your tests run
is good: that pain tells you that something is wrong.

Repeatedly experiencing a Rails boot time tells you too many of your
components are hopelessly shackled to your framework. Repeatedly having
to deploy your code to see if your latest change has worked tells you
your tests are insufficiently expressive. The pain encourages you write
decoupled code, or lean on automation to verify your code's behaviour.

Feel the good pain, and let it make you a better programmer.

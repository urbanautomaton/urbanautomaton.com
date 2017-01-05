---
kind: article
title: The Reluctant Sysadmin
created_at: 2014-04-14 10:54
comments: true
reject: true
categories: [Devops, Sysadmin, Automation]
---

Have you ever had this thought?

> Oh, fuck. I'm a sysadmin.

Yeah, me too. I'm not really a sysadmin, but for some reason I play one
in real life.

Let's not worry too much about how this happened. Maybe the real
sysadmin was struck down by grepper's elbow; maybe your CEO read an
article about devops and saw between the lines those magic words:
"reduced headcount". Maybe there was just no-one else around.

However it happened, here you are: up to your elbows in production
systems, and you're scared.

Well, so am I.

After a few years of this, though, I think I'm a bit *less* scared. This
article is an attempt to generalise the ways I've assuaged my fear.

## Monster Taxonomy

First things first: why are we scared? Well, I was scared of my servers.

I was scared to touch servers that weren't broken. I was scared to touch
servers that were broken, in case I made them *more* broken. I was
absolutely terrified of touching servers with production data on them
for reasons I can't articulate for fear of voiding the warranty on my
trousers.

Different servers represent different types of fear. Here's an
incomplete taxonomy of dread:

* *The Untouchables* - servers whose configuration was arrived at over a
  great deal of time, via a series of unrecorded steps.
* *The Hostages* - servers containing data whose continued existence was
  inextricably tied to that server's wellbeing.
* *The Indispensables* - single points of failure: servers that, should
  I break them, would take down the whole system.

These monsters are distinct, but all of them represent servers that are
more valuable than they should be, and it's this that causes our fear.

Fortunately for us, like all B-movie monsters, they have weaknesses.

## Battle 1: The Untouchable

The Untouchable server is a problem of automation. We fear it because if
it disappeared tonight, we can't recall the steps we would need to
recreate it. It represents an unknown, and potentially large amount of
time between a failure and the end of an outage.

If I have wisdom here, it is this:

<blockquote>
<em>A PILE OF BASH SCRIPTS IS FINE</em>
</blockquote>

Don't get me wrong, I am a fan of configuration management tools. If
you've got a month to learn Chef or Puppet: brilliant.

But a pile of bash scripts is fine. The goal here is to represent your
server setup in code, and *bash scripts are code*. You are going to type
a sequence of commands to set up this server. They might as well live in
revision control, eh?

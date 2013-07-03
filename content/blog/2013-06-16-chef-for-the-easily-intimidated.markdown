---
kind: article
title: "Chef for the easily intimidated"
created_at: 2013-06-16 15:37
comments: true
author: "Simon Coffey"
categories: [Devops, Chef, Configuration Management]
---

* Introduction
* Why configuration management
* State of the world
* Where do I start

Most developers don't do ops, and though the idea of devops is slowly
permeating through the industry, it's probably not the norm yet. So why
should we, as devs, care about configuration management? What has it
done for us lately?

Even if your organisation doesn't practise devops, and even if you never
touch a production server, I think configuration management can help you
understand your work better, and make your life as a developer a happier
one. Here's how.

## Your application is more than your code

All but the simplest web applications involve multiple interacting
components. The configuration of our databases affects what data safety
guarantees we can expect, what performance characteristics we can
expect, and these have profound implications for the design choices we
make.

When we run our code against ad-hoc configurations of these components,
we place ourselves at one more remove from the environment in which our
code will actually run; we deny ourselves potentially vital information
about its behaviour. We sow the seeds for production-only bugs, and
isolate ourselves from what our code really means.

I'm not saying that every developer should be responsible for building
the servers their code runs on; but I do think that we need to
understand the building blocks we're working with, and the environment
in which our code will run, if only so that we're aware of the
compromises we're making when we develop against dependencies on our
local machines.

## This is actually fun. No, really

Okay, maybe I'm overstating fun. But we're programmers, and there's real
programming meat to be had in configuration management.

Until recently I thought the claims for configuration management were
wildly oversold. I'd been told that configuring servers would be just
like programming, that it could just be an extension of the task I love:
identifying, clarifying and employing abstractions to solve complex
problems with my tiny meat brain.

For about a year and a half of using Chef (on and off), I thought any
claims that it was somehow "programming" as opposed to "scripting in a
personally congenial language" were massively overblown.

"This is just a glorified configuration file templating language," I
thought. And while I was appreciative enough for that alone, I did feel
vaguely resentful at being oversold.

So why did I feel that way? Why did I feel that Chef was not much more
than some over-complicated bash scripts and some string interpolation?
To answer that question (and find out why I was wrong), let's dive into
actually using Chef.

## A (very) brief intro to Chef

Chef is a configuration management tool. But what does that mean?
Simplifying somewhat, Chef performs the following tasks:

* Resolves configuration values (attributes) for a given node
  - automatic attributes from inspection of machine
  - cookbook-defined attributes according to precedence system
* Uses gathered data and a provided series of rules to construct a new
  configuration
* Converges the current configuration to the desired state

These rules are contained in recipes, which are bundled into cookbooks
(loosely speaking, the gems of the Chef world). Recipes are built using
a variety of (mostly) portable building blocks, abstracting relatively
low-level concepts that we all use every day:

* file - a file
* directory - a directory
* template - a file with interpolated values
* package - a binary package
* erl_call - a connection to a node within a distributed Erlang system



---
kind: article
title: Birds, slowly
created_at: 2017-01-18T21:07:24+00:00
publish_at: 2017-01-19T21:00:00+00:00
comments: true
categories: []
---

I've wanted for a while to write a bird flocking simulation, and am
finally actually doing so.

## Background

This is, unsurprisingly, something a bunch of people have done
previously. The most famous example is
[boids](http://www.red3d.com/cwr/boids/), a simple flocking model
created by [Craig Reynolds](http://www.red3d.com/cwr/index.html),
consisting of a handful of steering rules for individual birds that
result in a creditable flock simulation.

The rules are:

* *Separation*: steer to avoid crowding local flockmates
* *Alignment*: steer towards the average heading of local flockmates
* *Cohesion*: steer to move toward the average position of local flockmates

Here, "local flockmates" is defined as "other birds within some radius
of the steering bird, excluding a blind-spot behind the steering bird".
So the calculation for each bird only involves a subset of the birds
comprising the entire flock.

This produces some interesting stuff, but it's still only a pale
approximation of starling murmurations. It's almost certainly an act of
wild hubris to believe I can produce something as stunning as this, but
it's something to shoot for.

![starling murmuration](/images/blog/019/murmuration.gif)

## Goals

Mostly I just like to look at starlings, so if I can get that on my
computer I think that'd be pretty cool. There are some side benefits I'd
like to get out of this, though:

* Learn more 3D graphics (maybe WebGL)
* Resurrect my maths skills
* Improve at prototyping browser stuff
* Get better at javascript
* Learn a functional language that lets me avoid javascript
  (clojurescript probably)

and of course the #1 priority:

* Learn to think like a bird

Previous attempts have faltered miserably because I tried to do all of
this at once. Who *doesn't* like to start a personal enjoyment project
by learning about clojurescript build pipelines, the google closure
compiler, vim REPL plugins and all that shit?

Oh, right, I don't. This has reduced me to crying frustration.

I've therefore tried to break this down into achievable blobs, almost
as if I were writing software, a thing I do professionally for money and
mostly without crying.

1. Implement boids in 2D, using JS and canvas
2. Implement boids in 3D, using JS and webGL
3. Rewrite the 2D version in clojurescript
4. Rewrite the 3D version in clojurescript
5. Do better than boids!

Most importantly, I'm going to ditch the hell out of 3 and 4 if they
prove annoying.

## Progress

So far I'm on step 1.

I've gone from being able to draw dots on a canvas...

![20 dots moving in a straight line](/images/blog/019/notquitebirds.gif)

...to some sort of stoner protective circle...

![20 dots moving slowly in a ring](/images/blog/019/stonedbirds.gif)

...to something that looks passably birdlike for a while...

![20 dots moving slightly birdily](/images/blog/019/accelbirds.gif)

...but settles down into a very stable pattern quite quickly.

![20 dots orbiting a central point](/images/blog/019/fixedstablebirds.gif)

I've got the steering rules implemented, but haven't done the "nearby
flockmates" logic, so each bird considers every other bird when steering
(I think this is why my simulation gets stable so quickly).

I'll do a proper writeup of how this stuff works once I've got a 2D
version I'm happy with, along with some source code. Mostly I'm posting
this to give myself a sense of progress, which is also why I'm going to
end it with an almost rude degree of abruptness.

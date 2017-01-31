---
kind: article
title: Passable 2D Birds
created_at: 2017-01-29T13:15:26+00:00
comments: true
categories: []
---

As previously mentioned, I'm trying to build a [bird flocking
simulation](/blog/2017/01/19/birds-slowly/), initially based on the
famous [boids](http://www.red3d.com/cwr/boids/) algorithm, and at first
in 2D.

I've managed to get this first step to a point I'm vaguely happy with.
It looks like this (code at time of writing is
[here](https://github.com/urbanautomaton/boids/blob/b60991477baadacae25ff39b7faa735dafb21f3f/001-boids/index.html)):

<script src="/toys/birds-001/vendor/underscore-min.js" type="text/javascript"></script>
<script src="/toys/birds-001/vendor/sylvester.js" type="text/javascript"></script>
<canvas id="canvas" width="600" height="600" style="border: 1px solid
black;"></canvas>
<button onclick="init();">Reset</button>
<button onclick="toggleAnimation();">Pause/Play</button>
<script src="/toys/birds-001/src/main.js" type="text/javascript"></script>

I've implemented the main steering behaviours, and added a fourth,
goal-seeking (the colors correspond to the marked vectors on one of the
birds):

* <span style="color: red;">*Separation*</span>: steer to avoid crowding local flockmates
* <span style="color: green;">*Alignment*</span>: steer towards the average heading of local flockmates
* <span style="color: black;">*Cohesion*</span>: steer to move toward the average position of local flockmates
* <span style="color: blue;">*Goal-seeking*</span>: steer towards an arbitrary goal point

To keep the birds on screen, and also to prevent them falling into a
stable state, I've added some basic goal-seeking behaviour, in which
the birds try to head towards a randomly-changing position (shown by the
red dot).

The pink circle around one of the birds approximately indicates its
"neighbourhood", i.e. birds within this circle are considered its local
flockmates. In practice there's a blind spot behind each bird, but I'm
not good enough with the canvas API to draw this yet.

## Thoughts

I'm quite happy with this, but there's lots to improve upon.

### Steering

While the behaviours are all present, I'm not at all sure they're well
balanced. <s>In particular I don't think the separation behaviour has
enough effect at close range, and I suspect that the alignment and
goal-seeking behaviours are dominating. Without the goal-seeking, the
birds have a tendency to drift off in small clumps, never to be seen
again.</s> (Edit: I've updated the sim with much better repulsion
behaviour, and this has made a huge difference. I can now watch this for
quite a while without getting bored, which is one way of measuring
whether it's any good, I guess.)

The randomly changing goal is also responsible for pretty much all of
the apparent dynamism of the system. Without this, the birds fall into a
relatively stable pattern after a little while.

I want to spend more time balancing these behaviours, and I think that's
worth doing while it's still 2D, since the tweaks will (I hope)
translate directly to the 3D version.

### Flight model

One thing that made a big difference to the "look" of the birds was to
implement a maximum and minimum velocity, preventing the birds from
stopping completely. This contributes greatly to the occasional "peels"
of birds you see, since they have to make at least some sort of gradual
turn to change direction, which then influences nearby birds.

This is barely what you'd call a "flight model", though, so I'd like to
improve it - specifically I'd like my birds to turn more swoopily[^1]. I
think I'll leave this until I switch to 3D, though, since it's likely to
be completely different. In 3D I'll have a better concept of the birds'
orientation, so I'll be able to model different acceleration limits for
different headings, roll, yaw rates and so forth.

## Conclusion

I'll let you know when I have one.

[^1]:
  This is an ornithological term.

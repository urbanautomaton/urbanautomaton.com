---
kind: article
title: "Enough Magic"
created_at: 2011-12-21 21:42
comments: true
draft: true
categories: 
---

If I were to describe my hair preferences, they would be "lazily
barbarous". My brother Esau is an hairy man, and I am also an hairy man,
because I can't be buggered to shave.

Imagine my annoyance, then, when yaks queue up for depilation. I don't
want to shave you, yaks. I can barely raise a finger to shave myself. I
will shave you if I must, but really, you're a Himalayan artiodactyl;
you should treasure your gross, musky, wiry hair. It's fucking cold out.
Leave me alone.

So. Wherefore these vexatious ungulates? I put it to you that the
culprit is magic. Yes, magic has delivered us not unicorns, but fuck-off
great big bovines in need of a hot towel and a straight-edge razor.

If I may illustrate this by goring the ox that feeds me, I would like to
pick on two tools I use daily: Rails and Bundler.

### Bundler

I used to write Windows apps, so I know from dependency issues.
I've been to DLL Hell; I've fought with Microsoft's Strong Signing
documentation; I've seen attack ships on fire off the shoulder of Orion.
So believe me when I say: Bundler is bloody brilliant. Or at least,
the bit of it that works out your dependency tree, attempts to resolve
clashes, and notifies you of failures, is. Unfortunately, however, it
does not one, but two things:

  1. Resolve and install dependencies, and
  2. Auto-require every dependency you declare.

The former: brilliant. That's not a yak, that's a bobcat in a sporran
that brings you porridge and port for breakfast.

The latter: yak. Yak yak yak yak yak.

Why? A little bit of magic.

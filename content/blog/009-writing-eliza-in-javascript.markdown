---
kind: article
title: Writing ELIZA in Javascript
created_at: 2013-09-22 10:22
comments: true
draft: true
categories: []
---

A while back, stumped for anything to put on the front page of my
website, I used the intro text from [Dr.
Sbaitso](http://en.wikipedia.org/wiki/Dr._Sbaitso) as a placeholder:

> HELLO [UserName], MY NAME IS DOCTOR SBAITSO.
> 
> I AM HERE TO HELP YOU.
> SAY WHATEVER IS IN YOUR MIND FREELY,
> OUR CONVERSATION WILL BE KEPT IN STRICT CONFIDENCE.
> MEMORY CONTENTS WILL BE WIPED OFF AFTER YOU LEAVE,
> 
> SO, TELL ME ABOUT YOUR PROBLEMS.

Dr. Sbaitso (a toy program that shipped with early Sound Blaster cards)
is a close copy of [ELIZA](http://en.wikipedia.org/wiki/ELIZA), one of
the first chatterbots ever made. Written by Joseph Weizenbaum in the mid
'60s, it uses natural language processing to mimic a [Rogerian
psychotherapist](http://en.wikipedia.org/wiki/Rogerian_psychotherapy).

With simple keyword and pattern matching, ELIZA rearranges the user's
input phrases to construct basic (and frequently maddening)
interrogative versions of what was just said:

> *User*: I am lonely.
>
> *ELIZA*: Is it because you are lonely that you came to me?

It turns out that this is pretty easy to implement. The majority of
ELIZA's "intelligence" lives in a script, which consists primarily of a
list of keywords, weighted by importance, each with a number of
decomposition rules, e.g.:

```
key:
  word: was
  weight: 5
  decomps:
    - match: i was *
      responses:
        - Oh, you were (1)?
        - Would you like to be (1) again?
    - match: *
      responses:
        - Let's not dwell on the past. 
```

If an input phrase matches the keyword "was", it is tested against each
decomposition rule in turn. If the rule matches, a response is
constructed, optionally using captured parts of the input. If a
decomposition rule has multiple responses, it cycles through them each
time it matches, giving a degree of novelty.

Minor variations occur - some decomposition rules store their response
for later, allowing ELIZA to return to earlier subjects in a
conversation when it would otherwise be stumped. Others redirect to
specific keywords, allowing deduplication of the script (in the original
script, an example of this is the numerous foreign-language keywords
that redirect to a single set of responses containing variations on,
"I'm sorry, I only speak english.")

## A project!

I submit to you that no programmer can have used this placeholder text
without feeling an obligation to implement ELIZA for real. And as I
already felt I really ought to learn Javascript properly, this is what I
did.

As well as build a stupid thing on my website, I also wanted to get a
feeling for TDD in Javascript. I also decided to have a stab at doing it
in a strictly tell-don't-ask style, primarily to appease the evil Tom
Stuart. Yes, I burned my getters (well, nearly all of them).

From a surface API point of view, this wasn't particularly challenging -
rather than ELIZA providing a functional interface simply mapping
strings to strings, the ELIZA object is initialized with a client, and
both ELIZA and the client implement a trivial conversation protocol,
consisting solely of the `.say()` method:

![ELIZA conversation protocol](http://screenshots.urbanautomaton.com/20130925_bgtuz.png)



---
kind: article
title: Stop vim erasing Deckset slideshow settings
created_at: 2016-11-30 14:10
comments: true
categories: []
---

> *TL;DR:* if you use Deckset and edit your slides with vim, set
> `backupcopy=yes` to avoid vim clobbering the theme and other settings.

If you use [Deckset](www.decksetapp.com) to produce slideshows (I
recommend it!) and vim to edit the source files, you might notice that
Deckset keeps "forgetting" the theme, colours and aspect ratio you've
chosen for your deck.

This is because Deckset stores these settings as extended attributes on
the source file:

```
$ xattr slides.markdown
com.decksetapp.AspectRatio
com.decksetapp.ColorScheme
com.decksetapp.Theme
com.decksetapp.Thumbnail
```

When you edit and save a file in vim, however, these extended attributes
can get lost, due to the way vim manages backups. It has two main
strategies to make backups, controlled with the `backupcopy` option.
From the docs:

```
:help backupcopy

'backupcopy' 'bkc' string
  (Vi default for Unix: "yes", otherwise: "auto")

  When writing a file and a backup is made, this option tells
  how it's done.  This is a comma separated list of words.

  The main values are:
  "yes" make a copy of the file and overwrite the original one
  "no"  rename the file and write a new one
  "auto"  one of the previous, what works best
```

On OSX this defaults to `"auto"`, and the result can be that the
rename-and-replace strategy is used, as this is generally faster.
However, it's also the strategy that results in the extended attributes
being lost, because the original file is renamed to become the backup,
taking its extended attributes with it.

You can fix this by setting `backupcopy=yes` in your `.vimrc`, or
alternatively adding the following modeline to the top of your slides:

```
<!-- vim: set backupcopy=yes: -->
```

This forces the copy-and-overwrite strategy to be used for this file
only, allowing vim to do what it thinks is best in all other cases.

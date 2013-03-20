---
layout: post
title: "Paperclip: Padding Image Attachments"
date: 2011-01-26 10:59
comments: true
categories: 
---

At [Tribesports](http://tribesports.com) we deal with a vast quantity of
external images. We use [thoughtbot](http://thoughtbot.com/)'s excellent
[Paperclip](https://github.com/thoughtbot/paperclip) gem for all of our
image attachments; it allows us to manage everything from design formats
to CDN storage with so little effort it's almost insulting.

I'm currently resizing the images for our site to fit a
new design, and came across a requirement not supported by
Paperclip's image format strings (which are inherited from
[ImageMagick](http://www.imagemagick.org/)); namely, to pad images to
the desired aspect ratio, rather than crop or distort them.

This is very simple to achieve using a custom processor. First, we set
up a simple model with our desired geometries, and tell Paperclip that
we want to use a custom processor called <code>Padder</code>:

{% gist 797320 user.rb %}

Next, we create our custom <code>Padder</code> processor. This needs
to go somewhere in our application's auto-load path; I placed it in
<code>lib/paperclip</code>.

We want to inject our custom behaviour at the
resizing stage, so we sub-class Paperclip's
[Thumbnail](http://rdoc.info/github/thoughtbot/paperclip/master/Paperclip/Thumbnail)
class, and override its <code>#transformation_command</code> method.
This returns an array of strings that are joined to produce an
ImageMagick convert command. To pad an image to a specified size, we use
ImageMagick's <code>-extent</code> option with a background colour and
an alignment. Then we simply append it to the super's transformation
command:

{% gist 797320 padder.rb %}

The <code>#geometry_extent</code> method just creates a pure geometry
specification string (without any special imagemagick modifiers). And
that's all there is to it.





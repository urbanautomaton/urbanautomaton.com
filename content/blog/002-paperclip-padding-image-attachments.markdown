---
kind: article
title: "Paperclip: Padding Image Attachments"
created_at: 2011-01-26T10:59:00+00:00
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
we want to use a custom processor called `Padder`:

~~~ ruby
class User < ActiveRecord::Base
  has_attached_file :image,
    :styles => {
      :small     => "50x50",
      :medium    => "130x130>",
      :large     => "280x280>",
      :haystacks => "330x330>" },
    :processors => [:padder]
end
~~~

Next, we create our custom `Padder` processor. This needs
to go somewhere in our application's auto-load path; I placed it in
`lib/paperclip`.

We want to inject our custom behaviour at the
resizing stage, so we sub-class Paperclip's
[Thumbnail](http://rdoc.info/github/thoughtbot/paperclip/master/Paperclip/Thumbnail)
class, and override its `#transformation_command` method.
This returns an array of strings that are joined to produce an
ImageMagick convert command. To pad an image to a specified size, we use
ImageMagick's `-extent` option with a background colour and
an alignment. Then we simply append it to the super's transformation
command:

~~~ ruby
module Paperclip
  class Padder < Thumbnail
    def transformation_command
      super + ["-gravity center",
               "-background white",
               "-extent", %["#{geometry_extent}"]]
    end

    def geometry_extent
      "#{target_geometry.width.to_i}x#{target_geometry.height.to_i}"
    end
  end
end
~~~

The `#geometry_extent` method just creates a pure geometry specification
string (without any special imagemagick modifiers). And that's all there
is to it.

---
kind: article
title: "Paperclip: Timestamping Attachments on Upload"
created_at: 2011-04-22T10:58:00+00:00
comments: true
categories: 
---

It's not my intention to make this a Paperclip-only blog, but I recently
had another requirement that was quite simply accomplished, and thought
it was common enough to be useful to others.

Timestamping attachments could be valuable for several reasons – in our
case, it was made necessary due to our site moving to S3 and Cloudfront
for the delivery of our static assets. If the content of a file changes
but its name remains the same, Cloudfront’s edge nodes will happily
continue serving stale content for any asset they’ve cached, which is
obviously undesirable.

We therefore need to ensure that attachments have their filename
timestamped on upload. Initially I did this with a ghastly hack
involving subclassed Tempfiles with an overridden `#original_filename`
method, but this was, well, ghastly. I also briefly tried using
Paperclip’s built-in callbacks, but it turned out to be much nicer to do
it with a custom processor, like so:

~~~ ruby
module Paperclip
  class TimeStamper < Processor
    def initialize(file, options={}, attachment=nil)
      super(file,options,attachment)
      timestamp_filename
    end

    def timestamp_filename
      original_filename = attachment.instance_read(:file_name)
      extension         = File.extname(original_filename)
      date_format       = @attachment.options[:date_format] ||
                            "%Y%m%d%H%M%S"
      timestamp         = DateTime.now.strftime(date_format)
      new_filename      = "#{timestamp}-#{original_filename}"
      @attachment.instance_write(:file_name, new_filename)
    end

    def make
      @file
    end
  end
end
~~~

The key bit is using the attachment's
`#instance_write method`, as suggested by [Trevor
Turk](http://trevorturk.com/2009/03/22/randomize-filename-in-paperclip/)
for a slightly different purpose. This sets the instance variables that
Paperclip uses to determine the uploaded filename.

Place this file somewhere in your load path (ideally
`lib/paperclip_processors`), and tell your models to use it after
thumbnailing (or before, actually, it doesn't really matter). Note that
you now have to explicitly tell Paperclip that you want to use the
Thumbnail processor.

~~~ ruby
class User < ActiveRecord::Base
  has_attached_file :image,
    :styles => {
      :large => "280x280#",
      :medium => "130x130#",
      :small =>   "50x50#",
      :tiny => "30x30#" },
    :processors => [:thumbnail, :timestamper],
    :date_format => "%Y%m%d%H%M%S"
end
~~~

You can specify the date format using the standard format strings,
or you can omit the option and a default will be used. Now whenever
an attachment is created or altered, its filename will have a date
string prepended to it, and your new content will be served as intended,
whatever your distribution details are.

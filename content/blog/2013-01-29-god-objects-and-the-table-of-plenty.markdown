---
kind: article
title: "God Objects and the Table of Plenty"
created_at: 2013-01-29 15:37
comments: true
author: "Simon Coffey"
categories: [Rails, Partitioning, ActiveRecord, Performance]
---

Most developers have encountered a God Object or two in their travels.
More like Greek or Norse gods than the rather ascetic current crop, God
Objects roam freely through applications, appearing in many forms and
gleefully coupling with all and sundry.

When your business objects are also your persistence objects, as is very
ofteni the case in Rails apps, this tendency comes with a counterpart:
the Table of Plenty. If all your behaviour is in one class, it's
seductively convenient to have all the data it needs sitting right
there. Most likely it happens incrementally, as each new column on its
own doesn't seem to warrant a separate entity, but combine to form a
table that resists efficient querying.

While this is all very well when you've just got a handful of rows,
and may indeed speed up your development at first, you'll run into
performance problems sooner or later if one of your tables gets wide as
well as long. And if your God Object has been as prolific as they tend
to be, then there may be a great deal of code coupled to this particular
database representation. This in turn stymies your efforts to split your
table into more sensible chunks.

## A way out

This blog post details an approach to allow semi-transparent vertical
partitioning as a *strictly intermediate step* in refactoring your
God Objects in Rails. We will aim to split a large table into several
smaller ones, while preserving as much of the original model's interface
as possible, minimising the amount of client code that needs to change.
Essentially, we decouple the God Object problem from the Table of Plenty
problem, allowing them to be tackled separately.

<!--more-->

### Background

The obvious Table of Plenty candidate in a typical Rails app is the
one backing the User model. Starting life as just some authorization
details, profile pages were soon required, so a bio field got added;
some users like to write essays, so it was made a `TEXT` column. Later
on some external integration was added, so the table picked up some
credentials for a third-party site. Throw in some more strings for
location info, maybe an image attachment for a profile picture, and
before you know it your table is many kilobytes wide.

### The Table

For brevity, we will consider a smallish table (albeit one that could
probably still use splitting up), with timestamps elided:

~~~
> DESC users;
+--------------------+--------------+------+-----+---------+
| Field              | Type         | Null | Key | Default |
+--------------------+--------------+------+-----+---------+
| id                 | int(11)      | NO  | PRI  | NULL    |
| username           | varchar(255) | YES | UNI  | NULL    |
| email              | varchar(255) | NO  | MUL  |         |
| name               | varchar(255) | YES |      | NULL    |
| encrypted_password | varchar(255) | YES |      | NULL    |
| sign_in_count      | int(11)      | YES |      | 0       |
| last_sign_in_at    | datetime     | YES |      | NULL    |
| last_sign_in_ip    | varchar(255) | YES |      | NULL    |
| bio                | text         | YES |      | NULL    |
| image_file_name    | varchar(255) | YES |      | NULL    |
| image_content_type | varchar(255) | YES |      | NULL    |
| image_file_size    | int(11)      | YES |      | NULL    |
| location           | varchar(255) | YES |      | NULL    |
+--------------------+--------------+-----+------+---------+
~~~

(Sidenote: another lesson here is to control your string limits. Rails
defaults strings to 255 characters, but do you *need* that many? Think
about your usage. Excessively wide columns cause your database to go to
disk more frequently than necessary on reads, and cost you extra time on
writes, particularly if there's an index on the column in question.)

There are several things going on in this table. It's responsible for
authorization data (`username`, `email`, `encrypted_password`), profile
information (`name`, `bio`, the image columns), and analytics data (the
sign-in columns). That's two read-heavy tables (auth, profiles), one
write-heavy table (analytics), and one join table (auth again). So let's
split it up accordingly:

* `users` - purely auth info

~~~
+--------------------+--------------+------+-----+---------+
| Field              | Type         | Null | Key | Default |
+--------------------+--------------+------+-----+---------+
| id                 | int(11)      | NO   | PRI  | NULL   |
| username           | varchar(255) | YES  | UNI  | NULL   |
| email              | varchar(255) | NO   | MUL  |        |
| encrypted_password | varchar(255) | YES  |      | NULL   |
+--------------------+--------------+------+------+--------+
~~~

* `user_profiles` - purely profile info

~~~
+--------------------+--------------+------+-----+---------+
| Field              | Type         | Null | Key | Default |
+--------------------+--------------+------+-----+---------+
| id                 | int(11)      | NO   | PRI | NULL    |
| user_id            | int(11)      | NO   | MUL | NULL    |
| name               | varchar(255) | YES  |     | NULL    |
| bio                | text         | YES  |     | NULL    |
| location           | varchar(255) | YES  |     | NULL    |
| image_file_name    | varchar(255) | YES  |     | NULL    |
| image_content_type | varchar(255) | YES  |     | NULL    |
| image_file_size    | int(11)      | YES  |     | NULL    |
+--------------------+--------------+------+-----+---------+
~~~


* `user_trackings` - purely analytics info

~~~
+--------------------+--------------+------+-----+---------+
| Field              | Type         | Null | Key | Default |
+--------------------+--------------+------+-----+---------+
| id                 | int(11)      | NO   | PRI | NULL    |
| user_id            | int(11)      | NO   | MUL | NULL    |
| sign_in_count      | int(11)      | YES  |     | 0       |
| last_sign_in_at    | datetime     | YES  |     | NULL    |
| last_sign_in_ip    | varchar(16)  | YES  |     | NULL    |
+--------------------+--------------+------+-----+---------+
~~~

This is a substantially nicer schema. Join queries no longer have to
deal with a variable-width column, because all the key user identifiers
are in the small `users` table, well away from `bio` data. Our most
frequently written table, `user_trackings` is now narrow, and doesn't
cause rewriting of indexed columns like `email` and `username`. Now we
just need to fix up our model interface.

### The Model

We're going to create two new models to represent these new tables,
`UserProfile` and `UserTracking`. Then we'll define modules that mimic
the original interface to the `User` model.



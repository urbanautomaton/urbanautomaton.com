---
kind: article
title: "git grep and language-aware diffs"
created_at: 2011-07-28 17:56
comments: true
categories: 
---

I'm a heavy user of git-diff - before every commit I review my changes
for a final sanity check. However, I only recently discovered that my
diffs weren't telling me as much as they might.

Git's diffs are presented in *hunks*, with each set of adjacent changes
shown with some surrounding context, and a header line providing further
contextual information. If I run the command

    $ git diff app/models/landing_page.rb

I see:

~~~ diff
diff --git a/app/models/landing_page.rb b/app/models/landing_page.rb
index 6ad43a7..3524d43 100644
--- a/app/models/landing_page.rb
+++ b/app/models/landing_page.rb
@@ -29,6 +29,7 @@ class LandingPage < ActiveRecord::Base
         "http://tribesports.com/products/#{cheapest_result}"
       end
     end
+    hello
   end
~~~

Here we can see some file information, some git object information, and
then a single diff hunk, prefixed with the header:

~~~ diff
@@ -29,6 +29,7 @@ class LandingPage < ActiveRecord::Base
~~~

After the line information there is some local context for the
hunk. In this case, however, we're only being shown the first line
of the file. This is because git doesn't automatically know it's
looking at a ruby file. But git has [a number of language-aware diff
modes](http://www.kernel.org/pub/software/scm/git/docs/gitattributes.html#_defining_a_custom_hunk_header)
that allow it to provide finer-grained hunk headers. If I add the line

    *.rb diff=ruby

to the .gitattributes file in my project root, I get the following output:

~~~ diff
diff --git a/app/models/landing_page.rb b/app/models/landing_page.rb
index 6ad43a7..3524d43 100644
--- a/app/models/landing_page.rb
+++ b/app/models/landing_page.rb
@@ -29,6 +29,7 @@ def cheapest_url
         "http://tribesports.com/products/#{cheapest_result}"
       end
     end
+    hello
   end
~~~

Now diff hunks are presented with the appropriate context; in this case,
a method declaration.

This seems like a fairly small benefit, but the language-aware diff
features are used in other contexts. For example, the command

    $ git grep -p <pattern>

will find all instances of \<pattern\> in your checked-in code,
labelling them by the detected context. Without ruby diffs enabled, if I
run

    $ git grep -p rescue

I will see all classes that contain rescue statements. With ruby diffs
enabled, I'll see all methods containing rescue statements:

    $ git grep -p rescue
    app/models/landing_page.rb=  def refresh_results
    app/models/landing_page.rb:      rescue

Nifty, eh?

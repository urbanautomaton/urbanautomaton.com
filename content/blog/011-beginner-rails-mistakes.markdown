---
kind: article
title: Beginner Rails Mistakes
created_at: 2014-05-16 13:37
comments: true
reject: true
categories: [Rails]
---

Rails is, if not a beginner's tool, then a tool very frequently used by
beginners: beginners at programming; beginners at web programming; or
just beginners at Rails itself.

However, much of the discussion about How To Write Rails Apps takes
place at an uncomfortably high level of abstraction. The higher you go,
the more likely that the answer to "should I use Technique X?" is "it
depends" -- a judgement call that no blog post can make for you.

Here instead are some simple suggestions of things to avoid; things that
Rails makes very easy to do, but are almost always a bad idea. They are
all errors I have made repeatedly, and regretted extensively.

* [Using instance variables in
  partials](#instance-variables-in-partials)
* [Excessively nested routes](#excessively-nested-routes)
* [Too many associations](#too-many-associations)
* [Coupling models to forms](#coupling-models-to-forms)

## Instance variables in partials

Rails has an unusual way of communicating data from the controller to
the view. You don't explicitly define what data is to be passed to the
view; instead, you set instance variables in the controller, and these
appear in the view, again as instance variables[^1].

Instance variables can be set in a large number of places before the
render starts:

* In the controller action
* In `before/after_filter`s in the controller
* In `before/after_filter`s in the controller's ancestors
* In `before/after_filter`s in gem code

They can be also be accessed in a large number of places during the
render itself:

* In the layout
* In the top-level template
* In any partial that is called
* In any helper method that is called

They are effectively global state, and one problem with global state is
that it allows complex interactions between many very distant areas of
your code. This is sometimes referred to as "action at a distance" -
e.g. an ivar set in a `before_filter` in a controller superclass can
have an effect on a rendered partial three levels down from the main
template, with no indication in the call stack between those two points
that any dependency exists.

### So what?

These are generalities. What's specifically wrong with using instance
variables in partials?

Partials are ostensibly reusable. They can be invoked by any render pass
in your application. By contrast, top-level templates are likely to be
associate with a single controller action[^2].

### Tie yourself a knot

As a result, we can do things like this:

```ruby
# app/controllers/posts_controller.rb
class PostsController < ApplicationController
  before_filter :load_user

  def index
    @posts = @user.posts
  end

  private

  def load_user
    @user = User.find(params[:user_id]) if params[:user_id]
  end
end
```

```erb
<% # app/views/posts/index.html.erb %>
<%= render :partial => "/users/bio" %>
<% @posts.each do |post| %>
  <%= render post %>
<% end %>
```

```erb
<% # app/views/users/_bio.html.erb %>
<div>
</div>
```

## Excessively Nested Routes

Rails makes it very easy to write routes that closely reflect your
database schema.

Let's say our site has `Users`. `Users` have many `BlogPosts`, and
`BlogPosts` have many `Comments`. We might write a routes section like
this:

```ruby
resources :users do
  resources :posts do
    resources :comments
  end
end
```

This seems pretty simple, but it's generated a thicket of URLs, many
embedding far more information than is actually needed to locate the
resource they're supposed to identify:

```
GET    /users/:user_id/posts/:post_id/comments         
POST   /users/:user_id/posts/:post_id/comments         
GET    /users/:user_id/posts/:post_id/comments/new     
GET    /users/:user_id/posts/:post_id/comments/:id/edit
GET    /users/:user_id/posts/:post_id/comments/:id     
PUT    /users/:user_id/posts/:post_id/comments/:id     
DELETE /users/:user_id/posts/:post_id/comments/:id     
GET    /users/:user_id/posts                           
POST   /users/:user_id/posts                           
GET    /users/:user_id/posts/new                       
GET    /users/:user_id/posts/:id/edit                  
GET    /users/:user_id/posts/:id                       
PUT    /users/:user_id/posts/:id                       
DELETE /users/:user_id/posts/:id                       
GET    /users                                          
POST   /users                                          
GET    /users/new                                      
GET    /users/:id/edit                                 
GET    /users/:id                                      
PUT    /users/:id                                      
DELETE /users/:id                                      
```

For instance, to refer to a comment you would need a path like
`/users/simon/posts/some-post/comments/123`, when the resource
could have been uniquely identified simply by `/comments/123`. If you
wanted to write a delete link for a comment, you'd need the following,
chock full of unnecessary information:

```erb
<%=
  link_to(
    user_post_comment_path(
      comment.post.creator,
      comment.post,
      comment
    ),
    :method => :delete
  )
%>
```

If we instead constructed our routes to minimise the information
necessary to construct a URL, we might have something like this:

```ruby
resources :users do
  resources :posts, :only => [:index] do
end

resources :posts, :except => [:index] do
  resources :comments, :only => [:create]
end

resources :comments, :only => [:update, :destroy]
```

This *looks* considerably more complex, but we've actually cut down the
number of total URLs, and simplified the existing ones:

```
GET    /users/:user_id/posts   
GET    /users                  
POST   /users                  
GET    /users/new              
GET    /users/:id/edit         
GET    /users/:id              
PUT    /users/:id              
DELETE /users/:id              
POST   /posts/:post_id/comments
POST   /posts                  
GET    /posts/new              
GET    /posts/:id/edit         
GET    /posts/:id              
PUT    /posts/:id              
DELETE /posts/:id              
PUT    /comments/:id           
DELETE /comments/:id           
```

We've made two kinds of simplification. All routes are now top-level,
except where nesting is necessary to indicate that you're creating a
sub-resource (e.g. posting a comment on a specific blog post), or listing
posts created by a specific user.

We've also removed unnecessary comment routes, as comments are typically
created and viewed from a blog post page, so separate creation and index
pages aren't really needed.

## Too many associations

Rails makes it very easy to write associations that closely reflect your
database schema.

## Coupling models to forms

Rails makes it very easy to write forms that closely reflect your
database schema.

Let's say our users can create todo lists, and todo lists have many todo
items

* instance variables in helpers/filters
* too many associations
* too many chained relations

[^1]:
  It's not obvious, but the instance variables you see in the view are
  not quite the same as the ones you set in the controller. At the
  beginning of the render process, the instance variables from the
  controller are copied into the view's render context. However, not
  quite all ivars from the controller are made available to the view. A
  small set of ["protected"
  ivars](https://github.com/rails/rails/blob/4-1-stable/actionpack/lib/action_controller/base.rb#L253-255)
  is defined, and [excluded when the instance variables are copied to
  the
  view](https://github.com/rails/rails/blob/4-1-stable/actionpack/lib/abstract_controller/rendering.rb#L63-74).

[^2]:
  Templates for the `#new` and `#edit` actions are the exception here,
  as they tend to be rendered from the `#create` and `#update` actions
  as well if there are errors saving the resource.

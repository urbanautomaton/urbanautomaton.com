---
kind: article
title: Testing pure-Ruby objects in Rails
created_at: 2015-01-28 12:01
comments: true
reject: true
categories: [Rails, testing, TDD]
---

The longer I work with Rails apps, and more specifically, the longer I
work with *tests* in Rails apps, the more I seek every opportunity to
avoid loading Rails itself.

For me, this mostly means splitting out domain models from
Rails-dependent classes wherever possible, and delegating to them from
Rails objects where appropriate. I test these pure-ruby objects
independently of Rails, injecting doubles of their collaborator objects.

To make this possible, I maintain three levels of helper files for my
tests (this is the same regardless of framework, but I'm going to use
RSpec as an example):

* `spec_helper.rb` - contains only RSpec setup
* `rails_helper.rb` - loads the Rails app, all support files, and
  applies any rails-specific RSpec config
* `acceptance_helper.rb` - loads any tools used for acceptance tests,
  e.g. capybara

Some abbreviated examples:

```ruby
# spec_helper.rb
RSpec.configure do |config|
  config.random
end
```

```ruby
# rails_helper.rb
ENV['RAILS_ENV'] ||= 'test'
require 'spec_helper'

require File.expand_path("../../config/environment", __FILE__)
require 'rspec/rails'

Dir[Rails.root.join("spec/support/**/*.rb")].sort.each do |f|
  require f
end

ActiveRecord::Migration.maintain_test_schema!

RSpec.configure do |config|
  config.fixture_path = Rails.root.join("spec", "fixtures")
  config.use_transactional_fixtures = true
end
```

```ruby
# acceptance_helper.rb
require 'rails_helper'
require 'capybara/poltergeist'

Capybara.register_driver :poltergeist do |app|
  Capybara::Poltergeist::Driver.new(
    app,
    :phantomjs_logger => nil,
    :timeout => 1000,
    :js_errors => false
  )
end

Capybara.javascript_driver = :poltergeist
```

Whenever writing a class or module that doesn't directly depend on Rails
(e.g. it doesn't inherit from `ActiveRecord::Base`, it doesn't use path
helpers, etc. etc.) I will start by including `spec_helper.rb`, only
switching to `rails_helper.rb` if it's absolutely necessary.

```ruby
# app/models/a.rb
class A
  def does_a_thing
    "I did it"
  end
end

# spec/models/a_spec.rb
require 'spec_helper'
require_relative '../../app/models/a'

RSpec.describe A do
  it "does a thing" do
    expect(subject.does_a_thing).to eq "I did it"
  end
end
```

This works fine for individual classes, working on their own with all
their dependencies injected. Sometimes, however, I have a small set of
collaborating classes that need to load each other:

```ruby
# a.rb
class A
  def does_a_thing
    "I did it"
  end
end

# b.rb
require 'a'

class B < A
  def does_a_thing
    super + " my way"
  end
end
```

This works fine, except for one minor wrinkle:

## Autoloading

Rails autoloading has [many ways of wasting our only lives on this
earth](/blog/2013/08/27/rails-autoloading-hell/), and here is another.

Tested in isolation, there is no problem with the above code (you may
have to do some monkeying with the load path in your isolated test).
When booted in the development server, however, there's a tiny problem:
using `Kernel#require` circumvents Rails autoloading.

The first time you refer to `B`, assuming you don't explicitly `require`
it anywhere, `b.rb` will be loaded by `ActiveSupport::Dependencies`. The
`require 'a'` call will be evaluated, directly loading `a.rb` without
the autoloader knowing about it.

This means that even if you edit the file `a.rb`, it will not be
reloaded unless you reboot your development server

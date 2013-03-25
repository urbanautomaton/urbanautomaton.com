require 'pry'
require 'pry-debugger'
include Nanoc::Helpers::Blogging

def published_articles
  sorted_articles.reject{|a| a[:draft]}
end

def blog_route(item)
  item.identifier.gsub(
    /(\d{4})-(\d{2})-(\d{2})-/,
    publish_date(item).strftime("%Y/%m/%d/")
  )
end

def publish_date(item)
  DateTime.parse(item[:publish_at] || item[:created_at])
end

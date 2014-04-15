include Nanoc::Helpers::Blogging

def published_articles
  sorted_articles.reject{|a| a[:draft]}
end

def draft_articles
  sorted_articles.select{|a| a[:draft]}
end

def blog_route(item)
  item.identifier.gsub(/\d{3}-/, publish_date(item))
end

def draft_route(item)
  "/drafts" + item.identifier.gsub(/blog\//, "")
end

def publish_date(item)
  DateTime.parse(item[:publish_at] || item[:created_at]).strftime("%Y/%m/%d/")
end

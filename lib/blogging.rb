include Nanoc::Helpers::Blogging

def published_articles
  sorted_articles.reject { |a| a[:draft] || a[:reject] }
end

def draft_articles
  sorted_articles.select { |a| a[:draft] }
end

def reject_articles
  sorted_articles.select { |a| a[:reject] }
end

def blog_route(item)
  item.identifier.gsub(/\d{3}-/, date_url_segment(item))
end

def draft_route(item)
  "/drafts" + item.identifier.gsub(/blog\//, "")
end

def reject_route(item)
  "/rejects" + item.identifier.gsub(/blog\//, "")
end

def published?(item)
  !(item[:draft] || item[:reject])
end

def has_comments?(item)
  published?(item) && item[:comments]
end

def publish_date(item)
  item[:publish_at] || item[:created_at]
end

def date_url_segment(item)
  publish_date(item).strftime("%Y/%m/%d/")
end

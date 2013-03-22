include Nanoc::Helpers::Blogging

alias :orig_sorted_articles :sorted_articles
def sorted_articles
  orig_sorted_articles.reject{|a| a[:draft] }
end

def blog_route(item)
  item.identifier.gsub(/(\d{4})-(\d{2})-(\d{2})-/, '\1/\2/\3/')
end

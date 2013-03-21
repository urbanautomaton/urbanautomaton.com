include Nanoc::Helpers::Blogging

def blog_route(item)
  item.identifier.gsub(/(\d{4})-(\d{2})-(\d{2})-/, '\1/\2/\3/')
end

require 'redcarpet'
require 'rouge'
require 'rouge/plugins/redcarpet'

class HighlitHTML < Redcarpet::Render::HTML
  include Redcarpet::Render::SmartyPants
  include Rouge::Plugins::Redcarpet
end

class HighlitMarkdownFilter < Nanoc::Filter
  identifier :highlit_markdown
  type :text

  def run(content, options={})
    renderer(options).render(content)
  end

  def renderer(options={})
    Redcarpet::Markdown.new(HighlitHTML, options.merge(:fenced_code_blocks => true))
  end
end

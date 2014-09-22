require 'redcarpet'
require 'rouge'
require 'rouge/plugins/redcarpet'

class HighlitHTML < Redcarpet::Render::HTML
  include Redcarpet::Render::SmartyPants
  include Rouge::Plugins::Redcarpet

  def initialize(extensions={})
    super(extensions.merge(:with_toc_data => true))
  end
end

class HighlitMarkdownFilter < Nanoc::Filter
  identifier :markdown
  type :text

  def run(content, options={})
    renderer(options).render(content)
  end

  def renderer(options={})
    opts = default_options.merge(options)
    Redcarpet::Markdown.new(HighlitHTML, opts)
  end

  def default_options
    {
      :fenced_code_blocks => true,
      :footnotes          => true,
    }
  end
end

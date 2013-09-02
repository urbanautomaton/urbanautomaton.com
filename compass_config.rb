project_path = File.dirname(__FILE__)
http_path    = '/'
output_style = ENV['DEBUG'] ? :expanded : :compressed
sass_dir     = 'content/style'
css_dir      = 'output/style'
sass_options = { :syntax => :scss }

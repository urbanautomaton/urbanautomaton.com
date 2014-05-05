require 'adsf'
require 'rack-livereload'

use Rack::CommonLogger
use Rack::ShowExceptions
use Rack::LiveReload, :host => "127.0.0.1", :no_swf => true, :source => :livereload
use Rack::Lint
use Rack::Head
use Adsf::Rack::IndexFileFinder, :root => 'output'
run Rack::File.new('output')

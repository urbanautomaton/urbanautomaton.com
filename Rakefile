require 'rake/clean'
CLEAN.include("output/**")

require 'open3'

task(:default => [:compile])

task(:compile) do
  output = `nanoc compile 2>&1`
  print output
  raise RuntimeError unless $?.success?
end

task(:deploy => [:compile]) do
  timestamp = Time.now.getutc.strftime("%Y-%m-%d %H:%M:%S UTC")
  output = `cd output && git add -A . && git commit -m "Site updated at #{timestamp}" && git push 2>&1`
  print output
  raise RuntimeError unless $?.success?
end

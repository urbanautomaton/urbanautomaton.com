require 'rake/clean'
require 'time'

CLEAN.include("output/**")

MISSING_TITLE = "You must give a post title (rake new_post TITLE='something')"

task(:default => [:rebuild])

desc("Clean output and recompile")
task(:rebuild => [:clean, :compile])

desc("Start a local server for the site")
task(:view) do
  port = ENV.fetch("PORT", 3001)
  exec("bundle exec rackup config.ru -p #{port}")
end

desc("Start guard to recompile on changes")
task(:watch) do
  exec("bundle exec guard")
end

desc("Recompile output")
task(:compile) do
  output = `nanoc compile 2>&1`
  print output
  raise RuntimeError unless $?.success?
end

desc("Deploy current output directory to GH Pages")
task(:deploy) do
  timestamp = Time.now.getutc.strftime("%Y-%m-%d %H:%M:%S UTC")
  output = `cd output && git add -A . 2>&1 && git commit -m "Site updated at #{timestamp}" 2>&1 && git push 2>&1`
  print output
  raise RuntimeError unless $?.success?
end

desc("Deploy current output directory to S3")
task(:deploy_s3) do
  system('cd output && AWS_PROFILE=ua-scoffey aws s3 sync . s3://www.urbanautomaton.com/ --acl public-read --exclude ".git/*"')
end

desc("New blog post - requires TITLE env variable")
task(:new_post) do
  raise ArgumentError, MISSING_TITLE unless ENV["TITLE"]

  title     = ENV["TITLE"]
  slug_base = title.downcase.gsub(/[^[:alpha:]\d ]/, "").squeeze(" ").gsub(/ /, "-")[0..50]
  previous  = Dir["content/blog/*.markdown"].sort.last
  sequence  = previous.match(%r[content/blog/(\d{3})])[1].to_i + 1
  slug      = ["%03d" % sequence, slug_base].join("-")
  file      = "content/blog/#{slug}.markdown"

  puts "Creating new draft at #{file}"
  File.open(file, "w") do |f|
  f.write <<-EOS
---
kind: article
title: #{title}
created_at: #{Time.now.iso8601}
comments: true
draft: true
categories: []
---
EOS
  end
end

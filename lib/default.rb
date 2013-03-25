# All files in the 'lib' directory will be loaded
# before nanoc starts compiling.

def site_sections(current)
  [
    ['home', '/', ('active' if current.identifier == '/')],
    ['blog', '/blog/', ('active' if current.identifier =~ /^\/blog/)],
    ['twitter', 'https://twitter.com/urbanautomaton', nil],
    ['deadbadger.net', 'http://www.deadbadger.net', nil],
    # ['other', '/other/', nil],
  ]
end

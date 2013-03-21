# All files in the 'lib' directory will be loaded
# before nanoc starts compiling.

def site_sections(current)
  [
    ['urbanautomaton.com', '/', ('active' if current.identifier == '/')],
    ['blog', '/blog/', ('active' if current.identifier =~ /^\/blog/)],
    ['other', '/other/', nil],
  ]
end

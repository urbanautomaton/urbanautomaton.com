# All files in the 'lib' directory will be loaded
# before nanoc starts compiling.

def site_sections(current)
  [
    ['home',   '/',        ('active' if current.identifier == '/')],
    ['blog',   '/blog/',   ('active' if current.identifier =~ /^\/blog/)],
    ['about',  '/about/',  ('active' if current.identifier =~ /^\/about/)],
  ]
end

def external_links
  [
    ['code',      'https://github.com/urbanautomaton'],
    ['tweets',    'https://twitter.com/urbanautomaton'],
    ['nonsense',  'http://www.deadbadger.net'],
  ]
end

#!/usr/bin/env python3
"""Builds the per-page files from index.html.

index.html is the source of truth. Each page (Buy, Events, Become a Member) also needs its own
file so its address (e.g. drinknicecubes.com/events/) works when pasted into Instagram, WhatsApp
or search, and so each page gets its own title and social preview.

Run after ANY edit to index.html:   python3 build_pages.py
"""
import html
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SITE = 'https://drinknicecubes.com'

# The one place to change the founding membership intake. index.html carries this number inside
# <span class="member-cap">...</span>, and the line below keeps it in sync on every build, however
# many times you run it, so the number in index.html is only ever a display value, never the
# source of truth.
MEMBER_CAP = 100

# The scrolling announcement bar. One copy is the real, readable message; the rest are identical
# but marked aria-hidden, repeated enough times that the strip never shows a gap of bare
# background, even on a very wide monitor. Regenerated fresh on every build, so index.html's copy
# between the markers is only ever a display value, same as MEMBER_CAP above.
ANNOUNCE_REPEATS = 12

PAGES = {
    'home': dict(
        path='/', folder=None,
        title='Nice Cubes | Ice is an ingredient.',
        description='Nice Cubes treats ice as an ingredient, not an afterthought. Four flavours are launching together. Join the waitlist for early access and a launch discount.',
        image='/images/og-home.jpg',
    ),
    'buy': dict(
        path='/buy/', folder='buy',
        title='Buy Nice Cubes | Coming soon',
        description="Your cubes are still freezing. Nice Cubes isn't for sale just yet, but join the waitlist and we'll email you the moment Chilli Lime is ready to order.",
        image='/images/og-home.jpg',
    ),
    'events': dict(
        path='/events/', folder='events',
        title='A Nice Cubes Supper | 3rd October, East London',
        description='An evening of amazing food, quality drinks and fabulous ice. Food by Oliver Wilson. Saturday 3rd October 2026, 6:30pm to 11pm, Palm 2, East London.',
        image='/images/og-events.jpg',
    ),
    'apply': dict(
        path='/become-a-member/', folder='become-a-member',
        title='Become a member | Nice Cubes',
        description='Nice Cubes membership is reviewed and limited. Member only suppers, new flavours before anyone else, and a vote on what we freeze next.',
        image='/images/og-home.jpg',
    ),
    'privacy': dict(
        path='/privacy/', folder='privacy',
        title='Privacy policy | Nice Cubes',
        description='What personal information Nice Cubes collects, why, and your rights.',
        image='/images/og-home.jpg',
    ),
}


def meta_block(p):
    e = lambda s: html.escape(s, quote=True)
    url = SITE + p['path']
    return (
        '<!-- meta:start -->\n'
        f'<title>{e(p["title"])}</title>\n'
        f'<meta name="description" content="{e(p["description"])}">\n'
        f'<link rel="canonical" href="{url}">\n'
        '<meta property="og:type" content="website">\n'
        '<meta property="og:site_name" content="Nice Cubes">\n'
        f'<meta property="og:title" content="{e(p["title"])}">\n'
        f'<meta property="og:description" content="{e(p["description"])}">\n'
        f'<meta property="og:url" content="{url}">\n'
        f'<meta property="og:image" content="{SITE}{p["image"]}">\n'
        '<meta property="og:image:width" content="1200">\n'
        '<meta property="og:image:height" content="630">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
        '<!-- meta:end -->'
    )


def announce_block():
    item = (
        f'Become a member <span class="announce__dot">&middot;</span> '
        f'Only <span class="member-cap">{MEMBER_CAP}</span> founding spots '
        f'<span class="announce__dot">&middot;</span> Apply now <span class="announce__dot">&middot;</span>'
    )
    copies = [f'<span class="announce__item">{item}</span>']
    copies += [f'<span class="announce__item" aria-hidden="true">{item}</span>'] * (ANNOUNCE_REPEATS - 1)
    return '<!-- announce:start -->\n' + '\n'.join(copies) + '\n<!-- announce:end -->'


META_RE = re.compile(r'<!-- meta:start -->.*?<!-- meta:end -->', re.S)
CAP_RE = re.compile(r'(<span class="member-cap">)\d+(</span>)')
ANNOUNCE_RE = re.compile(r'<!-- announce:start -->.*?<!-- announce:end -->', re.S)

source = (ROOT / 'index.html').read_text(encoding='utf-8')
assert META_RE.search(source), 'index.html is missing its meta:start / meta:end markers'
assert CAP_RE.search(source), 'index.html is missing its <span class="member-cap">...</span>'
assert ANNOUNCE_RE.search(source), 'index.html is missing its announce:start / announce:end markers'

# 1. index.html keeps the home meta, and always shows the current MEMBER_CAP and announcement bar
home = META_RE.sub(lambda m: meta_block(PAGES['home']), source, count=1)
home = ANNOUNCE_RE.sub(lambda m: announce_block(), home, count=1)
home = CAP_RE.sub(rf'\g<1>{MEMBER_CAP}\g<2>', home)
(ROOT / 'index.html').write_text(home, encoding='utf-8')

# 2. one folder per page: same site, that page's own meta, and that page shown first
for key in ('buy', 'events', 'apply', 'privacy'):
    p = PAGES[key]
    page = META_RE.sub(lambda m: meta_block(p), home, count=1)
    page, n = re.subn(r'<div id="page-home">', '<div id="page-home" hidden>', page, count=1)
    assert n == 1
    page, n = re.subn(r'(<section[^>]*id="page-%s"[^>]*?) hidden>' % key, r'\1>', page, count=1)
    assert n == 1, f'could not un-hide page-{key}'
    out = ROOT / p['folder']
    out.mkdir(exist_ok=True)
    (out / 'index.html').write_text(page, encoding='utf-8')

# 3. sitemap for search engines
urls = ''.join(f'  <url><loc>{SITE}{p["path"]}</loc></url>\n' for p in PAGES.values())
(ROOT / 'sitemap.xml').write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n',
    encoding='utf-8')
(ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')

print('built:', ', '.join(['index.html'] + [PAGES[k]['folder'] + '/index.html' for k in ('buy', 'events', 'apply', 'privacy')]))

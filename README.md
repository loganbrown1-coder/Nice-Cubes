# Nice Cubes website

Live at https://drinknicecubes.com (GitHub Pages, deployed from `main`).

## Editing the site

`index.html` is the source of truth for every page. The Buy, Events and Become a Member pages each
also live in their own folder (`buy/`, `events/`, `become-a-member/`) so their addresses work when
pasted into Instagram, WhatsApp or search.

After ANY change to `index.html`, run:

    python3 build_pages.py

That regenerates the three folders, the page titles and social previews, and `sitemap.xml`. Do not edit
the files inside those folders by hand: they are overwritten.

## Other files

- `style.css`, `script.js`: styles and behaviour (menu routing, forms, easter eggs).
- `404.html`: the "This page has melted" page.
- `images/`: photos, illustrations, favicon and social preview images.
- `CNAME`: tells GitHub Pages to serve the site on drinknicecubes.com.

## Klaviyo

All three forms (waitlist, footer, Become a Member) post to one Klaviyo list. The public API key and list
ID are at the top of the forms section in `script.js`.

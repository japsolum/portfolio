# Portfolio

Personal portfolio for James Solum. Static, dependency-free, and self-contained: semantic HTML5, custom CSS, and vanilla JavaScript. No build step, no npm install, no framework.

**Every project listed on the site also runs on the site**, from `apps/`. Nothing redirects to GitHub Pages or any other host to be playable.

## Structure

```
index.html            portfolio landing page
css/styles.css
js/script.js
images/
robots.txt  sitemap.xml

apps/
  _shared/            "back to portfolio" bar shared by every app
  memory-game/
  cat-clicker/
  arcade-game/
  neighborhood-map/
  resume/
```

## Local preview

These pages use relative paths, so a plain file open works for most of them — but the safest preview is a local server:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying to GitHub Pages

1. Push to the `master` branch of `japsolum/portfolio`.
2. **Settings → Pages → Source: Deploy from a branch → `master` / `(root)` → Save.**
3. Publishes at `https://japsolum.github.io/portfolio/`.

Only this one repo needs Pages enabled — the apps ship inside it.

## What changed from the original

The original site linked each project to a local Windows path (`C:/Users/JapSo/...`), so nothing worked once deployed. Beyond fixing that, each app had bit-rotted and was repaired:

| App | Problem | Fix |
|---|---|---|
| Arcade Game | `engine.js` mounted the canvas with jQuery, loaded via `google.load()` — an API that no longer exists. The game never rendered at all. | Vanilla `appendChild`; added on-screen D-pad so it works on touch |
| Neighborhood Map | Google Maps key dead; Foursquare v2 API discontinued; Google Charts marker API retired | Rewrote with a small Web Mercator map engine — OpenStreetMap tiles, with a coordinate-grid fallback if tiles can't load. No API keys |
| Cat Clicker | Knockout + jQuery + Bootstrap from CDNs; image folder was `Images/` but code requested `images/`, which 404s on case-sensitive servers | Rewrote in vanilla JS with local CSS; folder name normalised |
| Memory Game | jQuery from CDN | Rewrote in vanilla JS; proper Fisher-Yates shuffle; timer starts on first move; win state is an in-page panel rather than `window.confirm` |
| Resume | Profile photo was an expired Facebook CDN signed URL; two CSS backgrounds pointed at a YouTube thumbnail and a Google image-*search* URL; inline script threw on every click | Rebuilt with local styling, a working Print / Save-as-PDF button, and print stylesheet |

## Updating projects

Project cards live in `<section id="projects">` in `index.html`. Each has a thumbnail, description, tags, a **Run app** link into `apps/`, and a **Source** link to GitHub.

To add a project: drop it in `apps/<name>/`, include `../_shared/backbar.css` and `../_shared/backbar.js` in its `<head>`/`<body>`, and copy an existing card in `index.html`.

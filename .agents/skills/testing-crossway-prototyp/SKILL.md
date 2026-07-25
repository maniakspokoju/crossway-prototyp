---
name: testing-crossway-prototyp
description: How to run and test the crossway-prototyp static web app (Crossway Multi-user) locally — serving index.html, comparing against a pre-change baseline, and known pre-existing breakage.
---

# Testing crossway-prototyp

## What the app is

A single static page, `index.html`, containing all markup plus one large inline `<script>`.
It uses Leaflet (CDN), the Firebase compat SDK + Firebase Realtime Database
(`crossway-prototyp-default-rtdb`, config is hard-coded in the page), OSRM routing, and OSM tiles.

## How to run it (do NOT use `server.js`)

`server.js` is **not** an HTTP server for the page — it is a `ws` WebSocket server on port 8080, and
`index.html` never opens a WebSocket. `package.json` has no `start` script. Serve the page statically:

```bash
cd <repo> && python3 -m http.server 8000 --bind 127.0.0.1 &
# open http://127.0.0.1:8000/
```

No credentials, secrets, or logins are required. The page needs outbound network to
`unpkg.com`, `www.gstatic.com`, `*.firebasedatabase.app`, `router.project-osrm.org`, and
`tile.openstreetmap.org` — check these with `curl` before blaming the app for a blank map.

## Baseline-comparison technique (useful for any "text/version changed" PR)

Serve the pre-change file on a second port and compare side by side in two browser tabs. This proves the
test would fail if the change were broken, and cleanly separates PR-caused breakage from pre-existing:

```bash
mkdir -p /tmp/prev_version && git show HEAD~1:index.html > /tmp/prev_version/index.html
(cd /tmp/prev_version && python3 -m http.server 8001 --bind 127.0.0.1 &)
```

## Known pre-existing breakage (check before reporting it as a regression)

As of commit `46992ce`, the inline script has a stray `});` at `index.html:494` (closing the
`for (let uid in usersMarkers)` loop in `findMatchingDrivers()`). Chrome reports
`Uncaught SyntaxError: Unexpected token ')' (at (index):494:2)` and the **entire inline script is
skipped**, so:

- the Leaflet map area stays blank (no tiles),
- `Reset` shows no `confirm()` dialog,
- `Driver` / `Passenger` buttons do nothing (background doesn't change, no panels appear).

This might still be present — verify quickly before browser work:

```bash
sed -n '103,729p' index.html | sed 's|</script>||' > /tmp/app.js && node --check /tmp/app.js
```

If it fails, no interactive flow of the app can be exercised; scope testing to rendered markup and
compare behaviour against the baseline port to show the PR did not cause it. A possible workaround if a
functional flow must be tested: make a **temporary, uncommitted** local copy of `index.html` with
`});` → `}` at line 494 and serve that copy on a third port — label any such results clearly as
"patched build, not the PR build".

Also expect a stray `/* 6.1.3 pasażer widzi ...` comment rendered as visible text above the header
(it sits before `<!DOCTYPE html>` at `index.html:1`) — pre-existing, not a bug of any given PR.

## Useful checks

- Header/version string: `grep -n "Crossway –" index.html` (currently line 62).
- Whether the script actually ran, without eyeballing: in the browser console,
  `!!document.getElementById('resetBtn').onclick` → `true` means handlers bound, `false` means the
  script died. Beware `typeof window.map === "object"` is misleading — that is the `<div id="map">`
  element exposed as a named global, not the Leaflet map.
- Favicon 404s from `python3 -m http.server` are test-harness noise, not app errors.

## Devin Secrets Needed

None.

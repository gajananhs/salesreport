#!/usr/bin/env python3
"""Build the self-contained server overlay (index.php with the theme and PWA
shell embedded) from the ORIGINAL Sales Reporter index.php.

Usage: python3 scripts/build-server-overlay.py <original or overlay index.php> <out dir>
Fonts and icons are loaded from the GitHub Pages copy of this repo.
"""
import sys, json, pathlib
GH = 'https://gajananhs.github.io/salesreport/'
root = pathlib.Path(__file__).resolve().parent.parent / 'public'
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
s = src.read_text()
fonts = (root / 'assets/css/fonts.css').read_text().replace('url(../fonts/', 'url(' + GH + 'assets/fonts/')
theme = (root / 'assets/css/theme.css').read_text()
pwa = (root / 'assets/js/pwa.js').read_text()
s = s.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
              '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">')
s = s.replace('<meta name="theme-color" content="#0a7ea4">', '''<meta name="theme-color" content="#0F2D5C">
  <link rel="manifest" href="manifest.json">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Sales Reporter">
  <link rel="apple-touch-icon" href="''' + GH + '''assets/icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="''' + GH + '''assets/icons/favicon-32.png">''')
lines = s.split('\n')
# Refresh mode: <original index.php> may also be a previously built overlay
# index.php — its embedded theme/PWA blocks are removed and re-embedded.
def strip_block(lines, start_marker, end_line):
    if not any(start_marker in l for l in lines): return lines
    a = next(k for k, l in enumerate(lines) if start_marker in l)
    b = next(k for k in range(a, len(lines)) if lines[k] == end_line)
    return lines[:a] + lines[b + 1:]
lines = strip_block(lines, '<!-- Meridian-style theme (embedded', '  </style>')
lines = strip_block(lines, '<!-- PWA shell: phone frame', '  </script>')
i = [k for k, l in enumerate(lines) if '<link rel="stylesheet" href="assets/css/style.css' in l]; assert len(i) == 1
lines.insert(i[0] + 1, '  <!-- Meridian-style theme (embedded: no extra files needed) -->\n  <style>\n' + fonts + '\n' + theme + '\n  </style>')
j = [k for k, l in enumerate(lines) if '<script src="assets/js/app.js' in l]; assert len(j) == 1
lines.insert(j[0] + 1, '  <!-- PWA shell: phone frame, 5-tab bar, banners, install, service worker (embedded) -->\n  <script>\n' + pwa + '\n  </script>')
out.mkdir(parents=True, exist_ok=True)
(out / 'index.php').write_text('\n'.join(lines))
man = {"id": "./", "name": "Sales Reporter", "short_name": "Sales Reporter", "description": "Log visits, expenses, advances, tasks and plans.",
       "start_url": "./", "scope": "./", "display": "standalone", "launch_handler": {"client_mode": ["navigate-existing", "auto"]}, "orientation": "any", "background_color": "#E6EBF3", "theme_color": "#0F2D5C",
       "categories": ["business", "productivity"],
       "icons": [{"src": GH + "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                 {"src": GH + "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                 {"src": GH + "assets/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(out / 'manifest.json').write_text(json.dumps(man, indent=2))
print('overlay written to', out)

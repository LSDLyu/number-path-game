# edu.alading.org learning games release

Source: `workers/lisa-games-router.js`. Do not replace the current `edu-alading-org` Custom Domain Worker or publish the old local `zide-learning` checkout. The current home site has newer pages and content.

Published on 2026-09-28:

1. Backed up the deployed `lisa-games-router` script, settings, and routes, and the `edu-alading-org` script/settings and original deployment version.
2. Published the redesigned `/games/` directory through the two existing games routes. Both games, `/apply`, and a guide were checked live.
3. Added a narrow, noncacheable redirect for a click from the root homepage's legacy `/games/number-path` link to `/games/`. Direct game visits and the new directory card at `/games/number-path/` continue to start the game.
4. The main site's actual HTML navigation still says `数学游戏` and links to `/games/number-path`. A root-only Worker route was tried and removed because it did not intercept the homepage. A temporary main Worker content-only patch did not affect the served static page and was rolled back to its original deployment version. Do not claim the HTML link is fixed.

Remaining: obtain the current main site's source/build for a normal targeted header update, or seek explicit approval for a site-wide route that passes other pages through to the Custom Domain Worker. An attempted `edu.alading.org/*` route was rejected by automatic approval review because it affects unrelated pages. Do not use it without a new approval review. Verify the homepage's literal link after any follow-up deployment.

The GitHub Pages build contains the games and directory at `https://lsdlyu.github.io/number-path-game/`. Its preview directory is `https://lsdlyu.github.io/number-path-game/games/`.

## English release, 2026-09-29

- `/en/games/` is live in the same site layout. Its cards and language switch were checked in the browser. The legacy English homepage navigation still literally says `Number Path` and links to `/en/games/number-path`; a narrow, noncacheable redirect makes that homepage click reach the directory. Direct game visits remain available.
- `/en/games/number-path/` defaults to the English game interface, and its Games link returns to `/en/games/`.
- `/en/games/lisa-letter-adventure/` now loads the English game. The Chinese page is preserved. `tests/lisa/build-english.py` generates the English page and audio credits from the Chinese source. The ten-level game regression passed on the English build, and the live start screen, menu, and Games link were checked after GitHub Pages deployment.
- A source change for the exact `/en` homepage route is prepared in `workers/lisa-games-router.js`, with exact `/en` and `/en/` routes in the temporary deployment config. **This change is not deployed.** The Cloudflare deployment was blocked before execution by automatic approval review's usage limit. Do not claim the literal English homepage header is updated. Retry only through the normal approval path when available, then verify the literal nav label and href; if the route does not intercept the Custom Domain Worker, remove it and edit the current main site's source instead.

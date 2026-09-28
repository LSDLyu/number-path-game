# edu.alading.org learning games release

Source: `workers/lisa-games-router.js`. Do not replace the current `edu-alading-org` Custom Domain Worker or publish the old local `zide-learning` checkout. The current home site has newer pages and content.

After authorized Cloudflare access is restored:

1. Back up the active games route Worker and its route settings. Confirm the existing games route pattern and zone.
2. Deploy the reviewed `workers/lisa-games-router.js` code to the existing games route Worker. Keep its current `edu.alading.org/games*` route and add the **exact** root route `edu.alading.org` to that same Worker. Cloudflare documents that a route without a path wildcard matches only the root, while the Custom Domain Worker remains available to a route via `fetch(request)`.
3. Verify `/` contains `href="/games/">学习游戏</a>`; `/games/` renders the Zide header and both game links; `/games/number-path` shows the upgraded hint and tutorial; `/games/lisa-letter-adventure/` starts normally. Also verify `/apply` and a handbook page still respond normally.
4. If any route fails, restore the backed-up Worker and route settings. Keep the GitHub Pages release available while investigating.

The GitHub Pages build already contains the games and directory at `https://lsdlyu.github.io/number-path-game/`. Its preview directory is `https://lsdlyu.github.io/number-path-game/games/`. The official routes do not update until the Cloudflare Worker is deployed.

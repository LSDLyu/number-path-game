const LISA_PATH = "/games/lisa-letter-adventure";
const LISA_ORIGIN = "https://lsdlyu.github.io";
const LISA_ORIGIN_PREFIX = "/number-path-game/games/lisa-letter-adventure";
const NUMBER_PATH = "/games/number-path";
const EN_GAMES = "/en/games";
const EN_NUMBER_PATH = "/en/games/number-path";
const EN_LISA_PATH = "/en/games/lisa-letter-adventure";

// If a route intercepts the homepage, fetch the Custom Domain Worker first
// and change only the learning-games navigation link in its HTML response.
async function homepage(request) {
  const upstream = await fetch(request);
  if (request.method !== "GET" || upstream.status !== 200 ||
      !(upstream.headers.get("content-type") || "").includes("text/html")) return upstream;
  const original = await upstream.text();
  if (!original.includes('/games/number-path')) return new Response(original, upstream);
  const headers = new Headers(upstream.headers);
  headers.delete("content-length"); headers.delete("content-encoding"); headers.delete("etag");
  return new Response(original.replaceAll('/games/number-path', '/games/').replaceAll('数学游戏', '学习游戏'), {
    status: upstream.status, statusText: upstream.statusText, headers,
  });
}

async function englishHomepage(request) {
  const upstream = await fetch(request);
  if (request.method !== "GET" || upstream.status !== 200 ||
      !(upstream.headers.get("content-type") || "").includes("text/html")) return upstream;
  const original = await upstream.text();
  if (!original.includes('href="/en/games/number-path"')) return new Response(original, upstream);
  const headers = new Headers(upstream.headers);
  headers.delete("content-length"); headers.delete("content-encoding"); headers.delete("etag");
  return new Response(original.replaceAll(
    '<a href="/en/games/number-path">Number Path</a>',
    '<a href="/en/games/">Learning games</a>'
  ), { status: upstream.status, statusText: upstream.statusText, headers });
}

async function proxyNumberPath(request, url, path = NUMBER_PATH) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const suffix = url.pathname.slice(path.length) || "/";
  const upstreamUrl = new URL("https://lsdlyu.github.io/number-path-game" + suffix);
  upstreamUrl.search = url.search;
  const upstream = await fetch(upstreamUrl, { method: request.method, redirect: "manual" });
  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie");
  headers.set("X-Learning-Game-Source", "github-pages");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  let body = upstream.body;
  if (request.method === "GET" && (headers.get("content-type") || "").includes("text/html")) {
    body = (await upstream.text()).replaceAll('"/number-path-game/', `"${path}/`);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
  }
  return new Response(body, { status: upstream.status, headers });
}

function redirect(location) {
  return new Response(null, {
    status: 308,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=300",
    },
  });
}

function gamesDirectory(locale = "zh") {
  let html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f7f1e6">
  <title>学习游戏｜自得学园</title>
  <meta name="description" content="数学路径怪探与 Lisa 的字母冒险：在游戏中练习推理、认识英语单词。">
  <style>
    :root { color-scheme:light; --paper:#f7f1e6; --ink:#24312f; --muted:#505b57; --teal:#17685f; --orange:#a94f25; --yellow:#f1d77a; --line:#24312f3d; --serif:"Songti SC","Noto Serif SC","STSong",Georgia,serif; --sans:"Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",Arial,sans-serif; font-family:var(--sans); color:var(--ink); background:var(--paper); }
    *,*::before,*::after { box-sizing:border-box; }
    body { margin:0; min-height:100vh; }
    a { color:inherit; }
    a:focus-visible { outline:3px solid var(--orange); outline-offset:4px; }
    .skip { position:absolute; left:16px; top:12px; transform:translateY(-180%); padding:10px 16px; background:var(--yellow); z-index:10; }
    .skip:focus { transform:none; }
    .shell { width:min(1240px,calc(100% - 64px)); margin-inline:auto; }
    .header { position:sticky; top:0; z-index:5; background:#f7f1e6f7; border-bottom:1px solid var(--line); backdrop-filter:blur(14px); }
    .header-inner { min-height:78px; display:grid; grid-template-columns:minmax(220px,1fr) auto minmax(220px,1fr); align-items:center; gap:24px; }
    .brand { display:inline-flex; align-items:center; gap:12px; width:max-content; text-decoration:none; }
    .brand-mark { display:grid; place-items:center; width:42px; height:42px; background:var(--yellow); border:2px solid var(--ink); border-radius:47% 53% 50% 50%; font:23px var(--serif); transform:rotate(-4deg); }
    .brand strong { display:block; font:700 21px/1.05 var(--serif); letter-spacing:.08em; }
    .brand small { display:block; margin-top:3px; font-size:9px; font-weight:800; letter-spacing:.14em; }
    .nav { display:flex; align-items:center; gap:26px; white-space:nowrap; }
    .nav a,.actions a { font-size:14px; font-weight:800; text-decoration:none; }
    .nav a[aria-current] { color:var(--teal); text-decoration:underline; text-decoration-thickness:2px; text-underline-offset:8px; }
    .actions { justify-self:end; display:flex; align-items:center; gap:20px; white-space:nowrap; }
    .button { display:inline-flex; align-items:center; justify-content:center; min-height:48px; padding:10px 22px; background:var(--teal); border:2px solid var(--ink); border-radius:2px; color:#fff; text-decoration:none; font-size:15px; font-weight:800; box-shadow:5px 5px 0 var(--ink); transition:transform .15s,box-shadow .15s; }
    .button:hover { transform:translate(2px,2px); box-shadow:3px 3px 0 var(--ink); }
    .button-small { min-height:40px; padding:8px 15px; font-size:13px !important; }
    main { padding:58px 0 100px; }
    .crumb { display:inline-block; color:var(--teal); font-size:14px; font-weight:800; text-decoration-thickness:1px; text-underline-offset:4px; }
    .eyebrow { margin:44px 0 16px; color:var(--teal); font-size:13px; font-weight:850; letter-spacing:.13em; }
    h1 { margin:0; font:700 clamp(43px,6vw,76px)/1.13 var(--serif); letter-spacing:-.03em; }
    .intro { max-width:680px; margin:20px 0 48px; color:var(--muted); font-size:18px; line-height:1.8; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; }
    .card { min-width:0; display:flex; flex-direction:column; background:#fffdf8; border:2px solid var(--ink); box-shadow:7px 7px 0 var(--ink); text-decoration:none; transition:transform .15s,box-shadow .15s; }
    .card:hover,.card:focus-visible { transform:translate(2px,2px); box-shadow:5px 5px 0 var(--ink); }
    .card-top { display:flex; align-items:center; justify-content:space-between; min-height:100px; padding:22px 30px; border-bottom:1px solid var(--line); }
    .number .card-top { background:#f1d77a; }
    .letter .card-top { background:#c9e1d9; }
    .card-top span:first-child { font:700 42px/1 var(--serif); }
    .card-top span:last-child { font-size:13px; font-weight:800; letter-spacing:.08em; }
    .card-body { display:flex; flex:1; flex-direction:column; align-items:flex-start; padding:30px; }
    .tag { margin:0 0 14px; color:var(--teal); font-size:13px; font-weight:850; letter-spacing:.08em; }
    h2 { margin:0 0 18px; font:700 clamp(26px,3vw,35px)/1.25 var(--serif); }
    .desc { max-width:48ch; min-height:80px; margin:0 0 28px; color:var(--muted); font-size:16px; line-height:1.8; }
    .play { margin-top:auto; }
    .note { margin:28px 0 0; max-width:760px; color:var(--muted); font-size:14px; line-height:1.8; }
    .footer { background:var(--ink); color:#fff; padding:44px 0; }
    .footer-inner { display:flex; align-items:flex-end; justify-content:space-between; gap:30px; }
    .footer strong { font:700 24px var(--serif); }
    .footer p { color:#d7dedb; margin:8px 0 0; }
    .footer small { color:#d7dedb; font-size:12px; }
    .footer-links { display:flex; gap:24px; font-weight:800; }
    @media(max-width:950px) { .header-inner { display:flex; justify-content:space-between; } .nav { display:none; } .actions { gap:12px; } }
    @media(max-width:700px) { .shell { width:calc(100% - 32px); } .header-inner { min-height:66px; } .brand strong { font-size:18px; } .brand small { font-size:8px; } .brand-mark { width:36px; height:36px; font-size:20px; } .actions .language { display:none; } main { padding:30px 0 68px; } .eyebrow { margin-top:38px; } .intro { margin-bottom:32px; font-size:16px; } .grid { grid-template-columns:1fr; gap:20px; } .card-top { min-height:78px; padding:16px 22px; } .card-body { padding:24px; } .desc { min-height:0; } .footer-inner { display:block; } .footer-links { margin-top:24px; } }
    @media(prefers-reduced-motion:reduce) { .button,.card { transition:none; } }
  </style>
</head>
<body>
  <a class="skip" href="#main">跳到主要内容</a>
  <header class="header"><div class="shell header-inner">
    <a class="brand" href="/" aria-label="自得学园首页"><span class="brand-mark" aria-hidden="true">学</span><span><strong>自得学园</strong><small>ZIDE LEARNING</small></span></a>
    <nav class="nav" aria-label="主要导航"><a href="/#method">方法</a><a href="/#guides">六册手册</a><a href="/games/" aria-current="page">学习游戏</a><a href="/#review">如何审核</a><a href="/#faq">常见问题</a></nav>
    <div class="actions"><a class="language" href="/en/games/" lang="en">English</a><a class="button button-small" href="/apply">申请试读</a></div>
  </div></header>
  <main class="shell" id="main">
    <a class="crumb" href="/">← 返回首页</a>
    <p class="eyebrow">边玩边探索 · 数学与英语</p>
    <h1>学习游戏</h1>
    <p class="intro">选一个游戏开始。想一想数字路线，或者和 Lisa 一起认识字母与单词；完成的进度会保存在当前浏览器。</p>
    <section class="grid" aria-label="游戏列表">
      <a class="card number" href="/games/number-path/"><div class="card-top"><span aria-hidden="true">01</span><span>数学 · 路线推理</span></div><div class="card-body"><p class="tag">3×3 到 6×6 · 顺序解锁</p><h2>数学路径怪探</h2><p class="desc">按顺序连接数字，铺满每一个格子。先想方法，再逐步看线索。</p><span class="button play">开始闯关 →</span></div></a>
      <a class="card letter" href="/games/lisa-letter-adventure/"><div class="card-top"><span aria-hidden="true">02</span><span>英语 · 字母与单词</span></div><div class="card-body"><p class="tag">十个绘本关卡 · 建议横屏</p><h2>Lisa的字母冒险</h2><p class="desc">跳跃、听词、认图，在不同的关卡里收集字母。可以随时暂停，下次继续。</p><span class="button play">进入冒险 →</span></div></a>
    </section>
    <p class="note">游戏进度和学习记录仅保存在当前浏览器。清除浏览器数据后，记录也会清除。</p>
  </main>
  <footer class="footer"><div class="shell footer-inner"><div><strong>自得学园</strong><p>自驱成长，自得其乐</p><small>ChatGPT 协力 · 人工复核</small></div><div class="footer-links"><a href="/apply">申请试读</a><a href="https://alading.org/">返回 alading.org</a></div></div></footer>
</body>
</html>`;

  if (locale === "en") {
    const translations = [
      ['lang="zh-CN"', 'lang="en"'],
      ['跳到主要内容', 'Skip to main content'],
      ['主要导航', 'Main navigation'],
      ['学习游戏｜自得学园', 'Learning Games | Zide Learning'],
      ['数学路径怪探与 Lisa 的字母冒险：在游戏中练习推理、认识英语单词。', 'Number Path Detectives and Lisa’s Letter Adventure: explore maths, letters, and words through play.'],
      ['href="/" aria-label="自得学园首页"', 'href="/en" aria-label="Zide Learning home"'],
      ['href="/">← 返回首页', 'href="/en">← Back home'],
      ['href="/#method"', 'href="/en#method"'],
      ['href="/#guides"', 'href="/en#guides"'],
      ['href="/#review"', 'href="/en#review"'],
      ['href="/#faq"', 'href="/en#faq"'],
      ['href="/games/" aria-current="page"', 'href="/en/games/" aria-current="page"'],
      ['href="/games/number-path/"', 'href="/en/games/number-path/"'],
      ['href="/games/lisa-letter-adventure/"', 'href="/en/games/lisa-letter-adventure/"'],
      ['href="/en/games/" lang="en">English', 'href="/games/" lang="zh-CN">中文'],
      ['href="/apply"', 'href="/en/apply"'],
      ['自得学园', 'Zide Learning'],
      ['方法</a>', 'Method</a>'],
      ['六册手册</a>', 'Six guides</a>'],
      ['学习游戏', 'Learning games'],
      ['如何审核</a>', 'How we review</a>'],
      ['常见问题</a>', 'FAQ</a>'],
      ['申请试读', 'Request a sample'],
      ['边玩边探索 · 数学与英语', 'Explore through play · maths and English'],
      ['选一个游戏开始。想一想数字路线，或者和 Lisa 一起认识字母与单词；完成的进度会保存在当前浏览器。', 'Choose a game to begin. Solve a number path or join Lisa to discover letters and words. Your progress stays in this browser.'],
      ['游戏列表', 'Game list'],
      ['数学 · 路线推理', 'Maths · route reasoning'],
      ['3×3 到 6×6 · 顺序解锁', '3×3 to 6×6 · unlock in order'],
      ['数学路径怪探', 'Number Path Detectives'],
      ['按顺序连接数字，铺满每一个格子。先想方法，再逐步看线索。', 'Connect the numbers in order and fill every square. Plan your route, then reveal clues when you need them.'],
      ['开始闯关 →', 'Play Number Path →'],
      ['英语 · 字母与单词', 'English · letters and words'],
      ['十个绘本关卡 · 建议横屏', '10 illustrated levels · landscape recommended'],
      ['Lisa的字母冒险', 'Lisa’s Letter Adventure'],
      ['跳跃、听词、认图，在不同的关卡里收集字母。可以随时暂停，下次继续。', 'Jump, listen to words, and match pictures as you collect letters. Pause anytime and pick up where you left off.'],
      ['进入冒险 →', 'Join Lisa →'],
      ['游戏进度和学习记录仅保存在当前浏览器。清除浏览器数据后，记录也会清除。', 'Game progress stays in this browser. Clearing browser data also removes your saved progress.'],
      ['自驱成长，自得其乐', 'Self-driven growth, joyfully discovered'],
      ['ChatGPT 协力 · 人工复核', 'ChatGPT collaboration · human review'],
      ['返回 alading.org', 'Back to alading.org'],
    ];
    for (const [source, target] of translations) html = html.replaceAll(source, target);
  }

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Language": locale === "en" ? "en" : "zh-CN",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

async function proxyLisa(request, url, path = LISA_PATH) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const suffix = url.pathname.slice(path.length) || "/";
  const upstreamUrl = new URL(LISA_ORIGIN);
  upstreamUrl.pathname = `${LISA_ORIGIN_PREFIX}${suffix}`;
  upstreamUrl.search = url.search;

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("cookie");
  upstreamHeaders.delete("accept-encoding");

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: upstreamHeaders,
    redirect: "manual",
  });

  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Lisa-Game-Source", "github-pages");

  const location = headers.get("location");
  if (location && location.startsWith(`${LISA_ORIGIN}${LISA_ORIGIN_PREFIX}`)) {
    headers.set("location", location.replace(`${LISA_ORIGIN}${LISA_ORIGIN_PREFIX}`, path));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/") return homepage(request);
    if (url.pathname === "/en" || url.pathname === "/en/") return englishHomepage(request);

    if (url.pathname === EN_GAMES) return redirect(`${EN_GAMES}/`);
    if (url.pathname === `${EN_GAMES}/`) return gamesDirectory("en");
    if (url.pathname === EN_LISA_PATH) return redirect(`${EN_LISA_PATH}/`);
    if (url.pathname.startsWith(`${EN_LISA_PATH}/`)) return proxyLisa(request, url, EN_LISA_PATH);
    if (request.method === "GET" && url.pathname === EN_NUMBER_PATH) {
      const referrer = request.headers.get("referer");
      if (referrer) {
        try {
          const source = new URL(referrer);
          if (source.origin === url.origin && source.pathname.startsWith("/en") && !source.pathname.startsWith(`${EN_GAMES}/`)) {
            return new Response(null, { status: 302, headers: { Location: `${EN_GAMES}/`, "Cache-Control": "private, no-store" } });
          }
        } catch { /* Ignore malformed referrers. */ }
      }
    }
    if (url.pathname === EN_NUMBER_PATH || url.pathname.startsWith(`${EN_NUMBER_PATH}/`)) {
      if ((url.pathname === EN_NUMBER_PATH || url.pathname === `${EN_NUMBER_PATH}/`) && !url.searchParams.has("lang")) {
        const localized = new URL(url);
        localized.searchParams.set("lang", "en");
        return new Response(null, { status: 302, headers: { Location: localized.pathname + localized.search, "Cache-Control": "private, no-store" } });
      }
      return proxyNumberPath(request, url, EN_NUMBER_PATH);
    }

    if (url.pathname === "/games") return redirect("/games/");
    if (url.pathname === "/games/") return gamesDirectory();
    if (url.pathname === LISA_PATH) return redirect(`${LISA_PATH}/`);
    if (url.pathname.startsWith(`${LISA_PATH}/`)) return proxyLisa(request, url);
    // Older homepage markup points here. Send only homepage clicks to the game directory;
    // direct bookmarks and the game card continue to open Number Path.
    if (request.method === "GET" && url.pathname === NUMBER_PATH) {
      const referrer = request.headers.get("referer");
      if (referrer) {
        try {
          const source = new URL(referrer);
          if (source.origin === url.origin && source.pathname === "/") {
            return new Response(null, { status: 302, headers: { Location: "/games/", "Cache-Control": "private, no-store" } });
          }
        } catch { /* Ignore malformed referrers. */ }
      }
    }
    if (url.pathname === NUMBER_PATH || url.pathname.startsWith(`${NUMBER_PATH}/`)) return proxyNumberPath(request, url);

    // Preserve all other existing routes through the original Custom Domain Worker.
    return fetch(request);
  },
};

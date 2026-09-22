const LISA_PATH = "/games/lisa-letter-adventure";
const LISA_ORIGIN = "https://lsdlyu.github.io";
const LISA_ORIGIN_PREFIX = "/number-path-game/games/lisa-letter-adventure";

function redirect(location) {
  return new Response(null, {
    status: 308,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=300",
    },
  });
}

function gamesDirectory() {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#2563eb">
  <title>学习游戏｜自得学园</title>
  <meta name="description" content="适合孩子自主探索的互动数学与字母游戏。">
  <style>
    :root { color-scheme: light; font-family: ui-rounded, "SF Pro Rounded", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: #17324d; background: radial-gradient(circle at 12% 5%, #fff7bd 0 7%, transparent 24%), linear-gradient(180deg, #bce9ff 0%, #eefbff 58%, #dff7d2 100%); }
    a { color: inherit; }
    .shell { width: min(1040px, calc(100% - 28px)); margin: 0 auto; padding: 28px 0 56px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .home { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 999px; background: rgba(255,255,255,.9); text-decoration: none; font-weight: 800; box-shadow: 0 8px 24px rgba(41,88,123,.12); }
    h1 { margin: 42px 0 8px; text-align: center; font-size: clamp(2rem, 7vw, 4.2rem); line-height: 1; letter-spacing: -.04em; color: #134f96; text-shadow: 0 4px 0 rgba(255,255,255,.75); }
    .lead { margin: 0 auto 30px; text-align: center; font-size: clamp(1rem, 3vw, 1.25rem); font-weight: 700; color: #376381; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
    .card { position: relative; overflow: hidden; display: flex; flex-direction: column; min-height: 360px; padding: 26px; border: 4px solid rgba(255,255,255,.92); border-radius: 32px; text-decoration: none; box-shadow: 0 18px 45px rgba(26,76,110,.18); transition: transform .18s ease, box-shadow .18s ease; }
    .card:hover, .card:focus-visible { transform: translateY(-5px) rotate(-.35deg); box-shadow: 0 24px 52px rgba(26,76,110,.24); outline: none; }
    .number { background: linear-gradient(145deg, #fff7bc, #ffd769); }
    .letter { background: linear-gradient(145deg, #ffe6ec, #ff9fc0 55%, #9bdcff); }
    .icon { display: grid; place-items: center; width: 112px; height: 112px; margin-bottom: 24px; border-radius: 28px; background: rgba(255,255,255,.78); font-size: 3.7rem; box-shadow: inset 0 -8px 0 rgba(45,85,110,.08); transform: rotate(-3deg); }
    .letter .icon { transform: rotate(4deg); }
    h2 { margin: 0 0 10px; font-size: clamp(1.6rem, 4vw, 2.35rem); line-height: 1.15; }
    p { margin: 0; font-size: 1.05rem; line-height: 1.65; font-weight: 650; }
    .play { align-self: flex-start; margin-top: auto; padding: 12px 20px; border-radius: 999px; color: white; background: #174f94; font-weight: 900; box-shadow: 0 6px 0 #0d386b; }
    .letter .play { background: #b82f69; box-shadow: 0 6px 0 #7e2048; }
    .note { margin-top: 24px; text-align: center; color: #476b78; font-size: .95rem; font-weight: 650; }
    @media (max-width: 700px) { .shell { padding-top: 18px; } h1 { margin-top: 30px; } .grid { grid-template-columns: 1fr; } .card { min-height: 300px; padding: 22px; border-radius: 26px; } .icon { width: 92px; height: 92px; font-size: 3rem; } }
    @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
  </style>
</head>
<body>
  <main class="shell">
    <div class="top"><a class="home" href="/" aria-label="返回自得学园首页">← 返回首页</a></div>
    <h1>学习游戏</h1>
    <p class="lead">选一个小游戏，边玩边发现新本领！</p>
    <section class="grid" aria-label="游戏列表">
      <a class="card number" href="/games/number-path">
        <span class="icon" aria-hidden="true">🔢</span>
        <h2>数学路径怪探</h2>
        <p>数字顺序 · 路线推理</p>
        <p>按顺序连接数字，铺满每一个格子。先想方法，再看线索；进度自动保存在这台设备。</p>
        <span class="play">开始闯关 →</span>
      </a>
      <a class="card letter" href="/games/lisa-letter-adventure/">
        <span class="icon" aria-hidden="true">🔤</span>
        <h2>Lisa的字母冒险</h2>
        <p>英语字母 · 听音认图 · 大小写配对</p>
        <p>十个绘本关卡，随时暂停、回来续玩。建议横屏，跳跃时画面更宽。</p>
        <span class="play">进入冒险 →</span>
      </a>
    </section>
    <p class="note">进入游戏可继续上次进度，也可在菜单里查看学习记录。记录仅保存在当前浏览器，清除浏览器数据会删除记录。</p>
    <p class="note">建议在家长陪伴下使用，并适时让眼睛休息。</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

async function proxyLisa(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const suffix = url.pathname.slice(LISA_PATH.length) || "/";
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
    headers.set("location", location.replace(`${LISA_ORIGIN}${LISA_ORIGIN_PREFIX}`, LISA_PATH));
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

    if (url.pathname === "/games") return redirect("/games/");
    if (url.pathname === "/games/") return gamesDirectory();
    if (url.pathname === LISA_PATH) return redirect(`${LISA_PATH}/`);
    if (url.pathname.startsWith(`${LISA_PATH}/`)) return proxyLisa(request, url);

    // A Worker Route can fetch the Custom Domain behind it. This preserves
    // the existing Number Path game and any future /games routes.
    return fetch(request);
  },
};

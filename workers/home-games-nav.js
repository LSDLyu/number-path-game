// Route: edu.alading.org (root path only). The existing Custom Domain Worker
// remains the origin; this edits only the homepage's game navigation target.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = await fetch(request);
    if (url.pathname !== "/" || request.method !== "GET" ||
        upstream.status !== 200 || !(upstream.headers.get("content-type") || "").includes("text/html")) {
      return upstream;
    }

    const original = await upstream.text();
    if (!original.includes('/games/number-path')) return new Response(original, upstream);
    const headers = new Headers(upstream.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    return new Response(original.replaceAll('/games/number-path', '/games/').replaceAll('数学游戏', '学习游戏'), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};

// Supply split, compressed static files through Unity's ordinary fetch interface.
// Each compressed part stays below GitHub's file limit; decompression is streamed.
async function installGamePayload(manifestUrl) {
  if (!window.DecompressionStream) throw new Error('请使用支持此游戏的新版 Chrome 或 Edge 浏览器。');
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) throw new Error('游戏文件清单加载失败。');
  const manifest = await manifestResponse.json();
  const originalFetch = window.fetch.bind(window);
  const entries = new Map(Object.entries(manifest).map(([url, entry]) => [new URL(url, manifestResponse.url).href, entry]));
  // Cache compressed, content-addressed parts. Unity's virtual data/wasm URLs
  // stay uncached to avoid mixing two releases with the same virtual filename.
  const cacheName = 'pet234-probably-stolen-assets-v1';
  let assetCache = null, cacheUnavailable = false;
  let cachedParts = 0, downloadedParts = 0;
  const totalParts = Object.values(manifest).reduce((sum, entry) => sum + entry.parts.length, 0);
  const report = phase => {
    window.dispatchEvent?.(new CustomEvent('probably-stolen-assets', {
      detail: {phase, cachedParts, downloadedParts, totalParts, cacheUnavailable}
    }));
  };
  try { assetCache = await window.caches?.open(cacheName); } catch { /* Private mode or quota policy. */ }
  if (!assetCache) { cacheUnavailable = true; report('cache-unavailable'); }
  async function fetchPart(url, signal) {
    if (assetCache) {
      try {
        const hit = await assetCache.match(url);
        if (hit) { cachedParts++; report('cached'); return {response:hit, stored:Promise.resolve()}; }
      } catch { cacheUnavailable = true; }
    }
    report('downloading');
    const response = await originalFetch(url, {signal});
    if (!response.ok) throw new Error('游戏资源下载失败：' + response.status);
    // Store while Unity consumes the other stream, without assembling the
    // 242 MB download in JS memory. A failed cache write never prevents play.
    const stored = assetCache ? assetCache.put(url, response.clone()).catch(() => {
      cacheUnavailable = true; report('cache-unavailable');
    }) : Promise.resolve();
    downloadedParts++;
    return {response, stored};
  }
  window.fetch = async function(input, options) {
    const url = new URL(input instanceof Request ? input.url : input, document.baseURI).href;
    const entry = entries.get(url);
    if (!entry) return originalFetch(input, options);
    let part = 0, reader = null, stored = Promise.resolve();
    const signal = options?.signal || (input instanceof Request ? input.signal : undefined);
    const compressed = new ReadableStream({
      async pull(controller) {
        try {
          for (;;) {
            if (!reader) {
              if (part === entry.parts.length) { controller.close(); return; }
              const result = await fetchPart(new URL(entry.parts[part++], manifestResponse.url).href, signal);
              reader = result.response.body.getReader();
              stored = result.stored;
            }
            const result = await reader.read();
            if (!result.done) { controller.enqueue(result.value); return; }
            reader.releaseLock(); reader = null;
            await stored;
            report('ready');
          }
        } catch (error) { controller.error(error); }
      },
      cancel(reason) { return reader?.cancel(reason); }
    });
    return new Response(compressed.pipeThrough(new DecompressionStream('gzip')), {
      headers: {'Content-Type': entry.type, 'Content-Length': String(entry.length)}
    });
  };
}

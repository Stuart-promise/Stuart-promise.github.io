// Supply split, compressed static files through Unity's ordinary fetch interface.
// Each compressed part stays below GitHub's file limit; decompression is streamed.
async function installGamePayload(manifestUrl) {
  if (!window.DecompressionStream) throw new Error('请使用支持此游戏的新版 Chrome 或 Edge 浏览器。');
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) throw new Error('游戏文件清单加载失败。');
  const manifest = await manifestResponse.json();
  const originalFetch = window.fetch.bind(window);
  const entries = new Map(Object.entries(manifest).map(([url, entry]) => [new URL(url, manifestResponse.url).href, entry]));
  window.fetch = async function(input, options) {
    const url = new URL(input instanceof Request ? input.url : input, document.baseURI).href;
    const entry = entries.get(url);
    if (!entry) return originalFetch(input, options);
    let part = 0, reader = null;
    const signal = options?.signal || (input instanceof Request ? input.signal : undefined);
    const compressed = new ReadableStream({
      async pull(controller) {
        try {
          for (;;) {
            if (!reader) {
              if (part === entry.parts.length) { controller.close(); return; }
              const response = await originalFetch(new URL(entry.parts[part++], manifestResponse.url), {signal});
              if (!response.ok) throw new Error('游戏资源下载失败：' + response.status);
              reader = response.body.getReader();
            }
            const result = await reader.read();
            if (!result.done) { controller.enqueue(result.value); return; }
            reader.releaseLock(); reader = null;
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

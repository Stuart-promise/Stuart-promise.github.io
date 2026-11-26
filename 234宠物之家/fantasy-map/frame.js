/* Bridge the native editor's preference and browser-save stores to its signed-in host. */
(() => {
  'use strict';
  if (window.parent === window || !window.parent.FantasyHost) {
    location.replace('../');
    return;
  }
  const host = window.parent.FantasyHost;
  const initial = host.initial;
  const preferences = Object.assign(Object.create(null), initial?.preferences);
  const records = Object.assign(Object.create(null), initial?.database);
  const secrets = new Map();
  const secret = key => /^(?:auth-|fmg-ai-kl-|fmg-help-token$)/.test(key);
  const store = {
    get length() { return Object.keys(preferences).length + secrets.size; },
    key(index) { return [...Object.keys(preferences), ...secrets.keys()][index] ?? null; },
    getItem(key) { return (secret(key) ? secrets.get(key) : preferences[key]) ?? null; },
    setItem(key, input) {
      const value = String(input);
      if (secret(key)) { secrets.set(key,value); return; }
      if (preferences[key] === value) return;
      preferences[key] = value;
      host.changed();
    },
    removeItem(key) {
      if (secret(key)) { secrets.delete(key); return; }
      if (Object.hasOwn(preferences,key)) { delete preferences[key]; host.changed(); }
    },
    clear() {
      for (const key of Object.keys(preferences)) delete preferences[key];
      secrets.clear();
      host.changed();
    }
  };
  // Native custom-style listing enumerates Storage keys directly.
  const isolatedStorage = new Proxy(store, {
    get(target,key) { return key in target ? target[key] : preferences[key]; },
    ownKeys() { return Object.keys(preferences); },
    getOwnPropertyDescriptor(target,key) {
      if (Object.hasOwn(preferences,key)) return {configurable:true,enumerable:true,value:preferences[key]};
      return Object.getOwnPropertyDescriptor(target,key);
    }
  });
  Object.defineProperty(window,'localStorage',{value:isolatedStorage});
  const slot = key => key === 'lastMap' || /^autosave-[1-5]$/.test(key);
  async function blobOf(map,compressed) {
    const blob = new Blob([map],{type:'text/plain'});
    return compressed ? new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob() : blob;
  }
  const database = {
    async get(key) {
      const record = records[key];
      if (!record) return null;
      if (!slot(key)) return structuredClone(record);
      const blob = await blobOf(record.map,record.compressed);
      return record.meta ? {...record.meta,blob} : blob;
    },
    async set(key,input) {
      if (slot(key)) {
        const blob = input instanceof Blob ? input : input.blob;
        const compressed = !(input instanceof Blob);
        const map = compressed ? await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text() : await blob.text();
        const meta = compressed ? Object.fromEntries(Object.entries(input).filter(([name])=>name!=='blob')) : null;
        records[key] = {map,compressed,meta};
      } else {
        records[key] = structuredClone(input);
      }
      host.changed();
    },
    async remove(key) {
      if (Object.hasOwn(records,key)) { delete records[key]; host.changed(); }
    }
  };
  window.MapWorkshop = {
    initial, database,
    changed: () => host.changed(),
    failed: error => host.failed(error),
    ready(capture) { host.ready(() => ({format:'azgaar-workspace-1',...capture(),preferences:{...preferences},database:{...records}})); }
  };
  // Keep panning, pinching, drawing and native text fields while suppressing touch callouts.
  const editable = node => node?.closest?.('input:not([type=button]):not([type=range]),textarea,[contenteditable=true],[contenteditable=plaintext-only]');
  let wasTouch = false;
  document.addEventListener('pointerdown', e => {wasTouch=e.pointerType!=='mouse';},true);
  document.addEventListener('contextmenu',e => {
    if ((wasTouch || matchMedia('(pointer:coarse)').matches) && !editable(e.target)) e.preventDefault();
  },true);
  document.addEventListener('selectstart',e => {if(!editable(e.target)) e.preventDefault();},true);
  for (const event of ['pointerup','input','change','keyup','wheel']) {
    window.addEventListener(event,()=>host.changed(),{capture:true,passive:true});
  }
})();

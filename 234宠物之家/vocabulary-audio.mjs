// Recorded synthetic speech: no device voice pack or third-party audio endpoint required.
const player = new Audio();
player.preload = 'none';
player.setAttribute('playsinline', '');
let clips = {}, current = 0, timer;
export const audioReady = fetch('./vocabulary-audio.json?v=calendar3').then(r => {
  if (!r.ok) throw Error('音频目录加载失败');
  return r.json();
}).then(data => { clips = data; });
audioReady.catch(() => {});
export function stopAudio() {
  current++; clearTimeout(timer); player.pause();
  window.speechSynthesis?.cancel();
}
export function playAudio(text, accent, report) {
  stopAudio(); const token = current, id = clips[text];
  if (!id) { report('音频尚未准备好，请稍后重试；网络恢复后刷新页面。'); return; }
  player.src = new URL((accent==='en-GB'?'./assets/vocab-audio-gb/':'./assets/vocab-audio/') + id + '.mp3', import.meta.url).href;
  report('正在加载发音…');
  const failed = () => { if (token === current) { clearTimeout(timer); report('音频未能播放，请重试并检查网络或浏览器声音权限。'); } };
  player.onerror = failed;
  player.onended = () => { if (token === current) report('播放完毕 · 可再次点击收听'); };
  timer = setTimeout(() => { if (token === current) { player.pause(); failed(); } }, 15000);
  // Invoke play in the click event, before awaiting anything, including on iOS.
  const playing = player.play();
  playing?.then(() => { if (token === current) { clearTimeout(timer); report('正在播放 · '+(accent==='en-GB'?'英式':'美式')+'发音'); } }).catch(failed);
}

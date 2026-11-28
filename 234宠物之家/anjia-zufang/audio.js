/* 安栖租房 · 声音引擎（全部实时合成，无外部音频文件） */
const SFX = (() => {
  let ctx = null, master = null, drone = null, hbTimer = null, boxTimer = null, whisperTimer = null;
  const now = () => ctx.currentTime;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  const ok = () => !!ctx;

  function noiseBuf(sec = 2) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function tone(freq, t, dur, vol, type = 'sine', slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseHit(t, dur, vol, freq = 800, type = 'lowpass') {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf(dur + 0.1); f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
  }

  // 正常的“叮咚”消息提示音；bad=true 时走调
  function ding(bad) {
    if (!ok()) return; const t = now();
    if (!bad) { tone(1046, t, 0.25, 0.25); tone(1318, t + 0.12, 0.35, 0.22); }
    else { tone(1046, t, 0.6, 0.25, 'sine', 700); tone(1108, t + 0.15, 0.9, 0.2, 'sine', 500); }
  }
  // 敲门声
  function knock(n = 3, gap = 0.32, vol = 0.9) {
    if (!ok()) return; const t = now();
    for (let i = 0; i < n; i++) {
      tone(110, t + i * gap, 0.22, vol, 'sine', 45);
      noiseHit(t + i * gap, 0.07, vol * 0.5, 900);
    }
  }
  function step(vol = 0.35) { if (!ok()) return; const t = now(); tone(70, t, 0.18, vol, 'sine', 40); noiseHit(t, 0.06, vol * 0.4, 500); }

  // 低频环境压迫音
  function droneOn(level = 1) {
    if (!ok()) return;
    if (!drone) {
      const g = ctx.createGain(); g.gain.value = 0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
      o1.type = 'sawtooth'; o1.frequency.value = 46; o2.type = 'sawtooth'; o2.frequency.value = 46.6; o3.type = 'sine'; o3.frequency.value = 69.3;
      const n = ctx.createBufferSource(); n.buffer = noiseBuf(4); n.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 350; bp.Q.value = 0.8;
      const ng = ctx.createGain(); ng.gain.value = 0.25;
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 90;
      lfo.connect(lg); lg.connect(lp.frequency);
      [o1, o2, o3].forEach(o => o.connect(lp)); n.connect(bp); bp.connect(ng); ng.connect(lp);
      lp.connect(g); g.connect(master);
      [o1, o2, o3, n, lfo].forEach(x => x.start());
      drone = { g, nodes: [o1, o2, o3, n, lfo] };
    }
    drone.g.gain.cancelScheduledValues(now());
    drone.g.gain.linearRampToValueAtTime(0.06 * level, now() + 4);
  }
  function droneOff(fast) {
    if (!drone) return;
    drone.g.gain.cancelScheduledValues(now());
    drone.g.gain.linearRampToValueAtTime(0, now() + (fast ? 0.05 : 2));
  }

  // 心跳
  function heartbeat(bpm = 70) {
    if (!ok()) return; clearTimeout(hbTimer);
    const beat = () => {
      const t = now(); tone(58, t, 0.16, 0.9, 'sine', 40); tone(52, t + 0.2, 0.2, 0.7, 'sine', 36);
      hbTimer = setTimeout(beat, 60000 / bpm);
    };
    beat();
  }
  function heartStop() { clearTimeout(hbTimer); hbTimer = null; }

  // 气声耳语（滤波噪声）
  function whisper(dur = 1.6, vol = 0.18) {
    if (!ok()) return; const t = now();
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(dur + 0.2);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    for (let i = 0; i < dur * 8; i++) {
      f.frequency.setValueAtTime(1200 + Math.random() * 2600, t + i / 8);
      g.gain.linearRampToValueAtTime(Math.random() * vol, t + i / 8 + 0.06);
    }
    g.gain.linearRampToValueAtTime(0, t + dur);
    s.connect(f); f.connect(g);
    if (p) { p.pan.setValueAtTime(Math.random() > .5 ? -0.9 : 0.9, t); g.connect(p); p.connect(master); } else g.connect(master);
    s.start(t); s.stop(t + dur + 0.1);
  }
  function whispers(on, every = 5000) {
    clearInterval(whisperTimer);
    if (on) whisperTimer = setInterval(() => whisper(1 + Math.random() * 1.5), every);
  }

  // 走调的八音盒《两只老虎》
  function musicBox(on, vol = 0.12) {
    clearTimeout(boxTimer); if (!on || !ok()) return;
    const C = 523.25, D = 587.33, Eb = 622.25, F = 698.46, G = 783.99, Ab = 830.61, g3 = 392;
    const mel = [C, D, Eb, C, C, D, Eb, C, Eb, F, G, 0, Eb, F, G, 0, G, Ab, G, F, Eb, C, G, Ab, G, F, Eb, C, C, g3, C, 0, C, g3, C, 0];
    let i = 0, tempo = 0.42;
    const play = () => {
      const f = mel[i % mel.length];
      if (f) {
        const det = 1 + (Math.random() - 0.5) * 0.03, t = now();
        tone(f * det, t, 1.4, vol); tone(f * 2 * det, t, 0.6, vol * 0.25, 'triangle');
      }
      i++; if (i % mel.length === 0) tempo *= 1.12;
      boxTimer = setTimeout(play, tempo * 1000 * (0.9 + Math.random() * 0.25));
    };
    play();
  }

  // 静电噪声
  function staticBurst(dur = 0.4, vol = 0.3) { if (!ok()) return; noiseHit(now(), dur, vol, 6000, 'highpass'); }

  // 尖叫（跳吓用）
  function scream() {
    if (!ok()) return; const t = now();
    const ws = ctx.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 8); }
    ws.curve = curve;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.03);
    g.gain.setValueAtTime(0.9, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    ws.connect(g); g.connect(master);
    [620, 910, 1280, 1730].forEach((fq, k) => {
      const o = ctx.createOscillator(); o.type = k % 2 ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(fq, t); o.frequency.linearRampToValueAtTime(fq * 1.25, t + 0.3); o.frequency.exponentialRampToValueAtTime(fq * 0.45, t + 2.1);
      const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = 11 + k * 3; vg.gain.value = fq * 0.06;
      v.connect(vg); vg.connect(o.frequency);
      const og = ctx.createGain(); og.gain.value = 0.18; o.connect(og); og.connect(ws);
      o.start(t); v.start(t); o.stop(t + 2.3); v.stop(t + 2.3);
    });
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(2.3); const sg = ctx.createGain(); sg.gain.value = 0.35;
    s.connect(sg); sg.connect(ws); s.start(t);
    tone(40, t, 1.5, 0.9, 'sine', 25);
  }

  // 语音（系统中文语音，低沉缓慢）
  function speak(text, { rate = 0.62, pitch = 0.1, volume = 0.9 } = {}) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().find(v => /zh/i.test(v.lang));
      if (v) u.voice = v; u.lang = 'zh-CN'; u.rate = rate; u.pitch = pitch; u.volume = volume;
      speechSynthesis.speak(u);
    } catch (e) { }
  }

  function stopAll() { droneOff(true); heartStop(); musicBox(false); whispers(false); try { speechSynthesis.cancel(); } catch (e) { } }

  return { init, ok, ding, knock, step, droneOn, droneOff, heartbeat, heartStop, whisper, whispers, musicBox, staticBurst, scream, speak, stopAll };
})();
if (window.speechSynthesis) speechSynthesis.getVoices();

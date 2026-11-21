"use strict";

const games = [
  { id: "che-man", title: "Che-Man", genre: "平台动作", color: "#593c86", description: "跳过机关，穿过地牢，把勋章逐枚送回图腾。",
    guide: "方向键移动，A 跳跃。遇到英文对白，按 A 或 B 翻过。",
    menu: "原版菜单先用方向键选择语言，按 START 确认，再选 GAME A 开始。",
    startFrames: 411, english: true },
  { id: "helmet", title: "头盔中士训练日", genre: "俯视冒险", color: "#375f45", description: "潜入训练基地，找到三台电脑并放置炸弹。",
    guide: "方向键移动，A 射击，B 与任务目标互动。",
    menu: "原版菜单用 SELECT 切换任务，按 START 进入。",
    startFrames: 411 },
  { id: "thwaite", title: "Thwaite 小镇防空战", genre: "防空射击", color: "#8a4132", description: "瞄准来袭的导弹，让爆炸在小镇上空连成一片。",
    guide: "方向键移动准星。B 从左侧发射，A 从右侧发射，在导弹前方布置拦截。",
    menu: "原版菜单用方向键选择 1 Player 或 Practice，按 START 确认。START 可跳过剧情。",
    startFrames: 581, skipStory: true }
];

const $ = selector => document.querySelector(selector);
const player = $("#player");
const canvas = $("canvas");
canvas.tabIndex = -1;
const screen = canvas.getContext("2d", { alpha: false });
const frameImage = screen.createImageData(256, 240);
const pixels = new Uint32Array(frameImage.data.buffer);
const controls = [...document.querySelectorAll("[data-key]")];
const keyMap = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT",
  KeyX:"A", KeyZ:"B", ShiftLeft:"SELECT", ShiftRight:"SELECT", Enter:"START" };
const held = new Map();
let current, nes, generation = 0, animation = 0, running = false;
let audio, soundOn = true, nextAudio = 0, sampleCount = 0;
const sampleRate = 44100;
const leftSamples = new Float32Array(2048);
const rightSamples = new Float32Array(2048);

for (const game of games) {
  const cart = document.createElement("button");
  cart.className = "cart";
  cart.style.setProperty("--ink", game.color);
  cart.innerHTML = `<span class="label"><span class="genre"><span>${game.genre}</span><span>FC</span></span><img src="./screens/${game.id}.png" alt=""></span>
    <strong>${game.title}</strong><span class="desc">${game.description}</span><span class="play">▶ 开始游戏</span>`;
  cart.addEventListener("click", () => load(game, true));
  $("#shelf").append(cart);
}

function status(message) {
  $("#status").textContent = message;
  $("#status").hidden = !message;
}
function draw(frame) {
  for (let i = 0; i < pixels.length; i++) pixels[i] = 0xff000000 | frame[i];
}
function unlockSound() {
  if (!soundOn) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audio ??= new Audio();
    if (audio.state === "suspended" || audio.state === "interrupted") audio.resume().catch(() => {});
  } catch { /* Silent play is available on devices without audio output. */ }
}
function sample(left, right) {
  if (!running || !soundOn || audio?.state !== "running") return;
  leftSamples[sampleCount] = left;
  rightSamples[sampleCount++] = right;
  if (sampleCount < leftSamples.length) return;
  sampleCount = 0;
  const now = audio.currentTime;
  if (nextAudio > now + 0.15) return;
  const buffer = audio.createBuffer(2, leftSamples.length, sampleRate);
  buffer.copyToChannel(leftSamples, 0);
  buffer.copyToChannel(rightSamples, 1);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  if (nextAudio <= now) nextAudio = now + 0.018;
  source.start(nextAudio);
  nextAudio += buffer.duration;
}
function press(source, key) {
  if (!running || held.has(source)) return;
  const alreadyHeld = [...held.values()].includes(key);
  held.set(source, key);
  if (!alreadyHeld) nes.buttonDown(1, jsnes.Controller["BUTTON_" + key]);
  controls.find(button => button.dataset.key === key)?.classList.add("held");
}
function release(source) {
  const key = held.get(source);
  if (!key) return;
  held.delete(source);
  if ([...held.values()].includes(key)) return;
  nes?.buttonUp(1, jsnes.Controller["BUTTON_" + key]);
  controls.find(button => button.dataset.key === key)?.classList.remove("held");
}
function stop() {
  for (const source of [...held.keys()]) release(source);
  running = false;
  cancelAnimationFrame(animation);
  sampleCount = 0;
  nextAudio = 0;
}
function pause() {
  if (!running) return;
  stop();
  status("已暂停");
  $("#pause").textContent = "继续";
}
function play() {
  if (!nes || running) return;
  running = true;
  status("");
  $("#pause").textContent = "暂停";
  let previous = performance.now();
  let elapsed = 0;
  const step = 1000 / 60;
  function tick(now) {
    if (!running) return;
    elapsed += Math.min(now - previous, step * 3);
    previous = now;
    try {
      while (elapsed >= step) { nes.frame(); elapsed -= step; }
      screen.putImageData(frameImage, 0, 0);
    } catch {
      stop();
      status("游戏已中断，可点「原版菜单」重新载入。");
      return;
    }
    animation = requestAnimationFrame(tick);
  }
  animation = requestAnimationFrame(tick);
}

// Advance unmodified cartridges through their original menus using controller input.
async function quickStart(machine, game, token) {
  const taps = new Map([[180,"START"],[320,"START"]]);
  if (game.english) taps.set(150,"DOWN");
  if (game.skipStory) taps.set(460,"START");
  for (let i = 0; i < game.startFrames; i++) {
    if (taps.has(i)) machine.buttonDown(1, jsnes.Controller["BUTTON_" + taps.get(i)]);
    if (taps.has(i - 5)) machine.buttonUp(1, jsnes.Controller["BUTTON_" + taps.get(i - 5)]);
    machine.frame();
    if (i % 20 === 19) {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (token !== generation) return;
    }
  }
}
async function load(game, quick) {
  const token = ++generation;
  stop();
  nes = null;
  current = game;
  unlockSound();
  if (!player.open) player.showModal();
  canvas.focus({ preventScroll:true });
  $("#game-title").textContent = game.title;
  $("#guide").textContent = game.guide;
  $("#menu-guide").textContent = game.menu;
  $("#pause").disabled = true;
  $("#pause").textContent = "暂停";
  screen.fillRect(0, 0, 256, 240);
  status("正在载入卡带…");
  try {
    const result = await fetch("./roms/" + game.id + ".nes");
    if (!result.ok) throw new Error("ROM unavailable");
    const rom = await result.arrayBuffer();
    if (token !== generation) return;
    const machine = new jsnes.NES({ onFrame:draw, onAudioSample:sample, sampleRate });
    machine.loadROM(rom);
    if (quick) await quickStart(machine, game, token);
    if (token !== generation) return;
    nes = machine;
    screen.putImageData(frameImage, 0, 0);
    $("#pause").disabled = false;
    play();
    if (document.hidden) pause();
  } catch {
    if (token === generation) status("卡带载入失败，请返回选卡后重试。");
  }
}
for (const button of controls) {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    press(event.pointerId, button.dataset.key);
  });
  for (const type of ["pointerup","pointercancel","lostpointercapture"])
    button.addEventListener(type, event => release(event.pointerId));
  button.addEventListener("contextmenu", event => event.preventDefault());
  button.addEventListener("click", event => {
    if (event.detail !== 0) return;
    const source = Symbol();
    press(source, button.dataset.key);
    setTimeout(() => release(source), 90);
  });
}
document.addEventListener("keydown", event => {
  if (!player.open || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === "Enter" && event.target.closest("button")) return;
  const key = keyMap[event.code];
  if (!key) return;
  event.preventDefault();
  press(event.code, key);
});
document.addEventListener("keyup", event => release(event.code));
$("#pause").onclick = () => {
  if (running) pause(); else { unlockSound(); play(); }
  canvas.focus({ preventScroll:true });
};
$("#sound").onclick = () => {
  soundOn = !soundOn;
  sampleCount = 0;
  nextAudio = 0;
  if (soundOn) unlockSound();
  $("#sound").textContent = soundOn ? "声音开" : "声音关";
  $("#sound").setAttribute("aria-pressed", String(soundOn));
  canvas.focus({ preventScroll:true });
};
$("#menu").onclick = () => load(current, false);
$("#leave").onclick = () => player.close();
player.addEventListener("close", () => {
  generation++;
  stop();
  nes = null;
  if (audio) audio.close().catch(() => {});
  audio = null;
});
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });


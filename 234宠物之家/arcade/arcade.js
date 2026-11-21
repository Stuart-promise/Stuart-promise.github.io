"use strict";

const games = [
  { id: "rescue-rangers", title: "松鼠大作战", genre: "搬箱闯关", color: "#7e502d", description: "扮演奇奇，在放大的庭院里举起箱子，砸开前进的路。",
    guide: "左右移动，A 跳跃。在箱子旁按 B 举起，再按 B 扔出。",
    menu: "标题选 1 PLAYER，按 START 确认，再选 CHIP 或 DALE。", startFrames: 440, taps: [[90,"START"],[220,"START"],[360,"START"]] },
  { id: "double-dragon-ii", title: "双截龙Ⅱ：复仇", genre: "街头格斗", color: "#944332", description: "独自穿过街区，迎击前后两侧的敌人。",
    guide: "方向键移动，A 向右攻击，B 向左攻击，同时按 A 和 B 跳跃。",
    menu: "在原版菜单选 1P PLAY，按 START 开始。", startFrames: 580, taps: [[160,"START"],[320,"START"],[470,"START"]] },
  { id: "super-dodge-ball", title: "热血高校躲避球部", genre: "球场对战", color: "#894230", description: "带领热血高校队传球、助跑，用投球击倒对方球员。",
    guide: "方向键移动，连续点同一方向两次可助跑。A 传球，B 投球，A+B 跳跃。",
    menu: "在中文菜单选择「单人游戏」，按 START 确认。", startFrames: 803, taps: [[90,"START"],[220,"START"],[350,"START"],[500,"START"],[700,"START"]] },
  { id: "excitebike", title: "越野摩托 Excitebike", genre: "越野竞速", color: "#3e5f78", description: "换道冲上跳台，在空中调整车身，尽量平稳落地。",
    guide: "A 加速，B 增压，注意温度。上下换道，左右调整车身倾角。",
    menu: "选择 SELECTION A，按 START 确认后选择赛道。", startFrames: 761, taps: [[90,"START"],[220,"START"]] },
  { id: "lode-runner", title: "淘金者", genre: "挖坑解谜", color: "#81522e", description: "收集散落的金块，挖开砖块困住追兵，再沿梯子逃走。",
    guide: "方向键移动、爬梯。A 挖右侧，B 挖左侧，留意砖块恢复的时间。",
    menu: "中文标题画面按 START 开始。", startFrames: 750, taps: [[90,"START"]] },
  { id: "bomberman", title: "炸弹人", genre: "迷宫爆破", color: "#46733f", description: "炸开迷宫里的砖墙，找到藏在墙后的出口。",
    guide: "方向键移动，A 放炸弹。放好后转到墙后，避开十字形爆风。",
    menu: "中文菜单选择「开始」，按 START 进入第一关。", startFrames: 230, taps: [[90,"START"]] },
  { id: "ice-climber", title: "敲冰块 Ice Climber", genre: "登山跳台", color: "#446586", description: "挥动木槌砸开头顶的冰层，追着山顶的大鸟一路往上爬。",
    guide: "左右移动，A 跳跃，B 挥槌。跳起时可以顶开薄冰。",
    menu: "标题画面选择 1 PLAYER GAME，按 START 开始。", startFrames: 781, taps: [[120,"START"]] },
  { id: "circus-charlie", title: "马戏团 Circus Charlie", genre: "节奏跳跃", color: "#864936", description: "骑着狮子穿过火圈，把起跳时机卡在火盆前。",
    guide: "左右移动，A 跳跃。先看火圈和火盆的间距再起跳。",
    menu: "标题默认选中 1 PLAYER A，按 START 开始。", startFrames: 551, taps: [[250,"START"]] },
  { id: "antarctic-adventure", title: "南极大冒险", genre: "冰原竞速", color: "#286d7c", description: "操控企鹅沿南极海岸赶路，跳过冰缝，绕开探头的海豹。",
    guide: "左右转向，A 跳跃。尽量在倒计时结束前赶到下一站。",
    menu: "在标题画面选 LEVEL 1，按 START 出发。", startFrames: 781, taps: [[260,"START"]] },
  { id: "adventure-island", title: "高桥名人之冒险岛", genre: "横版冒险", color: "#597640", description: "穿过热带森林，收集水果补充体力，敲开蛋寻找道具。",
    guide: "左右移动，A 跳跃。取得石斧后按 B 投掷。",
    menu: "标题画面按 START，进入第一座岛。", startFrames: 551, taps: [[265,"START"]] },
  { id: "jackal", title: "赤色要塞 Jackal", genre: "战车突击", color: "#4a6140", description: "开着吉普车穿过敌方营地，炸开囚室，救出战俘。",
    guide: "方向键驾驶，B 发射机枪，A 投掷手雷或发射升级后的火箭弹。",
    menu: "标题选择单人模式，按 START 出发。", startFrames: 946, taps: [[200,"START"]] },
  { id: "life-force", title: "沙罗曼蛇 Life Force", genre: "太空射击", color: "#654570", description: "驾驶战机穿越生物组织构成的隧道，收集胶囊升级火力。",
    guide: "方向键移动，B 射击。拾取胶囊后按 A 启用当前亮起的强化。",
    menu: "标题选择单人模式，按 START 出击。", startFrames: 461, taps: [[200,"START"]] },
  { id: "contra", title: "魂斗罗 Contra", genre: "横版射击", color: "#355247", description: "从第一关丛林登陆，沿河岸一路突破敌方据点。",
    guide: "方向键移动和瞄准，A 跳跃，B 射击。在部分平台上按住下再按 A，可以跳到下一层。",
    menu: "标题默认选中 1 PLAYER，按 START 进入单人模式。", startFrames: 915, taps: [[120,"START"],[200,"START"]] },
  { id: "super-mario-bros", title: "超级马力欧兄弟", genre: "横版闯关", color: "#99432b", description: "从第一块问号砖出发，跳过水管，奔向关底旗杆。",
    guide: "左右移动，A 跳跃，按住 B 加速。吃到火焰花后，按 B 发射火球。",
    menu: "标题画面默认选中单人模式，按 START 开始。", startFrames: 265, taps: [[75,"START"]] },
  { id: "battle-city", title: "坦克大战 Battle City", genre: "基地防守", color: "#735031", description: "打穿砖墙拦截敌方坦克，守住地图底部的鹰徽基地。",
    guide: "方向键移动或转向，A 或 B 开炮。砖墙可以打穿，也要留意自己基地前的掩体。",
    menu: "选择 1 PLAYER 后按 START，到了 STAGE 1 再按 START 出击。", startFrames: 581, taps: [[100,"START"],[200,"START"],[300,"START"]] },
  { id: "sprilo", title: "Sprilo 计时赛车", genre: "俯视竞速", color: "#81472f", description: "在四条袖珍赛道上练习入弯，挑战自己的最快圈速。",
    guide: "按住 A 加速，左右转向。入弯前松开 A 可以减速。",
    menu: "用方向键选择赛道、速度和圈数，按 START 发车。", startFrames: 352, taps: [[180,"START"]] },
  { id: "void-lancer", title: "虚空战机 VOID LANCER", genre: "纵向射击", color: "#544375", description: "在弹幕之间穿行，逼近敌机，危急时释放脉冲炸弹。",
    guide: "方向键移动，A 开火，B 释放脉冲炸弹。",
    menu: "标题画面按 START 进入第一关。", startFrames: 66, taps: [[45,"START"]] },
  { id: "croom", title: "记忆翻牌", genre: "记忆配对", color: "#556526", description: "每次翻两张，记住图案的位置，找齐桌上的每一对。",
    guide: "方向键移动指针，A 翻牌。配错会消耗次数，配齐所有图案即可过关。",
    menu: "在原版菜单选 1 Player Solitaire，按 START 选难度，再按 START 跳过说明。", startFrames: 350, taps: [[70,"DOWN"],[115,"START"],[190,"START"],[270,"START"]] },
  { id: "hanoi", title: "汉诺塔", genre: "逻辑解谜", color: "#365c84", description: "在三根柱子间搬动圆盘，用尽量少的步数把整座塔移到最右边。",
    guide: "左右选柱，A 拿起或放下圆盘，B 取消。大盘不能压在小盘上。",
    menu: "标题画面按 START，从一个圆盘开始挑战。", startFrames: 130, taps: [[90,"START"]] },
  { id: "falling", title: "高空速降 Falling", genre: "极限闪避", color: "#315b94", description: "在云层之间自由落体，绕开迎面而来的平台，顺路捡金币。",
    guide: "左右移动，提前找准平台之间的空隙。START 可暂停或继续。",
    menu: "用上、下选择白昼、黄昏或夜晚，按 START 出发。", startFrames: 201, taps: [[120,"START"]] },
  { id: "lunar-limit", title: "月球炮台 Lunar Limit", genre: "旋转射击", color: "#504378", description: "炮台会自动开火。边移动边转动炮口，让火力扫过飞来的敌人。",
    guide: "方向键移动。按住 A 顺时针转动炮口，B 反向转动。",
    menu: "在标题画面按 START 开局。", startFrames: 201, taps: [[120,"START"]] },
  { id: "bootee", title: "弹跳靴 Bootèe", genre: "弹跳闯关", color: "#475c85", description: "靴子一落地就弹起。压低跳跃钻过机关，再蓄力击退敌人。",
    guide: "左右移动，下键压低跳跃。按住 B 蓄力，松开发射。",
    menu: "标题画面按 START，说明画面按动作键继续。", startFrames: 845, taps: [[180,"START"],[320,"START"],[480,"START"],[620,"START"],[780,"START"]] },
  { id: "espitene", title: "极速金环 Espitene", genre: "高速平台", color: "#34704b", description: "跑过起伏的平台，沿路拾取金环，冲向区域终点。",
    guide: "左右加速移动，A 跳跃。带在身上的金环能抵挡一次伤害。",
    menu: "标题画面按 START 开始，A、B 或 START 推进剧情。", startFrames: 685, taps: [[180,"START"],[320,"START"],[480,"START"],[620,"START"]] },
  { id: "breakout", title: "打砖块", genre: "弹球", color: "#8e3f31", description: "用挡板接住小球，打出一条通往顶层砖墙的路线。",
    guide: "按左、右移动挡板。看准小球落点，换个位置接球就能改变反弹角度。",
    menu: "原版标题画面按 START 开局。", startFrames: 205, taps: [[180,"START"]] },
  { id: "pong", title: "Pong 乒乓", genre: "人机对战", color: "#345573", description: "守住左侧边线，和电脑来一场像素乒乓赛。",
    guide: "按上、下移动左侧球拍。让球拍的边缘碰球，可以斜着打回去。",
    menu: "原版菜单默认选中 Player A vs. CPU，按 START 进入人机对战。", startFrames: 205, taps: [[180,"START"]] },
  { id: "snake", title: "贪吃蛇", genre: "追分", color: "#405d39", description: "追着红苹果转弯，看看能把小蛇养多长。",
    guide: "按方向键转弯，吃到苹果后蛇身会变长。提前给自己留一条出路。",
    menu: "卡带载入后小蛇就会移动。点「重新开局」可从头开始。", restartOnly: true, startFrames: 18, taps: [] },
  { id: "che-man", title: "Che-Man", genre: "平台动作", color: "#593c86", description: "跳过机关，穿过地牢，把勋章逐枚送回图腾。",
    guide: "方向键移动，A 跳跃。遇到英文对白，按 A 或 B 翻过。",
    menu: "原版菜单先用方向键选择语言，按 START 确认，再选 GAME A 开始。",
    startFrames: 411, taps: [[150,"DOWN"],[180,"START"],[320,"START"]] },
  { id: "helmet", title: "头盔中士训练日", genre: "俯视冒险", color: "#375f45", description: "潜入训练基地，找到三台电脑并放置炸弹。",
    guide: "方向键移动，A 射击，B 与任务目标互动。",
    menu: "原版菜单用 SELECT 切换任务，按 START 进入。",
    startFrames: 411, taps: [[180,"START"],[320,"START"]] },
  { id: "thwaite", title: "Thwaite 小镇防空战", genre: "防空射击", color: "#8a4132", description: "瞄准来袭的导弹，让爆炸在小镇上空连成一片。",
    guide: "方向键移动准星。B 从左侧发射，A 从右侧发射，在导弹前方布置拦截。",
    menu: "原版菜单用方向键选择 1 Player 或 Practice，按 START 确认。START 可跳过剧情。",
    startFrames: 581, taps: [[180,"START"],[320,"START"],[460,"START"]] },
  { id: "jet-paco", title: "喷气特工 Jet Paco", genre: "飞行射击", color: "#704a37", description: "点燃喷气背包，在基地的竖井和通道间寻找补给。",
    guide: "左右移动，按住 B 喷射上升，松开下降。A 射击。",
    menu: "原版任务菜单用 SELECT 切换任务，按 START 出发。", startFrames: 410, taps: [[180,"START"],[320,"START"]] },
  { id: "cheril-perils", title: "谢丽尔历险记", genre: "机关跳台", color: "#6b3f65", description: "踩响共鸣器，趁敌人定住的瞬间跳到它们头上。",
    guide: "左右移动，A 跳跃。默认模式里先踩下共鸣器，再趁倒计时踩敌人。",
    menu: "原版标题画面可以选择共鸣器模式或简单模式，按 START 确认。", startFrames: 565, taps: [[180,"START"],[320,"START"],[480,"START"]] },
  { id: "dveelng", title: "地牢迷阵 D’Veel’Ng", genre: "迷宫射击", color: "#385c66", description: "在骷髅围墙之间穿行，搜集散落在地牢里的十件物品。",
    guide: "用方向键在迷宫内移动，面朝敌人按 A 射击。",
    menu: "原版标题画面按 START 进入。", startFrames: 565, taps: [[180,"START"],[320,"START"],[480,"START"]] }
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
  KeyW:"UP", KeyS:"DOWN", KeyA:"LEFT", KeyD:"RIGHT", KeyX:"A", KeyK:"A",
  KeyZ:"B", KeyJ:"B", ShiftLeft:"SELECT", ShiftRight:"SELECT", Enter:"START", NumpadEnter:"START" };
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
  const taps = new Map(game.taps);
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
  $("#menu").textContent = game.restartOnly ? "重新开局" : "原版菜单";
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
// Cancel the browser's long-press gesture on the controller, including the
// gaps between keys. Keep scrolling and text selection available elsewhere.
for (const pad of document.querySelectorAll(".controls, .menu-keys")) {
  for (const type of ["contextmenu", "selectstart", "dragstart"]) {
    pad.addEventListener(type, event => event.preventDefault(), true);
  }
  pad.addEventListener("touchstart", event => {
    event.preventDefault();
    if (!window.PointerEvent) {
      for (const touch of event.changedTouches) {
        const key = touch.target.closest("[data-key]")?.dataset.key;
        if (key) press(touch.identifier, key);
      }
    }
  }, { passive:false });
  if (!window.PointerEvent) {
    for (const type of ["touchend","touchcancel"]) {
      pad.addEventListener(type, event => {
        for (const touch of event.changedTouches) release(touch.identifier);
      });
    }
  }
}
for (const button of controls) {
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    press(event.pointerId, button.dataset.key);
  });
  for (const type of ["pointerup","pointercancel","lostpointercapture"])
    button.addEventListener(type, event => release(event.pointerId));
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


import { createGame, step, fire, dynamite, enterShop, buy, nextLevel } from "./engine.mjs";
import { drawMine } from "./art.mjs";

const el = id => document.getElementById(id);
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const panels = ["lobby", "working", "paused", "result", "shop"];
const fireButtons = [...document.querySelectorAll("[data-fire]")];
const bombButtons = [...document.querySelectorAll("[data-bomb]")];
const currency = value => "$" + Math.floor(value).toLocaleString("en-US");

let players = 1;
let online = false;
let room = null;
let roomGeneration = 0;
let shopSignature = "";
let game = createGame(players);
let view = "lobby";
let previousFrame = 0;
let lastHud = 0;
let soundEnabled = true;
let audio;
try { soundEnabled = localStorage.getItem("pet234:gold-miner:sound") !== "off"; } catch {}

function beep(from, to, duration, volume = .045) {
  if (!soundEnabled || !audio || audio.state !== "running") return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime;
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration);
}
function enableAudio() {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio ??= new Audio();
    if (audio.state !== "running") audio.resume().catch(() => {});
  } catch {}
}
function soundLabel() {
  el("sound").textContent = soundEnabled ? "声音开" : "声音关";
  el("sound").setAttribute("aria-pressed", String(soundEnabled));
}
function announce(text) { el("announcement").textContent = text; }
function hud() {
  el("money").textContent = currency(game.money);
  el("goal").textContent = currency(game.target);
  el("seconds").textContent = Math.max(0, Math.ceil(game.timeLeft)) + " 秒";
  el("seconds").classList.toggle("low", game.timeLeft <= 10 && view === "working");
  el("level").textContent = "第 " + game.level + " 关";
  el("level-name").textContent = game.levelName;
  el("progress").max = game.target;
  el("progress").value = Math.min(game.money, game.target);
  el("remaining").textContent = game.money >= game.target ? "已达标！剩余时间可以继续攒钱。" : "距离目标还差 " + currency(game.target - game.money);
  el("supplies").textContent = "本关已挖 " + currency(game.earned) + "　·　炸药 " + game.bombs + " 枚";
  for (const button of bombButtons) {
    const hook = game.hooks[Number(button.dataset.bomb)];
    button.disabled = view !== "working" || !game.bombs || !hook?.item || hook.state !== "retract";
  }
}
function hint() {
  el("key-hint").textContent = online
    ? "↓ 或空格放自己的钩，↑ 用炸药。手机点矿场或下方按钮。任意一方都能暂停。"
    : players === 1
    ? "↓ 或空格放钩，↑ 用炸药。手机点矿场或「放钩」按钮。"
    : "红衣 1P 用 S 放钩、W 用炸药；蓝衣 2P 用 ↓ 放钩、↑ 用炸药。手机分别点左右两组按钮。";
}
function show(panel) {
  view = panel;
  panels.forEach(id => { el(id).hidden = id !== panel; });
  el("controls").hidden = panel !== "working";
  el("station-one").hidden = online && room?.seat === 1;
  el("station-two").hidden = players !== 2 || (online && room?.seat !== 1);
  el("pause").disabled = !["working", "paused"].includes(panel);
  el("pause").textContent = panel === "paused" ? "继续" : "暂停";
  el("hint-area").hidden = panel === "shop" || (online && panel === "lobby");
  el("quit").hidden = el("back").hidden = online;
  hud();
  drawMine(ctx, game);
}
function closeRoom() {
  roomGeneration++;
  const old = room;
  room = null;
  old?.close();
  shopSignature = "";
  el("room-panel").hidden = el("manual-copy").hidden = el("invitation").hidden = true;
  el("copy-room").textContent = "复制邀请链接";
  el("room-code").textContent = "";
}
function choose(count, useNetwork = false) {
  closeRoom();
  online = useNetwork;
  players = count;
  game = createGame(count);
  el("solo").setAttribute("aria-pressed", String(count === 1));
  el("duo").setAttribute("aria-pressed", String(count === 2 && !online));
  el("online").setAttribute("aria-pressed", String(online));
  el("room-setup").hidden = !online;
  el("room-error").hidden = true;
  el("begin").hidden = online;
  el("shop-note").textContent = "道具从现款中扣除。";
  el("next").hidden = false;
  el("brief").textContent = online
    ? "两台设备各控一名矿工，共用收入、炸药和倒计时。好友加入后就开挖。"
    : count === 1
    ? "在 60 秒内攒够 " + currency(game.target) + "。金块越大，拉回地面越慢。"
    : "两人各控一根钩子，在同一片矿区合作。60 秒内共同攒够 " + currency(game.target) + "。";
  hint();
  show("lobby");
}
function showRoomError(message) {
  el("room-error").textContent = message;
  el("room-error").hidden = false;
}
function syncRoomView(state, paused) {
  if (!room || !state) return;
  game = state;
  const panel = state.phase === "playing" ? (paused ? "paused" : "working")
    : state.phase === "shop" ? "shop" : "result";
  if (panel === "shop") {
    const signature = JSON.stringify([game.level, game.money, game.stock]);
    if (view !== panel || signature !== shopSignature) {
      shopSignature = signature;
      el("shop-note").textContent = room.host ? "从两人的现款购买补给，然后前往下一关。" : "房主正在挑选补给，两人会一起进入下一关。";
      el("next").hidden = !room.host;
      renderStock();
      hud();
    }
  }
  if (view === panel) return;
  if (panel === "result") { finish(); return; }
  show(panel);
  if (panel === "working") {
    previousFrame = performance.now();
    canvas.focus({preventScroll:true});
    announce("第 " + game.level + " 关，双人合作挖矿");
  }
}
function roomStatus(status, detail, host) {
  if (status === "closed" || status === "error") {
    choose(2, true);
    showRoomError(detail || "联机已结束。可以重新创建或加入房间。");
    return;
  }
  el("room-status").textContent = detail || (status === "paired" ? "两位矿工已到齐。" : "正在连接房间…");
  if (status === "waiting" && host) el("invitation").hidden = false;
  if (status === "paired") el("invitation").hidden = true;
}
async function connectRoom(host) {
  const entered = el("room-input").value.normalize("NFKC").trim().replace(/^R/i, "");
  if (!host && !/^\d{6}$/.test(entered)) {
    showRoomError("请输入好友发来的 6 位房间号。");
    el("room-input").focus();
    return;
  }
  closeRoom();
  const generation = roomGeneration;
  enableAudio();
  el("room-error").hidden = el("room-setup").hidden = true;
  el("room-panel").hidden = false;
  el("room-seat").textContent = host ? "1P 红衣矿工 · 房主" : "2P 蓝衣矿工 · 队友";
  el("room-status").textContent = "正在连接房间…";
  try {
    const { openMinerRoom } = await import("./network.mjs");
    if (generation !== roomGeneration) return;
    room = openMinerRoom({
      host, code: host ? undefined : entered,
      onStatus(status, detail) {
        queueMicrotask(() => { if (generation === roomGeneration) roomStatus(status, detail, host); });
      },
      onState(state, paused) {
        if (generation === roomGeneration) syncRoomView(state, paused);
      }
    });
    const digits = room.code.replace(/^R/i, "");
    el("room-code").textContent = digits;
    const url = new URL(location.href);
    url.searchParams.set("room", digits);
    el("invite-url").value = url.href;
  } catch {
    if (generation === roomGeneration) roomStatus("error", "联机连接失败，请检查网络后再试。", host);
  }
}
function start() {
  enableAudio();
  game = createGame(players);
  previousFrame = performance.now();
  show("working");
  canvas.focus({preventScroll:true});
  announce("第 1 关开始，目标 " + currency(game.target));
  el("mine").scrollIntoView({block:"nearest"});
}
function operate(index, isBomb) {
  if (view !== "working" || index >= players) return;
  const acted = online ? room?.act(isBomb ? "bomb" : "fire") : isBomb ? dynamite(game, index) : fire(game, index);
  if (acted) {
    if (isBomb) beep(125, 28, .26, .10);
    else beep(330, 150, .075);
    hud();
  }
}
function pause() {
  if (view !== "working") return;
  if (online) { room?.act("pause"); return; }
  show("paused");
  el("resume").focus({preventScroll:true});
}
function resume() {
  if (view !== "paused") return;
  enableAudio();
  if (online) { room?.act("resume"); return; }
  previousFrame = performance.now();
  show("working");
  canvas.focus({preventScroll:true});
}
function finish() {
  const cleared = game.phase === "cleared";
  el("result-title").textContent = cleared ? "本关达标！" : "时间到了";
  el("result-copy").textContent = cleared
    ? "已攒下 " + currency(game.money) + "。去商店补给后，可以带着余款继续挖矿。"
    : "最终金额 " + currency(game.money) + "，离本关目标还差 " + currency(Math.max(0, game.target - game.money)) + "。";
  const guest = online && !room?.host;
  if (guest) el("result-copy").textContent += cleared ? " 等待房主进入商店。" : " 等待房主再开一局。";
  el("to-shop").hidden = !cleared || guest;
  el("restart").hidden = cleared || guest;
  show("result");
  announce(el("result-title").textContent);
  if (!guest) (cleared ? el("to-shop") : el("restart")).focus({preventScroll:true});
  if (cleared) beep(440, 880, .3);
}
function renderStock() {
  const board = el("shelves");
  board.replaceChildren();
  for (const item of game.stock) {
    const button = document.createElement("button");
    button.className = "ware";
    button.dataset.item = item.id;
    button.disabled = (online && !room?.host) || item.sold || game.money < item.price;
    const name = document.createElement("span");
    name.textContent = item.name;
    const price = document.createElement("strong");
    price.textContent = item.sold ? "已购" : currency(item.price);
    const note = document.createElement("small");
    note.textContent = item.description;
    button.append(name, price, note);
    button.onclick = () => {
      if (online) { room?.act("buy", item.id); return; }
      if (view === "shop" && buy(game, item.id)) {
        beep(660, 990, .11);
        renderStock();
        hud();
        announce("已购买" + item.name + "，余额 " + currency(game.money));
      }
    };
    board.append(button);
  }
}
function tick(now) {
  const delta = Math.max(0, (now - previousFrame) / 1000);
  const before = game.money;
  if (room) {
    room.tick(delta);
    if (room?.game) game = room.game;
  }
  if (view === "working") {
    if (!online) step(game, delta);
    if (game.money > before) beep(620, 1040, .14);
    if (!online && game.phase !== "playing") finish();
    else {
      drawMine(ctx, game);
      if (now - lastHud >= 100) { hud(); lastHud = now; }
    }
  }
  previousFrame = now;
  requestAnimationFrame(tick);
}
function touchButton(button, handler) {
  button.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    if (!button.disabled) handler();
  });
  button.addEventListener("click", event => { if (event.detail === 0) handler(); });
}
fireButtons.forEach(button => touchButton(button, () => operate(Number(button.dataset.fire), false)));
bombButtons.forEach(button => touchButton(button, () => operate(Number(button.dataset.bomb), true)));
canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0 || view !== "working") return;
  event.preventDefault();
  const box = canvas.getBoundingClientRect();
  operate(players === 2 && event.clientX >= box.left + box.width / 2 ? 1 : 0, false);
});
for (const node of [el("mine"), el("controls")]) {
  for (const type of ["contextmenu", "selectstart", "dragstart"]) node.addEventListener(type, event => event.preventDefault());
  node.addEventListener("touchstart", event => event.preventDefault(), {passive:false});
}
const keys = {KeyS:[0,false], KeyW:[0,true], ArrowDown:[1,false], ArrowUp:[1,true], Space:[0,false]};
document.addEventListener("keydown", event => {
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  if (event.code === "Escape" || event.code === "KeyP") {
    if (!event.repeat && (view === "working" || view === "paused")) {
      event.preventDefault();
      view === "working" ? pause() : resume();
    }
    return;
  }
  if (view !== "working" || !Object.hasOwn(keys,event.code)) return;
  if (event.code === "Space" && document.activeElement?.matches("button")) return;
  event.preventDefault();
  if (event.repeat) return;
  const [index, bomb] = keys[event.code];
  operate(players === 1 ? 0 : index, bomb);
});
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
window.addEventListener("blur", () => { if (!online) pause(); });
window.addEventListener("pagehide", () => { if (online) choose(2, true); });
el("solo").onclick = () => choose(1);
el("duo").onclick = () => choose(2);
el("online").onclick = () => { if (!online) choose(2, true); };
el("create-room").onclick = () => connectRoom(true);
el("join-form").onsubmit = event => { event.preventDefault(); connectRoom(false); };
el("leave-room").onclick = () => choose(2, true);
el("copy-room").onclick = async () => {
  const generation = roomGeneration;
  try {
    await navigator.clipboard.writeText(el("invite-url").value);
    if (generation === roomGeneration) el("copy-room").textContent = "已复制邀请链接";
  } catch {
    if (generation !== roomGeneration) return;
    el("manual-copy").hidden = false;
    el("invite-url").select();
  }
};
el("begin").onclick = start;
el("pause").onclick = () => view === "paused" ? resume() : pause();
el("resume").onclick = resume;
el("quit").onclick = el("back").onclick = () => choose(players);
el("restart").onclick = () => { if (online) room?.act("restart"); else start(); };
el("to-shop").onclick = () => {
  if (online) { room?.act("shop"); return; }
  if (view !== "result" || !enterShop(game)) return;
  renderStock();
  show("shop");
};
el("next").onclick = () => {
  if (online) { room?.act("next"); return; }
  if (view !== "shop" || !nextLevel(game)) return;
  previousFrame = performance.now();
  show("working");
  canvas.focus({preventScroll:true});
  announce("第 " + game.level + " 关开始");
};
el("sound").onclick = () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) enableAudio();
  try { localStorage.setItem("pet234:gold-miner:sound", soundEnabled ? "on" : "off"); } catch {}
  soundLabel();
};
soundLabel();
const invitation = new URLSearchParams(location.search).get("room")?.normalize("NFKC").replace(/^R/i, "");
if (!el("online").hidden && invitation && /^\d{6}$/.test(invitation)) {
  choose(2, true);
  el("room-input").value = invitation;
} else choose(1);
requestAnimationFrame(tick);

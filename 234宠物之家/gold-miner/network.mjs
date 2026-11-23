import { createGame, step, fire, dynamite, enterShop, buy, nextLevel } from "./engine.mjs";

const RULES = "234-gold-miner-v1-";
const SNAP_INTERVAL = 0.16;
const guestActions = ["fire", "bomb", "pause", "resume"];
const phases = ["playing", "cleared", "lost", "shop"];
const kinds = ["gold", "rock", "diamond", "bag", "mole", "tnt"];
const products = ["strength", "luck", "book", "polish", "bomb"];
const count = n => Number.isSafeInteger(n) && n >= 0;
const bounded = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const shortText = (s, limit) => typeof s === "string" && s.length <= limit;
const xy = o => o && bounded(o.x, -100, 900) && bounded(o.y, -100, 620);

const roomErrors = {
  "peer-unavailable": "房间不存在或已结束，请核对房间码。",
  "room-full": "这个房间已有两位矿工。",
  "unavailable-id": "这个房间码已被使用，请重新创建房间。",
  "rules-version": "两边的游戏版本不同，请刷新页面再开房。",
  "room-expired": "房间等待时间已到，请重新开房。",
  "rate-limited": "房间操作过于频繁，请稍后重试。",
  "server-busy": "房间服务暂时繁忙，请稍后重试。"
};

function encodeGame(g) {
  // Remove runtime-only state and send each caught item just once. The relay
  // serializes immediately; the receiver restores the hook/item references.
  const { random, purchases, ...view } = g;
  return { ...view, hooks:g.hooks.map(h => ({ ...h, item:h.item?.id ?? null })) };
}

function decodeGame(g) {
  if (!g || g.players !== 2 || !phases.includes(g.phase) || !count(g.level) || g.level < 1 ||
      !shortText(g.levelName, 40) || ![g.money, g.target, g.bombs, g.earned].every(count) ||
      !bounded(g.timeLeft, 0, 60) || !bounded(g.elapsed, 0, 60.01) ||
      !Array.isArray(g.items) || g.items.length > 32 || !Array.isArray(g.hooks) || g.hooks.length !== 2 ||
      !Array.isArray(g.stock) || g.stock.length > products.length || !Array.isArray(g.effects) || g.effects.length > 64) return null;

  const items = new Map();
  for (const it of g.items) {
    if (!xy(it) || !count(it.id) || items.has(it.id) || !kinds.includes(it.type) ||
        !["small", "medium", "large"].includes(it.size) || !bounded(it.r, 1, 50) || !count(it.value) ||
        ![null,0,1].includes(it.claimedBy) || ![-1,1].includes(it.face)) return null;
    items.set(it.id, it);
  }
  for (const [seat,h] of g.hooks.entries()) {
    if (!xy(h) || !bounded(h.tipX,-1,801) || !bounded(h.tipY,0,521) ||
        !bounded(h.angle,-1.5,1.5) || !bounded(h.length,0,900) || ![-1,1].includes(h.direction) ||
        !["aim","extend","retract"].includes(h.state)) return null;
    if (h.item !== null) {
      if (items.get(h.item)?.claimedBy !== seat) return null;
      h.item = items.get(h.item);
    }
  }
  for (const fx of g.effects) {
    if (!xy(fx) || !["cash","spark","blast"].includes(fx.type) || !shortText(fx.text,50) ||
        !bounded(fx.life,0,2) || !bounded(fx.maxLife,.01,2)) return null;
  }
  for (const p of g.stock) {
    if (!p || !products.includes(p.id) || !shortText(p.name,30) || !shortText(p.description,150) ||
        !count(p.price) || typeof p.sold !== "boolean") return null;
  }
  return g;
}

// Present interpolated hook and ore positions on the guest. Money, phase,
// claimed items and shop stock always come from a host snapshot.
function positions(g) {
  return {
    hooks:g.hooks.map(({angle,length}) => ({angle,length})),
    items:new Map(g.items.map(({id,x,y}) => [id,{x,y}]))
  };
}
function blend(g, from, to, fraction) {
  const lerp = (a,b) => a + (b-a)*fraction;
  g.hooks.forEach((h,i) => {
    h.angle = lerp(from.hooks[i].angle,to.hooks[i].angle);
    h.length = lerp(from.hooks[i].length,to.hooks[i].length);
    h.tipX = h.x + h.length*Math.sin(h.angle);
    h.tipY = h.y + h.length*Math.cos(h.angle);
  });
  for (const it of g.items) {
    const start = from.items.get(it.id), end = to.items.get(it.id);
    if (start) { it.x = lerp(start.x,end.x); it.y = lerp(start.y,end.y); }
  }
}

export function openMinerRoom({host, code, onStatus = () => {}, onState = () => {},
    peerFactory = globalThis.createGamePeer} = {}) {
  if (host && !code) code = globalThis.createRoomCode();
  code = String(code ?? "").normalize("NFKC").trim().toUpperCase().replace(/^R/, "");
  if (!/^\d{6}$/.test(code)) throw new Error("请输入六位数字房间码。");
  const peer = peerFactory("gold-miner", RULES, code, !!host);
  let link, ended = false, game = null, paused = false, paired = false;
  let epoch = 0, packetNumber = 0, commandNumber = 0;
  let sinceSend = 0, interpolation = null, connectionTimer;
  let rateStart = 0, actionCount = 0, pendingCommand = 0, pendingAt = 0;
  const seat = host ? 0 : 1;

  function end(status, message) {
    if (ended) return;
    ended = true;
    paired = false;
    clearTimeout(connectionTimer);
    peer.destroy();
    onStatus(status,message);
  }
  function timeout(ms, text) {
    clearTimeout(connectionTimer);
    connectionTimer = setTimeout(() => end("error",text), ms);
  }
  function transmit(packet) {
    try { link.send(packet); return true; }
    catch { end("closed","联机连接已中断，请重新开房。"); return false; }
  }
  function sendState() {
    sinceSend = 0;
    return transmit({t:"state", seq:++packetNumber, epoch, ack:commandNumber, paused, game:encodeGame(game)});
  }
  function notify() { onState(game,paused); }

  function apply(action, actor, option, angle) {
    if (!game || !paired) return false;
    if (action === "pause" || action === "resume") {
      if (game.phase !== "playing" || paused === (action === "pause")) return false;
      paused = action === "pause";
      epoch++;
      return true;
    }
    if (paused) return false;
    if (action === "fire") {
      if (!fire(game,actor)) return false;
      // Apply the angle that the guest actually saw. Constrain lag
      // compensation to a short portion of the host's current swing.
      const h = game.hooks[actor];
      if (actor === 1 && bounded(angle,-1.43,1.43) && Math.abs(angle-h.angle) <= .55) {
        h.angle = angle;
        h.tipX = h.x + h.length*Math.sin(angle);
        h.tipY = h.y + h.length*Math.cos(angle);
      }
      return true;
    }
    if (action === "bomb") return dynamite(game,actor);
    if (actor !== 0) return false;
    if (action === "buy") return buy(game,option);
    if (action === "shop" && enterShop(game)) { epoch++; return true; }
    if (action === "next" && nextLevel(game)) { epoch++; return true; }
    if (action === "restart" && game.phase === "lost") {
      game = createGame(2);
      epoch++;
      return true;
    }
    return false;
  }
  function receive(packet) {
    if (ended || !packet || !count(packet.seq) || !count(packet.epoch)) return;
    if (host) {
      if (!paired || packet.t !== "act" || packet.seq <= commandNumber || !guestActions.includes(packet.action)) return;
      const now = performance.now();
      if (now-rateStart >= 1000) { rateStart = now; actionCount = 0; }
      commandNumber = packet.seq;
      if (++actionCount > 16 || packet.epoch !== epoch) return;
      if (apply(packet.action,1,null,packet.angle)) { sendState(); notify(); }
      return;
    }
    if (packet.t !== "state" || packet.seq <= packetNumber || !count(packet.ack) || typeof packet.paused !== "boolean") return;
    const next = decodeGame(packet.game);
    if (!next) return end("error","对方的矿场数据无法读取，请刷新后重新开房。");
    const first = !paired;
    const smooth = game && epoch === packet.epoch && !packet.paused && next.phase === "playing";
    interpolation = smooth ? {from:positions(game), to:positions(next), time:0} : null;
    if (smooth) blend(next,interpolation.from,interpolation.to,0);
    game = next;
    packetNumber = packet.seq;
    epoch = packet.epoch;
    paused = packet.paused;
    if (packet.ack >= pendingCommand) pendingCommand = 0;
    paired = true;
    if (first) {
      clearTimeout(connectionTimer);
      onStatus("paired","已连接，你负责蓝衣矿工。");
    }
    notify();
  }
  function bind(channel) {
    if (ended || link) return;
    link = channel;
    channel.on("data", receive);
    channel.on("close", () => end("closed","队友已离开或网络连接已中断，可以重新开房。"));
    channel.on("error", () => end("error","联机连接中断，请重新开房。"));
    channel.on("open", () => {
      if (ended) return;
      if (host) {
        clearTimeout(connectionTimer);
        game = createGame(2);
        paired = true;
        onStatus("paired","队友已加入，你负责红衣矿工。");
        sendState();
        notify();
      } else timeout(12000,"等待矿场同步超时，请重新加入。");
    });
  }
  peer.on("error", err => end("error",roomErrors[err?.type] || "无法连接房间，请检查网络后重试。"));
  if (host) peer.on("connection",bind);
  peer.on("open", () => {
    if (ended) return;
    if (host) {
      clearTimeout(connectionTimer);
      onStatus("waiting","房间已创建，等待队友加入。");
    } else {
      onStatus("waiting","已找到房间，正在连接房主。");
      bind(peer.connect(RULES+code,{reliable:true}));
    }
  });
  timeout(20000,"连接房间超时，请检查网络后重试。");
  queueMicrotask(() => { if (!ended && !paired && !link) onStatus("connecting","正在连接房间…"); });

  return {
    code, host:!!host, seat,
    get game() { return game; }, get paired() { return paired; }, get paused() { return paused; },
    close() { end("closed","已退出房间。"); },
    act(action, option) {
      if (!paired || ended) return false;
      if (host) {
        if (!apply(action,0,option)) return false;
        sendState();
        notify();
        return true;
      }
      if (!guestActions.includes(action) || game.phase !== "playing") return false;
      if ((action === "resume") !== paused) return false;
      const h = game.hooks[1];
      if (action === "fire" && h.state !== "aim") return false;
      if (action === "bomb" && (!game.bombs || !h.item || h.state !== "retract")) return false;
      const now = performance.now();
      if (pendingCommand && now-pendingAt < 180 && action !== "pause") return false;
      pendingAt = now;
      pendingCommand = ++commandNumber;
      return transmit({t:"act",seq:commandNumber,epoch,action,angle:h.angle});
    },
    tick(seconds) {
      if (ended || !paired || paused || game.phase !== "playing" || !Number.isFinite(seconds) || seconds <= 0) return;
      if (host) {
        step(game,seconds);
        sinceSend += seconds;
        if (game.phase !== "playing") { epoch++; sendState(); notify(); }
        else if (sinceSend >= SNAP_INTERVAL) sendState();
      } else if (interpolation) {
        interpolation.time += seconds;
        blend(game,interpolation.from,interpolation.to,Math.min(1,interpolation.time/SNAP_INTERVAL));
      }
    }
  };
}

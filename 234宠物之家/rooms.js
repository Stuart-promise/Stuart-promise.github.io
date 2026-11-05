"use strict";

const byId = id => document.getElementById(id);
const chessRoom = document.body.dataset.game === "xiangqi";
const gameName = chessRoom ? "xiangqi" : "gomoku";
const firstColor = chessRoom ? "红" : "黑";
const secondColor = chessRoom ? "黑" : "白";
const seatingNote = `房主执${firstColor}，好友执${secondColor}。`;
const validCode = code => /^[0-9]{6}$/.test(code);
const note = message => { byId("room-note").textContent = message; };
const room = {
  phase: "idle", code: "", color: "", token: "", round: 1,
  mineAgain: false, theirAgain: false, pending: false, version: -1,
  timer: null, session: 0, controller: null
};
const server = window.ROOM_SERVER;
const storageKey = "pet234-" + gameName + "-room";

function refreshLobby() {
  const busy = room.phase !== "idle";
  byId("entry").hidden = localMode || busy;
  byId("room-tools").hidden = !busy;
  byId("switch-mode").hidden = busy;
  byId("switch-mode").textContent = localMode ? "切换为在线" : "切换为同屏";
  byId("mode-badge").textContent = localMode ? "双人同屏" : "在线双人";
  byId("invite").hidden = !["waiting", "playing"].includes(room.phase);
  byId("leave").textContent = room.phase === "closed" ? "返回大厅" : "退出房间";
  byId("code-display").textContent = room.code ? `房间 ${room.code}` : "";
  render();
}

function rememberRoom() {
  try {
    if (room.phase === "idle" || room.phase === "closed") sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, JSON.stringify({code: room.code, token: room.token}));
  } catch { /* Private browsing can disable storage. The current game still works. */ }
}

function stopRoom(phase, message) {
  room.session++;
  room.controller?.abort();
  clearTimeout(room.timer);
  room.pending = false;
  room.phase = phase;
  if (phase === "idle") {
    room.code = room.color = room.token = "";
    room.version = -1;
    clearBoard();
  }
  rememberRoom();
  note(message);
  refreshLobby();
}

async function requestState(message, session) {
  const controller = new AbortController();
  room.controller = controller;
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${server}/v1/rooms/${gameName}/${room.code}`, {
      method: message ? "POST" : "GET",
      headers: {"Authorization": "Bearer " + room.token, ...(message ? {"Content-Type": "application/json"} : {})},
      body: message ? JSON.stringify(message) : undefined,
      cache: "no-store",
      signal: controller.signal
    });
    const state = await response.json();
    if (!response.ok) {
      const error = new Error(state.error || "房间服务暂时不可用");
      error.status = response.status;
      throw error;
    }
    if (session !== room.session) return;
    return state;
  } finally {
    clearTimeout(timeout);
    if (room.controller === controller) room.controller = null;
  }
}

function applySnapshot(state) {
  if (!state || state.version < room.version) return;
  room.color = state.seat === 0 ? firstColor : secondColor;
  room.phase = state.phase;
  const changedRound = state.round !== room.round;
  room.round = state.round;
  room.mineAgain = state.votes[state.seat];
  room.theirAgain = state.votes[1 - state.seat];
  // A reload or reconnect rebuilds from the server's ordered move log.
  const localMoves = chessRoom ? moves.map(move => ({from: move.from, to: move.to})) : moves;
  const mismatch = localMoves.length > state.moves.length ||
    localMoves.some((move, i) => JSON.stringify(move) !== JSON.stringify(state.moves[i]));
  if (changedRound || mismatch) clearBoard();
  for (let i = moves.length; i < state.moves.length; i++) {
    const move = state.moves[i];
    if (!legalMove(move)) {
      stopRoom("closed", "收到不合法的棋步，已结束房间。请重新开房。");
      return;
    }
    place(move);
  }
  room.version = state.version;
  rememberRoom();
  if (room.phase === "closed") {
    stopRoom("closed", "房间已关闭，请返回大厅重新开房。");
    return;
  }
  note(room.phase === "waiting"
    ? "等待好友加入。分享邀请码或邀请链接，好友入座即可开局。"
    : `双方已就位，你执${room.color}棋。刷新页面后可恢复本局。`);
  refreshLobby();
}

function schedulePoll(delay = 1200) {
  clearTimeout(room.timer);
  if (room.phase === "idle" || room.phase === "closed") return;
  room.timer = setTimeout(poll, delay);
}

async function poll() {
  if (room.pending) return schedulePoll();
  const session = room.session;
  try {
    const state = await requestState(null, session);
    if (session === room.session) applySnapshot(state);
  } catch (error) {
    if (session !== room.session) return;
    if ([401, 404, 410].includes(error.status)) {
      stopRoom("closed", error.message);
      return;
    }
    room.phase = "connecting";
    note("网络暂时断开，正在自动重连并恢复棋盘…");
    refreshLobby();
  }
  if (session === room.session) schedulePoll();
}

async function command(message) {
  if (room.pending) return;
  const session = room.session;
  clearTimeout(room.timer);
  room.pending = true;
  render();
  try {
    let state;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        state = await requestState(message, session);
        break;
      } catch (error) {
        if (session !== room.session) return;
        if (error.status || attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 700));
      }
    }
    if (session === room.session) applySnapshot(state);
  } catch (error) {
    if (session !== room.session) return;
    if (["create", "join"].includes(message.action) || [401, 404, 410].includes(error.status)) {
      stopRoom("closed", error.status ? error.message : "暂时无法访问房间服务，请稍后重试。");
    } else {
      note(error.status ? error.message : "同步暂时中断，正在恢复棋盘…");
      room.phase = "connecting";
    }
  } finally {
    if (session === room.session) {
      room.pending = false;
      refreshLobby();
      schedulePoll();
    }
  }
}

function sendMove(i) {
  if (room.phase === "playing" && !room.pending && room.color === nextColor()) {
    void command({action: "move", round: room.round, ply: moves.length, i});
  }
  // The server confirms the move before either browser adds it to the board.
  return false;
}

function voteAgain() {
  if (room.phase === "playing" && !room.pending && moves.length && !room.mineAgain) {
    void command({action: "again", round: room.round});
  }
}

function openRoom(host, code) {
  if (room.phase !== "idle" || localMode) return;
  if (!server) { note("房间服务尚未配置，请稍后重试。"); return; }
  room.session++;
  room.code = code;
  room.token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
  room.color = host ? firstColor : secondColor;
  room.round = 1;
  room.version = -1;
  room.mineAgain = room.theirAgain = false;
  room.phase = "connecting";
  clearBoard();
  note(host ? "正在创建房间…" : "正在加入房间…");
  refreshLobby();
  void command({action: host ? "create" : "join"});
}

async function leaveRoom() {
  if (room.phase !== "idle" && room.phase !== "closed") {
    try { await requestState({action: "leave"}, room.session); } catch { /* Leaving locally must remain possible while offline. */ }
  }
  stopRoom("idle", "已返回大厅，可以创建或加入新的房间。");
}

byId("create").onclick = () => {
  openRoom(true, String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0"));
};
byId("join-form").onsubmit = event => {
  event.preventDefault();
  const code = byId("room-code").value.trim();
  if (validCode(code)) openRoom(false, code);
};
byId("invite").onclick = async () => {
  const url = new URL(location.pathname, location.href);
  url.searchParams.set("room", room.code);
  url.searchParams.set("v", "cloud1");
  try {
    await navigator.clipboard.writeText(url.href);
    note("邀请链接已复制，可以发给好友了。");
  } catch {
    window.prompt("复制以下邀请链接发给好友", url.href);
  }
};
byId("leave").onclick = async () => {
  if (room.phase === "playing" && !window.confirm("退出将结束这间房的对局，确定退出？")) return;
  await leaveRoom();
};
byId("switch-mode").onclick = () => {
  if (localMode && moves.length && !window.confirm("结束同屏对局，切换为在线模式？")) return;
  localMode = !localMode;
  clearBoard();
  note(localMode ? "同屏模式：两人在这台设备上轮流落子。" : seatingNote);
  refreshLobby();
};
document.querySelectorAll("[data-home]").forEach(link => {
  link.addEventListener("click", async event => {
    if (room.phase === "idle") {
      if (localMode && moves.length && !window.confirm("结束当前对局，返回游戏主界面？")) event.preventDefault();
      return;
    }
    event.preventDefault();
    if (room.phase === "playing" && !window.confirm("结束当前对局，返回游戏主界面？")) return;
    await leaveRoom();
    location.href = link.href;
  });
});

const invitedCode = new URLSearchParams(location.search).get("room");
if (validCode(invitedCode)) {
  byId("room-code").value = invitedCode;
  note("好友邀请你对战，点击「加入房间」即可入座。");
}
refreshLobby();
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved && validCode(saved.code) && /^[a-f0-9]{64}$/.test(saved.token) && (!validCode(invitedCode) || invitedCode === saved.code)) {
    room.code = saved.code;
    room.token = saved.token;
    room.phase = "connecting";
    note("正在恢复上次的房间…");
    refreshLobby();
    void poll();
  }
} catch { /* An expired or unavailable browser session starts in the lobby. */ }

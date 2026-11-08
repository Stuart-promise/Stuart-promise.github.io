"use strict";

const byId = id => document.getElementById(id);
const room = {
  phase: "idle", code: "", color: "", peer: null, link: null, timer: null,
  round: 1, mineAgain: false, theirAgain: false
};
const chessRoom = document.body.dataset.game === "xiangqi";
const checkersRoom = document.body.dataset.game === "checkers";
const prefix = checkersRoom ? "234-pet-checkers-v3-" : chessRoom ? "234-pet-xiangqi-v1-" : "234-pet-gomoku-19-v2-";
const firstColor = chessRoom || checkersRoom ? "红" : "黑";
const secondColor = checkersRoom ? "蓝" : chessRoom ? "黑" : "白";
const seatingNote = `房主执${firstColor}，好友执${secondColor}。`;
const validCode = code => /^R?[0-9]{6}$/.test(code);
const note = message => { byId("room-note").textContent = message; };

function refreshLobby() {
  const busy = room.phase !== "idle";
  byId("computer-form").hidden = busy;
  byId("entry").hidden = localMode || busy;
  byId("room-tools").hidden = !busy;
  byId("switch-mode").hidden = busy || !!cpu.level;
  byId("switch-mode").textContent = localMode ? "切换为在线" : "切换为同屏";
  byId("mode-badge").textContent = cpu.level ? "人机 · "+cpu.label : localMode ? "双人同屏" : "在线双人";
  byId("invite").hidden = room.phase !== "waiting";
  byId("leave").textContent = room.phase === "closed" ? "返回大厅" : "退出房间";
  byId("code-display").textContent = room.code ? `房间 ${room.code}` : "";
  render();
}

function stopRoom(phase, message) {
  const peer = room.peer;
  room.phase = phase;
  room.peer = room.link = null;
  clearTimeout(room.timer);
  peer?.destroy();
  if (phase === "idle") {
    room.code = room.color = "";
    clearBoard();
  }
  note(message);
  refreshLobby();
}

function deadline(message) {
  clearTimeout(room.timer);
  room.timer = setTimeout(() => stopRoom("closed", message), 25000);
}

function transmit(data) {
  if (!room.link?.open) return false;
  try {
    room.link.send(data);
    return true;
  } catch {
    stopRoom("closed", "连接已断开。请返回大厅重新开房。");
    return false;
  }
}

function sendMove(i) {
  if (room.phase !== "playing" || room.color !== nextColor()) return false;
  return transmit({type: "move", round: room.round, ply: moves.length, i});
}

function newRoundIfAgreed() {
  if (room.mineAgain && room.theirAgain) {
    room.round++;
    room.mineAgain = room.theirAgain = false;
    clearBoard();
    note(`新一局开始，你执${room.color}棋。`);
  }
  render();
}

function voteAgain() {
  if (room.phase !== "playing" || !moves.length || room.mineAgain) return;
  if (transmit({type: "again", round: room.round})) {
    room.mineAgain = true;
    newRoundIfAgreed();
  }
}

function beginPlay() {
  clearTimeout(room.timer);
  room.phase = "playing";
  note(`对手已入座，你执${room.color}棋。对局期间请保持页面打开。`);
  refreshLobby();
}

function receive(data) {
  if (!data || typeof data !== "object") return;
  if (data.type === "full" && room.phase === "connecting") return stopRoom("closed", "房间已经坐满，请换一个房间。");
  if (data.type === "start" && room.color === secondColor && room.phase === "connecting") return beginPlay();
  if (data.type === "leave") return stopRoom("closed", "对方已退出，房间已关闭。");
  if (room.phase !== "playing" || data.round !== room.round) return;
  if (data.type === "again" && moves.length) {
    room.theirAgain = true;
    newRoundIfAgreed();
  } else if (data.type === "move") {
    if (nextColor() === room.color || data.ply !== moves.length || !legalMove(data.i)) {
      stopRoom("closed", "双方棋盘状态不一致，请返回大厅重新开房。");
    } else {
      place(data.i);
    }
  }
}

function bindLink(link) {
  room.link = link;
  deadline("未能连接对方，请检查网络后重新加入。");
  link.on("open", () => {
    if (room.link !== link) return;
    if (room.color === firstColor && transmit({type: "start"})) beginPlay();
  });
  link.on("data", data => { if (room.link === link) receive(data); });
  const disconnected = () => {
    if (room.link === link) stopRoom("closed", "与对方的连接已断开，请返回大厅重新开房。");
  };
  link.on("close", disconnected);
  link.on("error", disconnected);
}

function openRoom(host, code) {
  if (room.phase !== "idle" || localMode) return;
  room.color = host ? firstColor : secondColor;
  room.code = code;
  room.round = 1;
  room.mineAgain = room.theirAgain = false;
  room.phase = "connecting";
  clearBoard();
  refreshLobby();
  note(host ? "正在创建房间…" : "正在连接房主…");
  deadline("连接超时，请检查网络后重试。");
  try {
    const peer = createGamePeer(document.body.dataset.game, prefix, code, host);
    room.peer = peer;
    peer.on("open", () => {
      if (room.peer !== peer) return;
      if (host) {
        clearTimeout(room.timer);
        room.phase = "waiting";
        note("等待好友加入。可以复制邀请链接，或把完整房间码发给好友。");
        refreshLobby();
      } else {
        bindLink(peer.connect(prefix + code, {reliable: true}));
      }
    });
    peer.on("connection", link => {
      if (room.peer !== peer || !host || room.link || room.phase !== "waiting") {
        link.on("open", () => { link.send({type: "full"}); setTimeout(() => link.close(), 500); });
        return;
      }
      bindLink(link);
    });
    peer.on("error", err => {
      if (room.peer !== peer || room.phase === "playing" && room.link?.open) return;
      const messages = {
        "rules-version": "双方的游戏版本不同，请双方刷新页面后重新开房。",
        "room-expired": "房间等待超过 20 分钟，请重新创建。",
        "server-busy": "房间服务暂时繁忙，请稍后重试。",
        "rate-limited": "连接过于频繁，请稍后重试。",
        "connection-timeout": "与服务器连接超时，请重新开房。",
        "room-full": "房间已经坐满，请换一个房间。",
        "relay-unreachable": "无法连接本站服务器，请稍后重试或使用备用直连房。",
        "peer-unavailable": "找不到这个房间，请核对邀请码，并确认房主仍在线。",
        "unavailable-id": "房间码已被占用，请返回大厅再创建一次。",
        "browser-incompatible": "当前浏览器不支持在线连接，请使用新版浏览器。"
      };
      stopRoom("closed", messages[err.type] || "无法建立在线连接，请检查网络或更换网络后重试。");
    });
    peer.on("disconnected", () => {
      if (room.peer === peer && room.phase !== "playing") stopRoom("closed", "房间服务已断开，请返回大厅重试。");
    });
  } catch {
    stopRoom("closed", "当前浏览器无法建立在线连接，请检查网络或更换浏览器。");
  }
}

byId("create").onclick = () => openRoom(true, createRoomCode(true));
byId("create-relay").onclick = () => openRoom(true, createRoomCode(false));
byId("join-form").onsubmit = event => {
  event.preventDefault();
  const code = byId("room-code").value.trim().toUpperCase();
  if (validCode(code)) openRoom(false, code);
};
byId("invite").onclick = async () => {
  const url = new URL(location.pathname, location.href);
  url.searchParams.set("room", room.code);
  url.searchParams.set("v", checkersRoom ? "duo3" : chessRoom ? "relay1" : "grid19");
  try {
    await navigator.clipboard.writeText(url.href);
    note("邀请链接已复制，可以发给好友了。");
  } catch {
    window.prompt("复制以下邀请链接发给好友", url.href);
  }
};
byId("leave").onclick = () => {
  if (room.phase === "playing" && !window.confirm("退出将结束这间房的对局，确定退出？")) return;
  if (room.link?.open) transmit({type: "leave"});
  stopRoom("idle", "已返回大厅，可以创建或加入新的房间。");
};
byId("switch-mode").onclick = () => {
  if (localMode && moves.length && !window.confirm("结束同屏对局，切换为在线模式？")) return;
  localMode = !localMode;
  clearBoard();
  note(localMode ? "同屏模式：两人在这台设备上轮流落子。" : seatingNote);
  refreshLobby();
};

const invitedCode = new URLSearchParams(location.search).get("room");
if (validCode(invitedCode)) {
  byId("room-code").value = invitedCode;
  note("好友邀请你对战，点击「加入房间」即可入座。");
}
if(cpu.level){
  byId("room-title").textContent="与电脑对弈";
  note("你执"+firstColor+"先手，电脑执"+secondColor+"。");
  window.addEventListener("pageshow",()=>render());
} else {
  byId("computer-form").addEventListener("submit",event=>{
    if(localMode && moves.length && !confirm("结束同屏对局，开始与电脑对弈？"))event.preventDefault();
  });
}
refreshLobby();

document.querySelectorAll("[data-home]").forEach(link => {
  link.addEventListener("click", event => {
    if ((room.phase === "playing" || localMode && moves.length) && !window.confirm("结束当前对局，返回游戏主界面？")) {
      event.preventDefault();
      return;
    }
    if (room.link?.open) transmit({type: "leave"});
    stopRoom("idle", "");
  });
});

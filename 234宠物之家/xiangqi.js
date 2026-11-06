"use strict";

const chess = new Xiangqi();
const board = document.getElementById("board");
const statusLine = document.getElementById("status");
const undo = document.getElementById("undo");
const restart = document.getElementById("restart");
const hint = document.getElementById("move-hint");
const points = [];
let moves = chess.history;
let localMode = !!cpu.level;
let selected = null;
let focusCell = 85;
const names = {rK: "帅", rA: "仕", rE: "相", rH: "马", rR: "车", rC: "炮", rP: "兵", bK: "将", bA: "士", bE: "象", bH: "马", bR: "车", bC: "炮", bP: "卒"};
const nextColor = () => chess.turn === "r" ? "红" : "黑";
const canPlay = () => (!cpu.level || chess.turn==="r") && !chess.result && (localMode || room.phase === "playing" && !room.pending && room.color === nextColor());

function drawGrid() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.classList.add("lattice");
  svg.setAttribute("viewBox", "0 0 90 100");
  svg.setAttribute("aria-hidden", "true");
  let lines = "";
  for (let r = 0; r < 10; r++) lines += `M5 ${5 + r * 10}H85 `;
  lines += "M5 5V95 M85 5V95 ";
  for (let c = 1; c < 8; c++) lines += `M${5 + c * 10} 5V45 M${5 + c * 10} 55V95 `;
  lines += "M35 5L55 25 M55 5L35 25 M35 75L55 95 M55 75L35 95";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", lines);
  path.setAttribute("stroke", "#815e39");
  path.setAttribute("stroke-width", ".3");
  path.setAttribute("fill", "none");
  svg.append(path);
  for (const [text, x] of [["楚 河", 25], ["汉 界", 65]]) {
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", 51.5);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "4");
    label.setAttribute("fill", "#6e4a2d");
    label.textContent = text;
    svg.append(label);
  }
  board.append(svg);
}

function render() {
  const online = !localMode;
  const ready = !online || room.phase === "playing";
  const active = canPlay();
  const checked = chess.inCheck(chess.turn);
  document.getElementById("count").textContent = moves.length;
  if (!ready) statusLine.textContent = room.phase === "closed" ? "房间已断开" : "等待双人就位";
  else if (chess.result) statusLine.textContent = chess.result.winner ? `${chess.result.winner === "r" ? "红" : "黑"}方获胜（${chess.result.reason}）` : `和棋 · ${chess.result.reason}`;
  else {
    const turn = online ? (active ? `轮到你走棋（${room.color}方）` : "等待对方走棋") : `轮到${nextColor()}方走棋`;
    statusLine.textContent = turn + (checked ? " · 将军！" : "");
  }
  if(cpu.level && !chess.result)statusLine.textContent=(active?"轮到你走红方":"电脑正在思考…")+(checked?" · 将军！":"");
  if (online && room.pending) statusLine.textContent = "正在同步棋步…";
  undo.hidden = online;
  undo.disabled = !moves.length;
  restart.disabled = online ? !ready || !moves.length || room.mineAgain || room.pending : !moves.length;
  restart.textContent = online ? (room.mineAgain ? "等待对方同意" : room.theirAgain ? "同意重新开局" : "申请重新开局") : "重新开局";
  const targets = selected === null ? [] : chess.targets(selected);
  const last = moves.at(-1);
  points.forEach((point, i) => {
    const piece = chess.board[i];
    const image = point.firstElementChild;
    image.hidden = !piece;
    if (piece) {
      const src = `./pieces/${piece}.svg`;
      if (image.getAttribute("src") !== src) image.setAttribute("src", src);
    }
    point.tabIndex = i === focusCell ? 0 : -1;
    point.classList.toggle("chosen", i === selected);
    point.classList.toggle("target", targets.includes(i));
    point.classList.toggle("last-move", i === last?.from || i === last?.to);
    point.classList.toggle("checked", checked && piece === chess.turn + "K");
    point.setAttribute("aria-pressed", String(i === selected));
    point.setAttribute("aria-disabled", String(!active));
    point.setAttribute("aria-label", `第${Math.floor(i / 9) + 1}行第${i % 9 + 1}列，${piece ? (piece[0] === "r" ? "红方" : "黑方") + names[piece] : "空位"}`);
  });
  cpu.boardTurn(!chess.result && chess.turn==="b",()=>({board:chess.board}),place,()=>{
    for(let from=0;from<90;from++){
      const to=chess.targets(from)[0];if(to!==undefined)return {from,to};
    }
  });
}

function legalMove(move) {
  return move && chess.legal(move.from, move.to);
}

function place(move) {
  chess.move(move.from, move.to);
  selected = null;
  focusCell = move.to;
  hint.textContent = "点击己方棋子查看可走位置。";
  render();
}

function choose(i) {
  if (!canPlay()) return;
  focusCell = i;
  if (chess.board[i]?.[0] === chess.turn) {
    selected = selected === i ? null : i;
    hint.textContent = selected === null ? "点击己方棋子查看可走位置。" : `已选择${names[chess.board[i]]}，点击标记的位置走棋。`;
    render();
    return;
  }
  const move = {from: selected, to: i};
  if (!legalMove(move)) {
    hint.textContent = "这一步不能走，请选择标记的位置。被将军时须先应将。";
    return;
  }
  if (!localMode && !sendMove(move)) return;
  place(move);
}

function clearBoard() {
  chess.reset();
  moves = chess.history;
  selected = null;
  focusCell = 85;
  hint.textContent = "点击己方棋子查看可走位置。";
  render();
}

drawGrid();
for (let i = 0; i < 90; i++) {
  const point = document.createElement("button");
  point.type = "button";
  point.className = "chess-point";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  point.append(image);
  point.addEventListener("click", () => choose(i));
  points.push(point);
  board.append(point);
}
const arrows = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
board.addEventListener("keydown", event => {
  if (event.key === "Escape") { selected = null; render(); return; }
  const step = arrows[event.key];
  if (!step) return;
  event.preventDefault();
  const i = points.indexOf(event.target);
  const r = Math.floor(i / 9) + step[0], c = i % 9 + step[1];
  if (i < 0 || r < 0 || r >= 10 || c < 0 || c >= 9) return;
  points[focusCell].tabIndex = -1;
  focusCell = r * 9 + c;
  points[focusCell].tabIndex = 0;
  points[focusCell].focus();
});
undo.onclick = () => {
  if (!localMode || !moves.length) return;
  do {chess.undo();} while(cpu.level && chess.turn==="b" && moves.length);
  selected = null;
  hint.textContent = "已撤回一步。";
  render();
};
restart.onclick = () => {
  if (!localMode) return voteAgain();
  if (moves.length && !chess.result && !window.confirm("结束当前对局，重新开局？")) return;
  clearBoard();
};

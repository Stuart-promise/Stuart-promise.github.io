"use strict";

const size = 15;
const board = document.querySelector("#board");
const statusLine = document.querySelector("#status");
const undo = document.querySelector("#undo");
const restart = document.querySelector("#restart");
const stones = Array(size * size).fill(null);
const moves = [];
const points = [];
let winningLine = [];
let localMode = false;
let selected = 7 * size + 7;
const inside = (row, col) => row >= 0 && col >= 0 && row < size && col < size;
const nextColor = () => moves.length % 2 === 0 ? "黑" : "白";

function drawGrid() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 150 150");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("lattice");
  const grid = document.createElementNS(ns, "path");
  let lines = "";
  for (let i = 0; i < size; i++) {
    const n = 5 + i * 10;
    lines += `M${n} 5V145 M5 ${n}H145 `;
  }
  grid.setAttribute("d", lines);
  grid.setAttribute("stroke", "#815e39");
  grid.setAttribute("stroke-width", ".35");
  svg.append(grid);
  for (const [x, y] of [[35, 35], [115, 35], [75, 75], [35, 115], [115, 115]]) {
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "1.1");
    dot.setAttribute("fill", "#694b2f");
    svg.append(dot);
  }
  board.append(svg);
}

function findWin(index) {
  const row = Math.floor(index / size);
  const col = index % size;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [index];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (inside(r, c) && stones[r * size + c] === stones[index]) {
        line.push(r * size + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

function render() {
  const won = winningLine.length > 0;
  const full = moves.length === stones.length;
  document.querySelector("#count").textContent = moves.length;
  statusLine.textContent = won ? `${stones[winningLine[0]]}棋获胜！` : full ? "和棋，本局结束" : `轮到${nextColor()}棋落子`;
  const online = !localMode;
  const ready = !online || room.phase === "playing";
  const myTurn = ready && !room.pending && (!online || nextColor() === room.color);
  if (online) {
    if (!ready) statusLine.textContent = room.phase === "closed" ? "房间已断开" : "等待双人就位";
    else if (!won && !full) statusLine.textContent = myTurn ? `轮到你落子（${room.color}棋）` : "等待对方落子";
  }
  if (online && room.pending) statusLine.textContent = "正在同步棋步…";
  undo.hidden = online;
  undo.disabled = !moves.length;
  restart.disabled = online ? !ready || !moves.length || room.mineAgain || room.pending : !moves.length;
  restart.textContent = online ? (room.mineAgain ? "等待对方同意" : room.theirAgain ? "同意重新开局" : "申请重新开局") : "重新开局";
  points.forEach((point, i) => {
    if (stones[i]) point.dataset.stone = stones[i];
    else delete point.dataset.stone;
    point.tabIndex = i === selected ? 0 : -1;
    point.classList.toggle("last", i === moves.at(-1));
    point.classList.toggle("win", winningLine.includes(i));
    point.setAttribute("aria-disabled", String(!myTurn || won || full || Boolean(stones[i])));
    point.setAttribute("aria-label", `第${Math.floor(i / size) + 1}行第${i % size + 1}列，${stones[i] ? stones[i] + "棋" : "空位"}`);
  });
}

function legalMove(i) {
  return Number.isInteger(i) && i >= 0 && i < stones.length && !stones[i] && !winningLine.length;
}

function play(i) {
  if (!legalMove(i)) return;
  if (!localMode && !sendMove(i)) return;
  place(i);
}

function place(i) {
  selected = i;
  stones[i] = nextColor();
  moves.push(i);
  winningLine = findWin(i);
  render();
}

drawGrid();
for (let i = 0; i < stones.length; i++) {
  const point = document.createElement("button");
  point.type = "button";
  point.className = "point";
  point.addEventListener("click", () => play(i));
  points.push(point);
  board.append(point);
}

const arrows = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
board.addEventListener("keydown", event => {
  const step = arrows[event.key];
  if (!step) return;
  event.preventDefault();
  const i = points.indexOf(event.target);
  const r = Math.floor(i / size) + step[0];
  const c = i % size + step[1];
  if (i < 0 || !inside(r, c)) return;
  points[selected].tabIndex = -1;
  selected = r * size + c;
  points[selected].tabIndex = 0;
  points[selected].focus();
});

undo.addEventListener("click", () => {
  if (!moves.length) return;
  selected = moves.pop();
  stones[selected] = null;
  winningLine = [];
  render();
});
restart.addEventListener("click", () => {
  if (!localMode) return voteAgain();
  if (moves.length && !winningLine.length && moves.length < stones.length && !window.confirm("结束当前对局，重新开局？")) return;
  clearBoard();
});

function clearBoard() {
  stones.fill(null);
  moves.length = 0;
  winningLine = [];
  selected = 7 * size + 7;
  render();
}

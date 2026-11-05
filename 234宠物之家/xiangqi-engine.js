"use strict";

class Xiangqi {
  constructor() { this.reset(); }

  reset() {
    this.board = Array(90).fill(null);
    const back = ["R", "H", "E", "A", "K", "A", "E", "H", "R"];
    for (let c = 0; c < 9; c++) {
      this.board[c] = "b" + back[c];
      this.board[81 + c] = "r" + back[c];
    }
    for (const c of [1, 7]) {
      this.board[18 + c] = "bC";
      this.board[63 + c] = "rC";
    }
    for (const c of [0, 2, 4, 6, 8]) {
      this.board[27 + c] = "bP";
      this.board[54 + c] = "rP";
    }
    this.turn = "r";
    this.history = [];
    this.result = null;
    this.positions = [this.key()];
  }

  key() { return this.turn + "|" + this.board.map(piece => piece || "--").join(""); }

  blockers(from, to) {
    const dr = Math.sign(Math.floor(to / 9) - Math.floor(from / 9));
    const dc = Math.sign(to % 9 - from % 9);
    const step = dr * 9 + dc;
    let count = 0;
    for (let i = from + step; i !== to; i += step) {
      if (this.board[i]) count++;
    }
    return count;
  }

  pattern(from, to) {
    const piece = this.board[from];
    const target = this.board[to];
    if (!piece || from === to || target?.[0] === piece[0]) return false;
    const side = piece[0];
    const r = Math.floor(from / 9), c = from % 9;
    const nr = Math.floor(to / 9), nc = to % 9;
    const dr = nr - r, dc = nc - c;
    const ar = Math.abs(dr), ac = Math.abs(dc);
    const straight = dr === 0 || dc === 0;
    const palace = nc >= 3 && nc <= 5 && (side === "r" ? nr >= 7 : nr <= 2);
    switch (piece[1]) {
      case "R":
        return straight && this.blockers(from, to) === 0;
      case "C":
        return straight && this.blockers(from, to) === (target ? 1 : 0);
      case "H":
        if (ar === 2 && ac === 1) return !this.board[from + Math.sign(dr) * 9];
        if (ar === 1 && ac === 2) return !this.board[from + Math.sign(dc)];
        return false;
      case "E":
        return ar === 2 && ac === 2 && (side === "r" ? nr >= 5 : nr <= 4) && !this.board[from + dr / 2 * 9 + dc / 2];
      case "A":
        return ar === 1 && ac === 1 && palace;
      case "K":
        if (target?.[1] === "K" && dc === 0) return this.blockers(from, to) === 0;
        return ar + ac === 1 && palace;
      case "P":
        return (dc === 0 && dr === (side === "r" ? -1 : 1)) ||
          (dr === 0 && ac === 1 && (side === "r" ? r <= 4 : r >= 5));
      default:
        return false;
    }
  }

  inCheck(side) {
    const king = this.board.indexOf(side + "K");
    if (king < 0) return true;
    return this.board.some((piece, i) => piece && piece[0] !== side && this.pattern(i, king));
  }

  legal(from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= 90 || to < 0 || to >= 90) return false;
    if (this.result || this.board[from]?.[0] !== this.turn || !this.pattern(from, to)) return false;
    const piece = this.board[from], captured = this.board[to];
    this.board[to] = piece;
    this.board[from] = null;
    const safe = !this.inCheck(this.turn);
    this.board[from] = piece;
    this.board[to] = captured;
    return safe;
  }

  targets(from) {
    const targets = [];
    for (let to = 0; to < 90; to++) {
      if (this.legal(from, to)) targets.push(to);
    }
    return targets;
  }

  hasMove() {
    return this.board.some((piece, from) => piece?.[0] === this.turn && this.targets(from).length > 0);
  }

  move(from, to) {
    if (!this.legal(from, to)) return false;
    this.history.push({from, to, piece: this.board[from], captured: this.board[to]});
    this.board[to] = this.board[from];
    this.board[from] = null;
    const mover = this.turn;
    this.turn = mover === "r" ? "b" : "r";
    this.positions.push(this.key());
    if (!this.hasMove()) {
      this.result = {winner: mover, reason: this.inCheck(this.turn) ? "将死" : "困毙"};
    } else if (this.positions.filter(key => key === this.key()).length >= 3) {
      this.result = {winner: null, reason: "三次重复局面"};
    }
    return true;
  }

  undo() {
    const last = this.history.pop();
    if (!last) return;
    this.board[last.from] = last.piece;
    this.board[last.to] = last.captured;
    this.turn = last.piece[0];
    this.result = null;
    this.positions.pop();
  }
}

"use strict";

class ChineseCheckers {
  constructor() {
    this.directions = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
    this.cells = new Map();
    for (let q=-4;q<=4;q++) for (let r=-4;r<=4;r++) {
      if (Math.abs(q+r)<=4) this.cells.set(q+","+r,{q,r,camp:-1});
    }
    this.camps = Array.from({length:6},()=>[]);
    for (let camp=0;camp<6;camp++) {
      for (let r=-8;r<=-5;r++) for (let q=-r-4;q<=4;q++) {
        let cq=q,cr=r;
        for(let rotation=0;rotation<camp;rotation++) [cq,cr]=[-cr,cq+cr];
        const key=cq+","+cr;
        this.cells.set(key,{q:cq,r:cr,camp});
        this.camps[camp].push(key);
      }
    }
    this.homes=[this.camps[3],this.camps[0]];
    this.goals=[this.camps[0],this.camps[3]];
    this.reset();
  }

  reset() {
    this.pieces={};
    this.homes.forEach((camp,seat)=>camp.forEach(key=>{this.pieces[key]=seat;}));
    this.turn=0;
    this.winner=null;
    this.history=[];
  }

  destinations(from) {
    const destinations=new Map();
    if(this.winner!==null || this.pieces[from]!==this.turn)return destinations;
    const goal=new Set(this.goals[this.turn]);
    const allowed=(current,to)=>this.cells.has(to) && !(to in this.pieces) && (!goal.has(current)||goal.has(to));
    const {q,r}=this.cells.get(from);
    for(const [dq,dr] of this.directions) {
      const to=(q+dq)+","+(r+dr);
      if(allowed(from,to))destinations.set(to,[from,to]);
    }
    // The moving marble vacates its original hole throughout a jump chain.
    const occupied=new Set(Object.keys(this.pieces));
    occupied.delete(from);
    const visited=new Set([from]);
    const queue=[[from]];
    for(let i=0;i<queue.length;i++) {
      const path=queue[i],current=path.at(-1);
      const cell=this.cells.get(current);
      for(const [dq,dr] of this.directions) {
        const over=(cell.q+dq)+","+(cell.r+dr);
        const to=(cell.q+2*dq)+","+(cell.r+2*dr);
        if(!occupied.has(over) || occupied.has(to) || !this.cells.has(to) || visited.has(to))continue;
        if(goal.has(current) && !goal.has(to))continue;
        visited.add(to);
        const next=[...path,to];
        destinations.set(to,next);
        queue.push(next);
      }
    }
    return destinations;
  }

  legal(move) {
    return !!move && typeof move.from==="string" && typeof move.to==="string" &&
      this.destinations(move.from).has(move.to);
  }

  move(move) {
    if(!this.legal(move))return false;
    const path=this.destinations(move.from).get(move.to);
    const seat=this.turn;
    delete this.pieces[move.from];
    this.pieces[move.to]=seat;
    this.history.push({from:move.from,to:move.to,path,seat});
    if(this.goals[seat].every(key=>this.pieces[key]===seat))this.winner=seat;
    else this.turn=1-seat;
    return true;
  }

  undo() {
    const last=this.history.pop();
    if(!last)return;
    delete this.pieces[last.to];
    this.pieces[last.from]=last.seat;
    this.turn=last.seat;
    this.winner=null;
  }
}

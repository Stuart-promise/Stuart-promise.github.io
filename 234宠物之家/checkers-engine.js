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
    this.blocked=false;
    this.skipped=[];
    this.history=[];
  }

  jumpLanding(cell, dq, dr, occupied) {
    const keyAt = distance => (cell.q + distance*dq) + "," + (cell.r + distance*dr);
    let distance = 1;
    while (this.cells.has(keyAt(distance)) && !occupied.has(keyAt(distance))) distance++;
    if (!this.cells.has(keyAt(distance))) return null;
    for (let step = distance+1; step <= 2*distance; step++) {
      const key = keyAt(step);
      if (!this.cells.has(key) || occupied.has(key)) return null;
    }
    return keyAt(2*distance);
  }

  destinations(from,seat=this.turn) {
    const destinations=new Map();
    if(this.winner!==null || this.blocked || this.pieces[from]!==seat)return destinations;
    const goal=new Set(this.goals[seat]);
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
        const to=this.jumpLanding(cell,dq,dr,occupied);
        if(!to || visited.has(to))continue;
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

  hasMove(seat) {
    return Object.keys(this.pieces).some(from=>this.pieces[from]===seat && this.destinations(from,seat).size>0);
  }

  move(move) {
    if(!this.legal(move))return false;
    const path=this.destinations(move.from).get(move.to);
    const seat=this.turn;
    delete this.pieces[move.from];
    this.pieces[move.to]=seat;
    this.skipped=[];
    if(this.goals[seat].every(key=>this.pieces[key]===seat))this.winner=seat;
    else {
      this.turn=1-seat;
      if(!this.hasMove(this.turn)) {
        this.skipped.push(this.turn);
        this.turn=seat;
        if(!this.hasMove(seat)) {
          this.skipped.push(seat);
          this.blocked=true;
        }
      }
    }
    this.history.push({from:move.from,to:move.to,path,seat,skipped:this.skipped.slice()});
    return true;
  }

  undo() {
    const last=this.history.pop();
    if(!last)return;
    delete this.pieces[last.to];
    this.pieces[last.from]=last.seat;
    this.turn=last.seat;
    this.winner=null;
    this.blocked=false;
    this.skipped=this.history.at(-1)?.skipped.slice()||[];
  }
}

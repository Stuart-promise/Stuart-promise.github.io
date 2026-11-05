"use strict";

class Animal2048 {
  constructor(saved) {
    this.board=Array(16).fill(0);
    this.score=0;this.won=false;this.continued=false;this.changed=[];
    if(Animal2048.valid(saved)){
      this.board=saved.board.slice();this.score=saved.score;
      this.won=this.board.some(n=>n>=11)||saved.won===true;
      this.continued=saved.continued===true;
    }else{this.spawn();this.spawn();}
  }
  static valid(state) {
    return !!state && Array.isArray(state.board)&&state.board.length===16 &&
      state.board.every(n=>Number.isInteger(n)&&n>=0&&n<=32) &&
      state.board.some(Boolean)&&Number.isSafeInteger(state.score)&&state.score>=0;
  }
  spawn() {
    const empty=this.board.flatMap((n,i)=>n?[]:[i]);
    if(!empty.length)return;
    const i=empty[Math.floor(Math.random()*empty.length)];
    this.board[i]=Math.random()<.9?1:2;
    this.changed.push(i);
  }
  move(direction,spawn=true) {
    if(!["left","right","up","down"].includes(direction)||this.over||this.won&&!this.continued)return false;
    const before=this.board.slice();
    let gain=0;
    this.changed=[];
    for(let line=0;line<4;line++){
      const ids=Array.from({length:4},(_,step)=>{
        if(direction==="left")return line*4+step;
        if(direction==="right")return line*4+3-step;
        if(direction==="up")return step*4+line;
        return (3-step)*4+line;
      });
      const packed=ids.map(i=>this.board[i]).filter(Boolean),result=[],merged=[];
      for(let i=0;i<packed.length;i++){
        if(packed[i]===packed[i+1]){
          const level=packed[i]+1;
          result.push(level);gain+=2**level;merged.push(result.length-1);i++;
        }else result.push(packed[i]);
      }
      ids.forEach((id,i)=>{this.board[id]=result[i]||0;});
      merged.forEach(i=>this.changed.push(ids[i]));
    }
    if(this.board.every((n,i)=>n===before[i]))return false;
    this.score+=gain;
    if(spawn)this.spawn();
    this.won=this.won||this.board.some(n=>n>=11);
    return true;
  }
  get over() {
    if(this.board.includes(0))return false;
    return !this.board.some((n,i)=>i%4<3&&n===this.board[i+1] || i<12&&n===this.board[i+4]);
  }
  snapshot(){return {board:this.board.slice(),score:this.score,won:this.won,continued:this.continued};}
}

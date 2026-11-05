"use strict";

class Minesweeper {
  static levels = {
    easy: {rows:9, cols:9, mines:10, name:"简单"},
    medium: {rows:16, cols:16, mines:40, name:"中等"},
    hard: {rows:16, cols:30, mines:99, name:"困难"}
  };
  constructor(level="easy") {
    Object.assign(this,Minesweeper.levels[level]);
    this.level=level;
    this.cells=Array.from({length:this.rows*this.cols},()=>({mine:false,open:false,flag:false,count:0}));
    this.started=false;this.status="ready";this.opened=0;
  }
  neighbors(i) {
    const result=[],row=Math.floor(i/this.cols),col=i%this.cols;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      const r=row+dr,c=col+dc;
      if((dr||dc)&&r>=0&&r<this.rows&&c>=0&&c<this.cols)result.push(r*this.cols+c);
    }
    return result;
  }
  seed(first) {
    const safe=new Set([first,...this.neighbors(first)]);
    const candidates=this.cells.flatMap((_,i)=>safe.has(i)?[]:[i]);
    for(let i=candidates.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
    }
    for(const i of candidates.slice(0,this.mines))this.cells[i].mine=true;
    this.cells.forEach((cell,i)=>{cell.count=this.neighbors(i).filter(n=>this.cells[n].mine).length;});
    this.started=true;this.status="playing";
  }
  flag(i) {
    const cell=this.cells[i];
    if(!cell||cell.open||this.status==="lost"||this.status==="won")return;
    cell.flag=!cell.flag;
  }
  reveal(i) {
    const cell=this.cells[i];
    if(!cell||cell.flag||cell.open||this.status==="lost"||this.status==="won")return;
    if(!this.started)this.seed(i);
    if(cell.mine){cell.open=true;this.status="lost";return;}
    const pending=[i];
    while(pending.length){
      const n=pending.pop(),c=this.cells[n];
      if(c.open||c.flag||c.mine)continue;
      c.open=true;this.opened++;
      if(c.count===0)pending.push(...this.neighbors(n));
    }
    if(this.opened===this.cells.length-this.mines)this.status="won";
  }
  chord(i) {
    const cell=this.cells[i];
    if(!cell?.open||cell.mine||this.status!=="playing")return;
    const neighbors=this.neighbors(i);
    if(neighbors.filter(n=>this.cells[n].flag).length!==cell.count)return;
    for(const n of neighbors){this.reveal(n);if(this.status==="lost")break;}
  }
  get flags(){return this.cells.filter(c=>c.flag).length;}
}

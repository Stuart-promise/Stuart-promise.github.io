"use strict";

// Each clue is read only after the simulated player has proved its cell safe.
// Knowledge: 0 = unopened, 1 = revealed, 2 = proved mine. Player flags are
// independent of this simulation, including flags placed before the first move.
function canDeduceBoard(first, clues, adjacent, mineCount) {
  const knowledge=new Uint8Array(clues.length);
  const safeTotal=clues.length-mineCount;
  let opened=1, marked=0;
  knowledge[first]=1;
  function deduce(cells, mine) {
    for (const i of cells) {
      if (knowledge[i]) continue;
      knowledge[i]=mine?2:1;
      if (mine) marked++;
      else opened++;
    }
  }
  while (opened<safeTotal) {
    const knownBefore=opened+marked;
    for (let i=0;i<clues.length;i++) {
      if (knowledge[i]!==1) continue;
      let remaining=clues[i], unknown=0;
      for (const n of adjacent[i]) {
        if (knowledge[n]===2) remaining--;
        else if (!knowledge[n]) unknown++;
      }
      if (unknown && (remaining===0 || remaining===unknown)) deduce(adjacent[i],remaining>0);
    }
    // The counter proves every unopened unmarked cell safe once all mines are accounted for.
    if (opened===safeTotal || marked===mineCount) return true;
    if (opened+marked>knownBefore) continue;

    // For two clues whose unknown neighbors are nested, subtract the smaller
    // equation. If the difference is all safe or all mines, its cells are forced.
    const groups=[], byCell=[];
    for (let i=0;i<clues.length;i++) {
      if (knowledge[i]!==1) continue;
      const cells=adjacent[i].filter(n=>!knowledge[n]);
      if (!cells.length) continue;
      let mines=clues[i];
      for (const n of adjacent[i]) if (knowledge[n]===2) mines--;
      const group={cells,mines};
      groups.push(group);
      for (const n of cells) (byCell[n]??=[]).push(group);
    }
    for (const small of groups) {
      for (const big of byCell[small.cells[0]]) {
        const extra=big.cells.length-small.cells.length;
        const mines=big.mines-small.mines;
        if (extra<=0 || (mines!==0 && mines!==extra)) continue;
        if (!small.cells.every(n=>big.cells.includes(n))) continue;
        deduce(big.cells.filter(n=>!small.cells.includes(n)),mines>0);
      }
    }
    if (opened+marked===knownBefore) return false;
  }
  return true;
}

function drawMines(candidates, count, random) {
  for (let i=0;i<count;i++) {
    const j=i+Math.floor(random()*(candidates.length-i));
    [candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  return candidates.slice(0,count);
}

class Minesweeper {
  static levels = {
    easy: {rows:9, cols:9, mines:10, name:"简单"},
    medium: {rows:16, cols:16, mines:40, name:"中等"},
    hard: {rows:16, cols:30, mines:99, name:"困难"}
  };
  // These reproducible layouts and their reflections cover every possible
  // first click for each difficulty. Recheck the deduction proof before use.
  static reserveSeeds={easy:[97],medium:[185,20],hard:[52,278,26,300,10,268,194,8,20]};
  constructor(level="easy") {
    Object.assign(this,Minesweeper.levels[level]);
    this.level=level;
    this.cells=Array.from({length:this.rows*this.cols},()=>({mine:false,open:false,flag:false,count:0}));
    this.adjacent=this.cells.map((_,i)=>this.neighbors(i));
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
  cluesFor(indices) {
    const clues=new Uint8Array(this.cells.length);
    for (const i of indices) for (const n of this.adjacent[i]) clues[n]++;
    return clues;
  }
  installMines(indices) {
    const clues=this.cluesFor(indices);
    for (let i=0;i<this.cells.length;i++) {
      this.cells[i].mine=false;
      this.cells[i].count=clues[i];
    }
    for (const i of indices) this.cells[i].mine=true;
    this.started=true;this.status="playing";
  }
  reserveLayout(first) {
    const reflect=(i,orientation)=>{
      const row=Math.floor(i/this.cols), col=i%this.cols;
      return ((orientation&1)?this.rows-1-row:row)*this.cols
        + ((orientation&2)?this.cols-1-col:col);
    };
    for (let seed of Minesweeper.reserveSeeds[this.level]) {
      const random=()=>{
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        return seed/4294967296;
      };
      const template=drawMines(this.cells.map((_,i)=>i),this.mines,random);
      const clues=this.cluesFor(template);
      for (let orientation=0;orientation<4;orientation++) {
        const start=reflect(first,orientation);
        if (clues[start] || template.includes(start)) continue;
        const indices=template.map(i=>reflect(i,orientation));
        if (canDeduceBoard(first,this.cluesFor(indices),this.adjacent,this.mines)) return indices;
      }
    }
    throw new Error("没有找到通过推理验证的棋盘。");
  }
  seed(first) {
    const safe=new Set([first,...this.adjacent[first]]);
    const candidates=this.cells.flatMap((_,i)=>safe.has(i)?[]:[i]);
    for (let attempt=0;attempt<64;attempt++) {
      const indices=drawMines(candidates,this.mines,Math.random);
      if (canDeduceBoard(first,this.cluesFor(indices),this.adjacent,this.mines)) {
        this.installMines(indices);
        return;
      }
    }
    this.installMines(this.reserveLayout(first));
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

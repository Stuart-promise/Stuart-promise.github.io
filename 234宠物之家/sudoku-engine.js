"use strict";

class Sudoku {
  static levels={easy:{clues:42,name:"简单"},medium:{clues:34,name:"中等"},hard:{clues:28,name:"困难"}};
  static peerCache=new Map();
  static peers(i) {
    if(Sudoku.peerCache.has(i))return Sudoku.peerCache.get(i);
    const row=Math.floor(i/9),col=i%9;
    const peers=Array.from({length:81},(_,j)=>j).filter(j=>j!==i&&(Math.floor(j/9)===row||j%9===col||Math.floor(j/27)===Math.floor(i/27)&&Math.floor(j%9/3)===Math.floor(col/3)));
    Sudoku.peerCache.set(i,peers);
    return peers;
  }
  static countSolutions(input,limit=2) {
    const grid=input.slice();
    function search(){
      let at=-1,options=null;
      for(let i=0;i<81;i++)if(!grid[i]){
        const used=new Set(Sudoku.peers(i).map(j=>grid[j]));
        const values=[1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n));
        if(!values.length)return 0;
        if(options===null||values.length<options.length){at=i;options=values;if(values.length===1)break;}
      }
      if(at<0)return 1;
      let count=0;
      for(const n of options){grid[at]=n;count+=search();if(count>=limit)break;}
      grid[at]=0;
      return count;
    }
    return search();
  }
  static shuffle(values) {
    const result=values.slice();
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  constructor(level="easy") {
    this.level=level;
    const target=Sudoku.levels[level].clues;
    for(let attempt=0;attempt<8;attempt++){
      const groups=()=>Sudoku.shuffle([0,1,2]).flatMap(b=>Sudoku.shuffle([0,1,2]).map(n=>b*3+n));
      const rows=groups(),cols=groups(),digits=Sudoku.shuffle([1,2,3,4,5,6,7,8,9]);
      this.solution=rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9]));
      this.givens=this.solution.slice();
      let count=81;
      for(const i of Sudoku.shuffle(Array.from({length:81},(_,i)=>i))){
        const value=this.givens[i];this.givens[i]=0;
        if(Sudoku.countSolutions(this.givens)!==1)this.givens[i]=value;
        else count--;
        if(count===target)break;
      }
      if(count===target)break;
    }
    this.values=this.givens.slice();
    this.notes=Array.from({length:81},()=>[]);
    this.history=[];
  }
  set(i,n,note=false) {
    if(!Number.isInteger(i)||i<0||i>=81||this.givens[i]||!Number.isInteger(n)||n<0||n>9||this.won)return false;
    if(note&&this.values[i])return false;
    this.history.push({i,value:this.values[i],notes:this.notes[i].slice()});
    if(note&&n){
      const notes=this.notes[i];
      this.notes[i]=notes.includes(n)?notes.filter(v=>v!==n):[...notes,n].sort();
    }else{this.values[i]=n;this.notes[i]=[];}
    return true;
  }
  undo() {
    const last=this.history.pop();
    if(last){this.values[last.i]=last.value;this.notes[last.i]=last.notes;}
  }
  conflicts() {
    return this.values.flatMap((n,i)=>n&&Sudoku.peers(i).some(j=>this.values[j]===n)?[i]:[]);
  }
  get won(){return this.values.every((n,i)=>n===this.solution[i]);}
}

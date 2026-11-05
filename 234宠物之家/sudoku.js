"use strict";

const board=document.getElementById("sudoku-board");
const difficulty=document.getElementById("difficulty");
const buttons=[];
let puzzle,selected=0,noteMode=false,checked=new Set(),startedAt=0,elapsed=0,hints=0;
function clockText(seconds){return Math.floor(seconds/60).toString().padStart(2,"0")+":"+(seconds%60).toString().padStart(2,"0");}
function render(){
  const conflicts=new Set(puzzle.conflicts());
  const peers=new Set(Sudoku.peers(selected));
  puzzle.values.forEach((value,i)=>{
    const button=buttons[i];
    button.className="sudoku-cell"+(puzzle.givens[i]?" given":"")+(i===selected?" selected":peers.has(i)?" related":"")+(value&&value===puzzle.values[selected]?" same":"")+(conflicts.has(i)||checked.has(i)?" error":"");
    button.tabIndex=i===selected?0:-1;
    button.setAttribute("aria-pressed",String(i===selected));
    button.setAttribute("aria-label","第"+(Math.floor(i/9)+1)+"行第"+(i%9+1)+"列，"+(value||"空白")+(puzzle.givens[i]?"，题目数字":""));
    button.replaceChildren();
    if(value)button.textContent=value;
    else{
      const notes=document.createElement("span");notes.className="pencil-grid";
      for(let n=1;n<=9;n++){const small=document.createElement("span");small.textContent=puzzle.notes[i].includes(n)?n:"";notes.append(small);}
      button.append(notes);
    }
  });
  document.getElementById("filled").textContent=puzzle.values.filter(Boolean).length+" / 81";
  document.getElementById("clues").textContent=puzzle.givens.filter(Boolean).length+" 个提示数";
  document.getElementById("hint-count").textContent=hints;
  document.getElementById("undo").disabled=!puzzle.history.length;
  document.getElementById("notes").setAttribute("aria-pressed",String(noteMode));
  if(puzzle.won){
    if(startedAt){elapsed=Math.floor((Date.now()-startedAt)/1000);startedAt=0;}
    document.getElementById("solo-status").textContent="完成数独！每行、每列和每个宫均为 1～9。";
  }
}
function put(n){
  if(!puzzle.set(selected,n,noteMode&&n!==0))return;
  if(!startedAt)startedAt=Date.now();
  checked.clear();
  document.getElementById("solo-status").textContent=noteMode?"笔记模式：再次选择同一数字可取消笔记。":"继续填写。重复数字会自动标红。";
  render();
}
function reset(level){
  puzzle=new Sudoku(level);selected=puzzle.givens.findIndex(n=>!n);noteMode=false;checked.clear();startedAt=0;elapsed=0;hints=0;
  document.getElementById("timer").textContent="00:00";
  document.getElementById("solo-status").textContent="选择空格，使用数字键盘或下方数字填写。每道题只有一个解。";
  render();
}
for(let i=0;i<81;i++){
  const button=document.createElement("button");button.type="button";
  button.style.borderRight=(i%9===2||i%9===5)?"2px solid #526a5a":"";
  button.style.borderBottom=(Math.floor(i/9)===2||Math.floor(i/9)===5)?"2px solid #526a5a":"";
  button.onclick=()=>{selected=i;render();};
  button.onkeydown=event=>{
    if(/^[1-9]$/.test(event.key)){event.preventDefault();put(Number(event.key));}
    else if(["Backspace","Delete","0"].includes(event.key)){event.preventDefault();put(0);}
    else if(event.key.toLowerCase()==="n"){event.preventDefault();noteMode=!noteMode;render();}
    else if(event.key.startsWith("Arrow")){
      event.preventDefault();
      const row=Math.floor(selected/9),col=selected%9;
      const delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[event.key];
      if(!delta)return;
      const r=row+delta[0],c=col+delta[1];
      if(r>=0&&r<9&&c>=0&&c<9){selected=r*9+c;render();buttons[selected].focus();}
    }
  };
  buttons.push(button);board.append(button);
}
for(let n=1;n<=9;n++){
  const button=document.createElement("button");button.textContent=n;button.type="button";button.onclick=()=>put(n);
  document.getElementById("number-pad").append(button);
}
document.getElementById("erase").onclick=()=>put(0);
document.getElementById("notes").onclick=()=>{noteMode=!noteMode;render();};
document.getElementById("undo").onclick=()=>{
  const wasWon=puzzle.won;puzzle.undo();checked.clear();
  if(wasWon&&puzzle.history.length)startedAt=Date.now()-elapsed*1000;
  document.getElementById("solo-status").textContent="已撤回一步。";render();
};
document.getElementById("check").onclick=()=>{
  checked=new Set(puzzle.values.flatMap((n,i)=>n&&!puzzle.givens[i]&&n!==puzzle.solution[i]?[i]:[]));
  document.getElementById("solo-status").textContent=checked.size?"有 "+checked.size+" 个数字不正确，已标红。":"已填数字均正确，继续加油。";
  render();
};
document.getElementById("hint").onclick=()=>{
  if(puzzle.won)return;
  if(puzzle.givens[selected]||puzzle.values[selected]===puzzle.solution[selected])selected=puzzle.values.findIndex((n,i)=>n!==puzzle.solution[i]);
  if(selected<0)return;
  noteMode=false;put(puzzle.solution[selected]);hints++;render();
};
document.getElementById("new-game").onclick=()=>{
  if(puzzle.history.length&&!puzzle.won&&!confirm("放弃当前题目，生成一道新题？"))return;
  reset(difficulty.value);
};
difficulty.onchange=()=>{
  if(puzzle.history.length&&!puzzle.won&&!confirm("切换难度会生成新题，确定切换？")){difficulty.value=puzzle.level;return;}
  reset(difficulty.value);
};
setInterval(()=>{document.getElementById("timer").textContent=clockText(startedAt?Math.floor((Date.now()-startedAt)/1000):elapsed);},1000);
reset("easy");

"use strict";

const gameBoard=document.getElementById("mine-board");
const levelSelect=document.getElementById("difficulty");
const statusLine=document.getElementById("solo-status");
let game,flagMode=false,startedAt=0,elapsed=0;
const cells=[];
const holdDelay=450;
const moveTolerance=10;
const boardRegion=gameBoard.parentElement;
let touchPress=null;

function cancelTouchPress() {
  if (!touchPress) return;
  clearTimeout(touchPress.timer);
  touchPress=null;
}

function stillOnCell(touch,press) {
  return touch.identifier===press.id
    && Math.hypot(touch.clientX-press.x,touch.clientY-press.y)<=moveTolerance
    && document.elementFromPoint(touch.clientX,touch.clientY)===cells[press.index];
}

// Let a swipe scroll the board. Only a completed single-finger gesture plays a cell.
gameBoard.addEventListener("touchstart",event=>{
  if (event.touches.length!==1) return;
  cancelTouchPress();
  const index=cells.indexOf(event.target);
  if (index<0) return;
  const touch=event.touches[0];
  const press={id:touch.identifier,x:touch.clientX,y:touch.clientY,index,held:false};
  touchPress=press;
  press.timer=setTimeout(()=>{
    press.held=true;
    act(index,true);
  },holdDelay);
},{passive:true});
document.addEventListener("touchstart",event=>{
  if (event.touches.length>1) cancelTouchPress();
},{capture:true,passive:true});
gameBoard.addEventListener("touchmove",event=>{
  if (touchPress && !stillOnCell(event.touches[0],touchPress)) cancelTouchPress();
},{passive:true});
gameBoard.addEventListener("touchend",event=>{
  if (!event.target.classList.contains("mine-cell")) return;
  // Suppress the browser's follow-up click, including after removing a flag.
  if (event.cancelable) event.preventDefault();
  const press=touchPress;
  cancelTouchPress();
  if (press && !press.held && !event.touches.length && stillOnCell(event.changedTouches[0],press)) act(press.index);
},{passive:false});
gameBoard.addEventListener("touchcancel",cancelTouchPress);
document.addEventListener("scroll",cancelTouchPress,true);
window.addEventListener("blur",cancelTouchPress);
window.addEventListener("pagehide",cancelTouchPress);
document.addEventListener("visibilitychange",()=>{if (document.hidden) cancelTouchPress();});

// Mobile browsers can dispatch contextmenu during a hold. Only a real secondary
// button press should perform the mouse shortcut.
boardRegion.addEventListener("contextmenu",event=>event.preventDefault());
boardRegion.addEventListener("selectstart",event=>event.preventDefault());
gameBoard.addEventListener("pointerdown",event=>{
  if (event.button!==2 || event.pointerType==="touch") return;
  const index=cells.indexOf(event.target);
  if (index>=0) act(index,true);
});

function clockText(seconds){return Math.floor(seconds/60).toString().padStart(2,"0")+":"+(seconds%60).toString().padStart(2,"0");}
function render() {
  document.getElementById("mine-left").textContent=game.mines-game.flags;
  document.getElementById("mine-size").textContent=game.rows+" × "+game.cols+" · "+game.mines+" 雷";
  statusLine.textContent=game.status==="won"?"排雷成功！所有安全格都已打开。":game.status==="lost"?"踩到地雷了，点击「重新开始」再试一次。":flagMode?"标旗模式：点击格子放置或取消旗帜。":game.started?"小心排雷。点击已展开的数字可快速展开周围格。":"点击任意格开始，首击及周围八格安全。";
  gameBoard.setAttribute("aria-label",game.name+"扫雷，"+game.rows+"行"+game.cols+"列");
  game.cells.forEach((cell,i)=>{
    const button=cells[i];
    const shownMine=game.status==="lost"&&cell.mine;
    button.className="mine-cell"+(cell.open?" open":"")+(shownMine?" mine":"")+(game.status==="lost"&&cell.flag&&!cell.mine?" wrong-flag":"");
    button.dataset.number=cell.count;
    button.textContent=shownMine?"✹":cell.flag?"⚑":cell.open?(cell.count||""):"";
    button.setAttribute("aria-label","第"+(Math.floor(i/game.cols)+1)+"行第"+(i%game.cols+1)+"列，"+(shownMine?"地雷":cell.flag?"旗帜":cell.open?(cell.count?cell.count+"颗相邻地雷":"空白"):"未打开"));
    button.setAttribute("aria-disabled",String(game.status==="won"||game.status==="lost"));
  });
}
function act(i,flag=false) {
  if(game.status==="won"||game.status==="lost")return;
  if(flag||flagMode)game.flag(i);
  else if(game.cells[i].open)game.chord(i);
  else game.reveal(i);
  if(game.started&&!startedAt)startedAt=Date.now();
  if((game.status==="lost"||game.status==="won")&&startedAt){elapsed=Math.floor((Date.now()-startedAt)/1000);startedAt=0;}
  render();
}
function reset(level) {
  cancelTouchPress();
  game=new Minesweeper(level);flagMode=false;startedAt=0;elapsed=0;
  document.getElementById("flag-mode").setAttribute("aria-pressed","false");
  document.getElementById("timer").textContent="00:00";
  gameBoard.replaceChildren();cells.length=0;
  gameBoard.style.setProperty("--mine-cols",game.cols);
  game.cells.forEach((_,i)=>{
    const button=document.createElement("button");
    button.type="button";button.className="mine-cell";
    button.tabIndex=i===0?0:-1;
    button.onclick=()=>act(i);
    button.onkeydown=event=>{
      if(event.key.toLowerCase()==="f" || event.key==="ContextMenu" || event.key==="F10" && event.shiftKey){event.preventDefault();act(i,true);return;}
      const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-game.cols,ArrowDown:game.cols}[event.key];
      if(!delta)return;
      event.preventDefault();
      const next=i+delta;
      if(next<0||next>=cells.length||Math.abs(delta)===1&&Math.floor(i/game.cols)!==Math.floor(next/game.cols))return;
      cells[i].tabIndex=-1;cells[next].tabIndex=0;cells[next].focus();
    };
    cells.push(button);gameBoard.append(button);
  });
  render();
}
document.getElementById("flag-mode").onclick=()=>{
  flagMode=!flagMode;
  document.getElementById("flag-mode").setAttribute("aria-pressed",String(flagMode));
  render();
};
document.getElementById("new-game").onclick=()=>{
  if(game.status==="playing"&&!confirm("结束当前扫雷，重新开始？"))return;
  reset(levelSelect.value);
};
levelSelect.onchange=()=>{
  if(game.status==="playing"&&!confirm("切换难度会开始新的一局，确定切换？")){levelSelect.value=game.level;return;}
  reset(levelSelect.value);
};
setInterval(()=>{document.getElementById("timer").textContent=clockText(startedAt?Math.floor((Date.now()-startedAt)/1000):elapsed);},1000);
reset("easy");

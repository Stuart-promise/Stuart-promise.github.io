"use strict";

const gameBoard=document.getElementById("mine-board");
const levelSelect=document.getElementById("difficulty");
const statusLine=document.getElementById("solo-status");
let game,flagMode=false,startedAt=0,elapsed=0;
let opening=null;
const openingText="正在生成可推理的棋盘…";
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
  return Math.hypot(touch.clientX-press.x,touch.clientY-press.y)<=moveTolerance
    && document.elementFromPoint(touch.clientX,touch.clientY)===cells[press.index];
}

// Cancel the native long-press recognizer on contact. Canceling touchend alone
// is too late on mobile browsers that already opened their copy menu.
const handleTouch={capture:true,passive:false};
boardRegion.addEventListener("touchstart",event=>{
  cancelTouchPress();
  if (event.touches.length!==1) return;
  if (event.cancelable) event.preventDefault();
  const index=cells.indexOf(event.target);
  const touch=event.touches[0];
  const press={
    index,id:touch.identifier,x:touch.clientX,y:touch.clientY,
    left:boardRegion.scrollLeft,top:window.scrollY,held:false,dragging:false
  };
  touchPress=press;
  if (index>=0) {
    press.timer=setTimeout(()=>{
      press.held=true;
      act(index,true);
    },holdDelay);
  }
},handleTouch);
document.addEventListener("touchstart",event=>{
  if (event.touches.length>1) cancelTouchPress();
},{capture:true,passive:true});
// A drag still pans the wide board and the tall page after touchstart is canceled.
boardRegion.addEventListener("touchmove",event=>{
  const press=touchPress;
  if (!press || event.touches.length!==1) return;
  const touch=event.touches[0];
  if (touch.identifier!==press.id) return;
  if (event.cancelable) event.preventDefault();
  if (!press.dragging && stillOnCell(touch,press)) return;
  clearTimeout(press.timer);
  press.dragging=true;
  boardRegion.scrollLeft=press.left+press.x-touch.clientX;
  window.scrollTo(window.scrollX,press.top+press.y-touch.clientY);
},handleTouch);
boardRegion.addEventListener("touchend",event=>{
  if (event.cancelable) event.preventDefault();
  const press=touchPress;
  cancelTouchPress();
  const touch=event.changedTouches[0];
  if (press && !press.held && !press.dragging && press.index>=0 && !event.touches.length
      && touch.identifier===press.id && stillOnCell(touch,press)) act(press.index);
},handleTouch);
boardRegion.addEventListener("touchcancel",cancelTouchPress);
document.addEventListener("scroll",()=>{if (touchPress && !touchPress.dragging) cancelTouchPress();},true);
window.addEventListener("blur",cancelTouchPress);
window.addEventListener("pagehide",cancelTouchPress);
document.addEventListener("visibilitychange",()=>{if (document.hidden) cancelTouchPress();});

// Mobile browsers can dispatch contextmenu during a hold. Only a real secondary
// button press should perform the mouse shortcut.
boardRegion.addEventListener("contextmenu",event=>event.preventDefault());
boardRegion.addEventListener("selectstart",event=>event.preventDefault());
boardRegion.addEventListener("dragstart",event=>event.preventDefault());
boardRegion.addEventListener("copy",event=>event.preventDefault());
boardRegion.addEventListener("click",event=>{
  if (event.detail && (event.pointerType==="touch" || event.sourceCapabilities?.firesTouchEvents)) {
    event.preventDefault();
    event.stopPropagation();
  }
},true);
gameBoard.addEventListener("pointerdown",event=>{
  if (event.button!==2 || event.pointerType==="touch") return;
  const index=cells.indexOf(event.target);
  if (index>=0) act(index,true);
});

// Path-only marks leave no text or image element for mobile selection or image callouts.
// Each button still gets its spoken row, column and contents in render().
const markPaths={
  1:"M8 8l5-4v16m-4 0h8",
  2:"M6.5 8a5.5 5 0 0 1 11 0c0 3-3 5-5 7l-6 5H18",
  3:"M6.5 5.5C11 2 17 3.5 17 7.5c0 3-3 4.5-6.5 4.5 4 0 7 1.4 7 4.4 0 4.6-7.2 5.7-11.5 2.4",
  4:"M15 20V4L5.5 15.5H19",
  5:"M17 4H8l-1 7.5c3-1.6 10-2.1 10.5 3.5.5 5.7-7 7.1-11.5 3.6",
  6:"M16.5 4.5C10 2.9 6.5 9 6.5 14.9c0 6.8 11 7.7 11 1 .1-5.5-7.3-6.8-10.8-1.7",
  7:"M6 4h12l-8 16",
  8:"M12 12c-7 0-7.2-8 0-8s7 8 0 8Zm0 0c7.8 0 7.8 8.2 0 8.2s-7.8-8.2 0-8.2Z",
  flag:"M6 20V3l12 4.5L6 12m-3 8h7",
  mine:"M12 5v-3m0 20v-3M5 12H2m20 0h-3M7 7 4 4m16 16-3-3M7 17l-3 3M20 4l-3 3M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13Z"
};
const svgNamespace="http://www.w3.org/2000/svg";
function paintCellMark(button,mark) {
  if (button.dataset.mark===mark) return;
  button.dataset.mark=mark;
  if (!mark) {
    button.replaceChildren();
    return;
  }
  let icon=button.firstElementChild;
  if (!icon) {
    icon=document.createElementNS(svgNamespace,"svg");
    icon.setAttribute("viewBox","0 0 24 24");
    icon.setAttribute("aria-hidden","true");
    icon.setAttribute("focusable","false");
    icon.append(document.createElementNS(svgNamespace,"path"));
    button.append(icon);
  }
  icon.firstElementChild.setAttribute("d",markPaths[mark]);
}
function clockText(seconds){return Math.floor(seconds/60).toString().padStart(2,"0")+":"+(seconds%60).toString().padStart(2,"0");}
function render() {
  document.getElementById("mine-left").textContent=game.mines-game.flags;
  document.getElementById("mine-size").textContent=game.rows+" × "+game.cols+" · "+game.mines+" 雷";
  statusLine.textContent=opening?openingText:game.status==="won"?"排雷成功！所有安全格都已打开。":game.status==="lost"?"踩到地雷了，点击「重新开始」再试一次。":flagMode?"标旗模式：点击格子放置或取消旗帜。":game.started?"小心排雷。点击已展开的数字可快速展开周围格。":"点击任意格开始，首击及周围八格安全。";
  gameBoard.setAttribute("aria-label",game.name+"扫雷，"+game.rows+"行"+game.cols+"列");
  game.cells.forEach((cell,i)=>{
    const button=cells[i];
    const shownMine=game.status==="lost"&&cell.mine;
    button.className="mine-cell"+(cell.open?" open":"")+(shownMine?" mine":"")+(game.status==="lost"&&cell.flag&&!cell.mine?" wrong-flag":"");
    button.dataset.number=cell.open?cell.count:"";
    paintCellMark(button,shownMine?"mine":cell.flag?"flag":cell.open && cell.count?String(cell.count):"");
    button.setAttribute("aria-label","第"+(Math.floor(i/game.cols)+1)+"行第"+(i%game.cols+1)+"列，"+(shownMine?"地雷":cell.flag?"旗帜":cell.open?(cell.count?cell.count+"颗相邻地雷":"空白"):"未打开"));
    button.setAttribute("aria-disabled",String(game.status==="won"||game.status==="lost"));
  });
}
function finishMove() {
  if(game.started&&!startedAt)startedAt=Date.now();
  if((game.status==="lost"||game.status==="won")&&startedAt){elapsed=Math.floor((Date.now()-startedAt)/1000);startedAt=0;}
  render();
}
function cancelOpening() {
  opening?.worker?.terminate();
  opening=null;
  gameBoard.removeAttribute("aria-busy");
}
function openFirstCell(first) {
  const job={worker:null};
  opening=job;
  gameBoard.setAttribute("aria-busy","true");
  statusLine.textContent=openingText;
  function finish(mines) {
    if (opening!==job) return;
    cancelOpening();
    // reveal uses the same verified generator if workers are unavailable.
    if (mines) game.installMines(mines);
    game.reveal(first);
    finishMove();
  }
  try {
    job.worker=new Worker("./mines-worker.js?v=deduction2");
    job.worker.onmessage=event=>finish(event.data);
    job.worker.onmessageerror=()=>finish();
    job.worker.onerror=event=>{event.preventDefault();finish();};
    job.worker.postMessage({level:game.level,first});
  } catch {
    finish();
  }
}
function act(i,flag=false) {
  if(opening||game.status==="won"||game.status==="lost")return;
  if(flag||flagMode)game.flag(i);
  else if(!game.started&&!game.cells[i].flag){openFirstCell(i);return;}
  else if(game.cells[i].open)game.chord(i);
  else game.reveal(i);
  finishMove();
}
function reset(level) {
  cancelOpening();
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

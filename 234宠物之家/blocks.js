(async () => {
if (!globalThis.PetAccount) await import("./account.js?v=2");
const accountStore = await PetAccount.open("blocks");
"use strict";

const $=id=>document.getElementById(id);
const palette={I:"#5caaa6",J:"#778fba",L:"#c58b58",O:"#c9b35a",S:"#7caa77",T:"#a487b2",Z:"#c77f75"};
const canvas=$("blocks-canvas"),ctx=canvas.getContext("2d");
let game=new FallingBlocks(),best=0,lastFrame=0,accumulator=0,lastStats="";
const pressed=new Map();
try{const saved=Number(accountStore.getItem("pet234-blocks-best"));if(Number.isSafeInteger(saved)&&saved>=0)best=saved;}catch{}
const ratio=Math.min(devicePixelRatio||1,2);
canvas.width=300*ratio;canvas.height=600*ratio;ctx.scale(ratio,ratio);
function square(context,x,y,size,type,ghost=false){
  const color=palette[type];
  context.save();
  if(ghost){context.strokeStyle=color;context.globalAlpha=.65;context.lineWidth=2;context.strokeRect(x+3,y+3,size-6,size-6);}
  else{
    context.fillStyle=color;context.fillRect(x+1,y+1,size-2,size-2);
    context.fillStyle="#ffffff35";context.fillRect(x+3,y+3,size-6,3);
    context.fillStyle="#122b2425";context.fillRect(x+3,y+size-6,size-6,3);
  }
  context.restore();
}
function drawPiece(piece,ghost=false){
  piece.matrix.forEach((row,r)=>row.forEach((value,c)=>{
    if(value&&piece.y+r>=2)square(ctx,(piece.x+c)*30,(piece.y+r-2)*30,30,piece.type,ghost);
  }));
}
function preview(target,type){
  const context=target.getContext("2d");
  context.clearRect(0,0,100,80);
  if(!type)return;
  const matrix=FallingBlocks.shapes[type],filled=[];
  matrix.forEach((row,r)=>row.forEach((value,c)=>{if(value)filled.push([c,r]);}));
  const minX=Math.min(...filled.map(p=>p[0])),maxX=Math.max(...filled.map(p=>p[0]));
  const minY=Math.min(...filled.map(p=>p[1])),maxY=Math.max(...filled.map(p=>p[1]));
  const size=20,ox=(100-(maxX-minX+1)*size)/2,oy=(80-(maxY-minY+1)*size)/2;
  filled.forEach(([x,y])=>square(context,ox+(x-minX)*size,oy+(y-minY)*size,size,type));
}
function draw(){
  ctx.fillStyle="#213b35";ctx.fillRect(0,0,300,600);
  ctx.strokeStyle="#91bba012";ctx.lineWidth=1;
  for(let x=0;x<=300;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<=600;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(300,y);ctx.stroke();}
  game.board.slice(2).forEach((row,r)=>row.forEach((type,c)=>{if(type)square(ctx,c*30,r*30,30,type);}));
  if(game.status==="playing"){drawPiece(game.ghost(),true);drawPiece(game.piece);}
  if(game.status!=="playing"){
    ctx.fillStyle="#20372ce8";ctx.fillRect(0,205,300,170);
    ctx.textAlign="center";ctx.fillStyle="#f3edd4";ctx.font="bold 29px system-ui";
    ctx.fillText(game.status==="ready"?"准备开始":game.status==="paused"?"已暂停":"本局结束",150,265);
    ctx.font="15px system-ui";ctx.fillText(game.status==="over"?"得分 "+game.score:game.status==="ready"?"点击开始，挑战最高分":"点击继续或按 P 恢复",150,310);
  }
}
function render(){
  if(game.score>best){
    best=game.score;
    try{accountStore.setItem("pet234-blocks-best",String(best));}catch{}
  }
  const key=[game.score,best,game.level,game.lines,game.status,game.piece.type,game.held,game.holdUsed,game.queue.slice(0,3).join(),game.message].join("|");
  if(key!==lastStats){
    lastStats=key;
    $("score").textContent=game.score;$("best").textContent=best;$("level").textContent=game.level;$("lines").textContent=game.lines;
    $("blocks-status").textContent=game.status==="paused"?"已暂停，点击继续恢复。":game.message;
    $("play").textContent=game.status==="ready"?"开始游戏":game.status==="paused"?"继续":"暂停";
    $("play").disabled=game.status==="over";
    document.querySelectorAll("[data-action]").forEach(button=>{button.disabled=game.status!=="playing" || button.dataset.action==="hold"&&game.holdUsed;});
    preview($("held-canvas"),game.held);
    for(let i=0;i<3;i++)preview($("next-"+i),game.queue[i]);
  }
  draw();
}
function toggle(){
  if(game.status==="over")return;
  game.status=game.status==="playing"?"paused":"playing";
  pressed.clear();lastFrame=0;accumulator=0;render();canvas.focus({preventScroll:true});
}
function perform(action){
  if(game.status!=="playing")return;
  if(action==="left")game.move(-1);
  if(action==="right")game.move(1);
  if(action==="down")game.softDrop();
  if(action==="rotate")game.rotate();
  if(action==="reverse")game.rotate(false);
  if(action==="drop")game.hardDrop();
  if(action==="hold")game.hold();
  render();
}
$("play").onclick=toggle;
$("restart").onclick=()=>{
  if(["playing","paused"].includes(game.status)&&!confirm("结束当前对局，重新开始？"))return;
  game=new FallingBlocks();game.status="playing";pressed.clear();lastFrame=0;accumulator=0;lastStats="";render();canvas.focus({preventScroll:true});
};
function pauseAway(){
  pressed.clear();
  if(game.status==="playing")game.status="paused";
  lastFrame=0;accumulator=0;render();
}
window.addEventListener("blur",pauseAway);
document.addEventListener("visibilitychange",()=>{if(document.hidden)pauseAway();});
const keyActions={ArrowLeft:"left",ArrowRight:"right",ArrowDown:"down",ArrowUp:"rotate",x:"rotate",X:"rotate",z:"reverse",Z:"reverse"," ":"drop",c:"hold",C:"hold",Shift:"hold"};
document.addEventListener("keydown",event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||["INPUT","SELECT","TEXTAREA"].includes(event.target.tagName))return;
  if(event.key==="p"||event.key==="P"||event.key==="Escape"){
    event.preventDefault();if(!event.repeat)toggle();return;
  }
  const action=keyActions[event.key];
  if(!action)return;
  if(event.target.tagName==="BUTTON"&&event.key===" ")return;
  event.preventDefault();
  if(event.repeat||pressed.has(event.code))return;
  perform(action);
  if(["left","right","down"].includes(action)&&game.status==="playing")pressed.set(event.code,{action,elapsed:0,next:action==="down"?55:150});
});
document.addEventListener("keyup",event=>pressed.delete(event.code));
document.querySelectorAll("[data-action]").forEach(button=>{
  const action=button.dataset.action,key="touch-"+action;
  button.onpointerdown=event=>{
    if(!event.isPrimary||event.button!==0||button.disabled)return;
    event.preventDefault();button.setPointerCapture(event.pointerId);perform(action);
    if(["left","right","down"].includes(action))pressed.set(key,{action,elapsed:0,next:action==="down"?55:150});
  };
  const release=()=>pressed.delete(key);
  button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
  button.onclick=event=>{if(event.detail===0)perform(action);};
});
function frame(time){
  const delta=lastFrame?Math.min(time-lastFrame,100):0;lastFrame=time;
  if(game.status==="playing"&&!document.hidden){
    for(const state of pressed.values()){
      state.elapsed+=delta;
      while(state.elapsed>=state.next){perform(state.action);state.next+=state.action==="down"?45:55;}
    }
    accumulator+=delta;
    while(accumulator>=1000/60){game.tick(1000/60);accumulator-=1000/60;}
  }
  render();requestAnimationFrame(frame);
}
render();requestAnimationFrame(frame);

})().catch(error => PetAccount.notify(error.message));

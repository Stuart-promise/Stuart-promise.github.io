(async () => {
if (!globalThis.PetAccount) await import("./account.js?v=rank1");
const accountStore = await PetAccount.open("animal-drop");
"use strict";

const dropAnimals=[
  ["🐹","侏儒仓鼠"],["🐇","欧洲兔"],["🐈","家猫"],["🦊","赤狐"],["🐑","绵羊"],["🐼","大熊猫"],
  ["🦁","狮"],["🐎","家马"],["🦒","长颈鹿"],["🦏","白犀牛"],["🐘","非洲草原象"]
];
const $=id=>document.getElementById(id);
const canvas=$("drop-canvas"),ctx=canvas.getContext("2d");
let game=new AnimalDrop(),aim=220,best=0,paused=false,lastFrame=0,accumulator=0,statsKey="";
try{const saved=Number(accountStore.getItem("pet234-animal-drop-best"));if(Number.isSafeInteger(saved)&&saved>=0)best=saved;}catch{}
const ratio=Math.min(devicePixelRatio||1,2);
canvas.width=440*ratio;canvas.height=660*ratio;ctx.scale(ratio,ratio);
function saveBest(){
  if(game.score<=best)return;
  best=game.score;
  try{accountStore.setItem("pet234-animal-drop-best",String(best));}catch{}
}
function animalCircle(level,x,y,r,ghost=false){
  ctx.save();ctx.globalAlpha=ghost ? .65 : 1;
  const hue=38+level*15;
  const gradient=ctx.createRadialGradient(x-r*.3,y-r*.4,r*.1,x,y,r);
  gradient.addColorStop(0,"hsl("+hue+" 65% 93%)");
  gradient.addColorStop(1,"hsl("+hue+" 48% 73%)");
  ctx.fillStyle=gradient;ctx.strokeStyle="hsl("+hue+" 35% 47%)";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font=Math.max(19,r*1.1)+"px system-ui";
  ctx.fillText(dropAnimals[level][0],x,y-(r>=34?6:0));
  if(r>=34){ctx.font="bold "+Math.min(15,r*.22)+"px system-ui";ctx.fillStyle="#2b5038";ctx.fillText(dropAnimals[level][1],x,y+r*.53);}
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,440,660);
  ctx.fillStyle="#fff9e9";ctx.fillRect(0,0,440,660);
  ctx.fillStyle="#f0f1de";ctx.fillRect(10,120,420,525);
  ctx.strokeStyle=game.warning?"#c14a39":"#ae8261";ctx.lineWidth=2;ctx.setLineDash([7,6]);
  ctx.beginPath();ctx.moveTo(10,120);ctx.lineTo(430,120);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=game.warning?"#ad3b2c":"#917155";ctx.font="13px system-ui";ctx.textAlign="left";
  ctx.fillText("警戒线 · 堆积后持续超线则结束",18,144);
  ctx.fillStyle="#a9b99a";ctx.fillRect(0,115,10,545);ctx.fillRect(430,115,10,545);ctx.fillRect(0,645,440,15);
  for(const ball of game.balls)animalCircle(ball.petLevel,ball.position.x,ball.position.y,AnimalDrop.radii[ball.petLevel]);
  if(!game.over){
    const r=AnimalDrop.radii[game.current],x=Math.max(r+12,Math.min(428-r,aim));
    ctx.setLineDash([4,5]);ctx.strokeStyle="#65866b88";
    ctx.beginPath();ctx.moveTo(x,58+r);ctx.lineTo(x,630);ctx.stroke();ctx.setLineDash([]);
    animalCircle(game.current,x,58,r,true);
  }
  if(game.over||paused||document.hidden){
    ctx.fillStyle="#f9f7e8dc";ctx.fillRect(10,185,420,165);
    ctx.textAlign="center";ctx.fillStyle="#2b5038";ctx.font="bold 30px system-ui";
    ctx.fillText(game.over?"本局结束":"已暂停",220,245);
    ctx.font="17px system-ui";ctx.fillText(game.over?"本局得分 "+game.score:"点击「继续」恢复游戏",220,290);
  }
}
function renderStats(){
  saveBest();
  const key=[game.score,best,game.current,game.next,game.over,game.won,game.highest,game.warning,paused,game.canDrop].join("|");
  if(key===statsKey)return;
  statsKey=key;
  $("score").textContent=game.score;$("best").textContent=best;
  $("current-animal").textContent=dropAnimals[game.current].join(" ");
  $("next-animal").textContent=dropAnimals[game.next].join(" ");
  $("highest").textContent=dropAnimals[game.highest][1];
  $("drop-button").disabled=paused||game.over||!game.canDrop;
  $("pause").textContent=paused?"继续":"暂停";
  $("pause").disabled=game.over;
  $("drop-status").textContent=game.over?"动物堆积持续超线，本局结束。可以重新挑战。":paused?"已暂停。":game.warning?"注意高度！动物接近顶部，尽快合成降低堆积。":game.won?"已合成大象！继续挑战更高得分。":"选择落点，让相同动物碰撞合成更大的动物。";
}
function drop(){if(!paused&&!document.hidden&&game.drop(aim)){renderStats();draw();}}
function pointerAim(event){
  const rect=canvas.getBoundingClientRect();
  aim=Math.max(12,Math.min(428,(event.clientX-rect.left)/rect.width*440));
  $("aim").value=Math.round(aim);
}
canvas.addEventListener("pointerdown",event=>{
  if(!event.isPrimary||event.button!==0)return;
  pointerAim(event);canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove",event=>{if(event.isPrimary)pointerAim(event);});
canvas.addEventListener("pointerup",event=>{if(event.isPrimary&&event.button===0){pointerAim(event);drop();}});
canvas.addEventListener("keydown",event=>{
  if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();aim=Math.max(12,Math.min(428,aim+(event.key==="ArrowLeft"?-15:15)));$("aim").value=aim;}
  else if([" ","Enter","ArrowDown"].includes(event.key)){event.preventDefault();drop();}
});
$("aim").oninput=()=>{aim=Number($("aim").value);};
$("drop-button").onclick=drop;
$("pause").onclick=()=>{paused=!paused;lastFrame=0;accumulator=0;renderStats();draw();};
$("new-game").onclick=()=>{
  if(game.balls.length&&!game.over&&!confirm("结束当前对局，重新开始？"))return;
  game.destroy();game=new AnimalDrop();aim=220;paused=false;lastFrame=0;accumulator=0;statsKey="";$("aim").value=aim;
  renderStats();draw();
};
document.addEventListener("visibilitychange",()=>{
  if(document.hidden&&!game.over)paused=true;
  lastFrame=0;accumulator=0;renderStats();draw();
});
dropAnimals.forEach(([icon,name],level)=>{
  const item=document.createElement("li");
  item.textContent=icon+" "+name;
  $("drop-book").append(item);
});
function frame(time){
  if(!paused&&!document.hidden&&!game.over){
    if(lastFrame)accumulator+=Math.min(time-lastFrame,100);
    while(accumulator>=1000/60){game.step();accumulator-=1000/60;}
  }
  lastFrame=time;renderStats();draw();requestAnimationFrame(frame);
}
renderStats();draw();requestAnimationFrame(frame);

})().catch(error => PetAccount.notify(error.message));

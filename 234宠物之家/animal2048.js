"use strict";

const animals=[
  {name:"侏儒仓鼠",icon:"🐹",mass:"约 40 克",source:"https://healthtopics.vetmed.ucdavis.edu/health-topics/exotics/hamster-care"},
  {name:"欧洲兔",icon:"🐇",mass:"约 2 千克",source:"https://animaldiversity.org/accounts/Oryctolagus_cuniculus/"},
  {name:"家猫",icon:"🐈",mass:"约 5 千克",source:"https://animaldiversity.org/accounts/Felis_catus/"},
  {name:"赤狐",icon:"🦊",mass:"约 7 千克",source:"https://animaldiversity.org/accounts/Vulpes_vulpes/"},
  {name:"绵羊",icon:"🐑",mass:"约 50 千克",source:"https://animaldiversity.org/accounts/Ovis_aries/"},
  {name:"大熊猫",icon:"🐼",mass:"约 100 千克",source:"https://animaldiversity.org/accounts/Ailuropoda_melanoleuca/"},
  {name:"狮",icon:"🦁",mass:"约 180 千克",source:"https://animaldiversity.org/accounts/Panthera_leo/"},
  {name:"家马",icon:"🐎",mass:"约 500 千克",source:"https://animaldiversity.org/accounts/Equus_caballus/"},
  {name:"长颈鹿",icon:"🦒",mass:"约 1.5 吨",source:"https://animaldiversity.org/accounts/Giraffa_camelopardalis/"},
  {name:"白犀牛",icon:"🦏",mass:"约 2.3 吨",source:"https://animaldiversity.org/accounts/Ceratotherium_simum/"},
  {name:"非洲草原象",icon:"🐘",mass:"约 5 吨",source:"https://animaldiversity.org/accounts/Loxodonta_africana/"},
  {name:"抹香鲸",icon:"🐳",mass:"约 40 吨",source:"https://animaldiversity.org/accounts/Physeter_catodon/"},
  {name:"蓝鲸",icon:"🐋",mass:"约 100 吨",source:"https://www.depts.ttu.edu/nsrl/mammals-of-texas-online-edition/Accounts_Cetacea/Balaenoptera_musculus.php"}
];
function animalAt(level){
  if(level<=13)return animals[level-1];
  const count=2**(level-13);
  return {name:"蓝鲸群 ×"+count,icon:"🐋",mass:count+" 只蓝鲸",source:animals[12].source};
}
const $=id=>document.getElementById(id);
const storageKey="pet234-animal2048-v1";
let game,best=0,seen=1,persisted=true;
try{
  const stored=JSON.parse(localStorage.getItem(storageKey));
  game=new Animal2048(stored?.game);
  if(Number.isSafeInteger(stored?.best)&&stored.best>=0)best=stored.best;
  if(Number.isInteger(stored?.seen)&&stored.seen>=1&&stored.seen<=32)seen=stored.seen;
}catch{}
if(!game)game=new Animal2048();
const tiles=[];
for(let i=0;i<16;i++){
  const tile=document.createElement("div");tile.className="animal-cell";tile.setAttribute("role","gridcell");
  tiles.push(tile);$("animal-board").append(tile);
}
function save(){
  try{localStorage.setItem(storageKey,JSON.stringify({game:game.snapshot(),best,seen}));}
  catch{persisted=false;}
}
function render(){
  const max=Math.max(...game.board);
  seen=Math.max(seen,max);best=Math.max(best,game.score);
  $("score").textContent=game.score;
  $("best").textContent=best;
  $("highest").textContent=animalAt(max).name;
  $("animal-status").textContent=game.over?"暂时没有可移动的方向了，重新开始再挑战吧。":game.won&&!game.continued?"恭喜合成非洲草原象，达成 2048！可继续挑战鲸类。":"滑动合并相同动物，目标是合成大象（2048）。";
  $("continue").hidden=!game.won||game.continued||game.over;
  $("animal-board").setAttribute("aria-label","动物2048棋盘，得分"+game.score);
  game.board.forEach((level,i)=>{
    const tile=tiles[i];
    tile.replaceChildren();tile.className="animal-cell"+(level?" filled":"")+(game.changed.includes(i)?" pop":"");
    tile.style.setProperty("--tile-hue",level?38+(level-1)*13:50);
    tile.dataset.level=level;
    if(!level){tile.setAttribute("aria-label","空位");return;}
    const info=animalAt(level);
    const icon=document.createElement("span");icon.className="animal-icon";icon.textContent=info.icon;icon.setAttribute("aria-hidden","true");
    const name=document.createElement("span");name.className="animal-name";name.textContent=info.name;
    const value=document.createElement("span");value.className="animal-value";value.textContent=2**level;
    tile.append(icon,name,value);
    tile.setAttribute("aria-label",info.name+"，等级"+level+"，"+(2**level)+"，"+info.mass);
  });
  $("animal-book").replaceChildren();
  animals.forEach((info,index)=>{
    const item=document.createElement("li");
    item.className=index+1<=seen?"unlocked":"locked";
    const label=document.createElement("span");label.textContent=info.icon+" "+info.name;
    const meta=document.createElement("span");meta.textContent=info.mass+" · "+(2**(index+1));
    item.append(label,meta);$("animal-book").append(item);
  });
  save();
  $("save-note").textContent=persisted?"进度和最高分自动保存在当前浏览器。":"当前浏览器无法保存进度，本次仍可正常游玩。";
}
function move(direction){
  if(game.move(direction))render();
}
document.addEventListener("keydown",event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||["INPUT","SELECT","TEXTAREA"].includes(event.target.tagName))return;
  const directions={ArrowLeft:"left",ArrowRight:"right",ArrowUp:"up",ArrowDown:"down",a:"left",d:"right",w:"up",s:"down"};
  const direction=directions[event.key];
  if(direction){event.preventDefault();move(direction);}
});
document.querySelectorAll("[data-direction]").forEach(button=>button.onclick=()=>move(button.dataset.direction));
let pointer=null;
$("animal-board").addEventListener("pointerdown",event=>{
  if(!event.isPrimary||event.button!==0)return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  $("animal-board").setPointerCapture(event.pointerId);
});
$("animal-board").addEventListener("pointerup",event=>{
  if(!pointer||pointer.id!==event.pointerId)return;
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;
  move(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
});
$("animal-board").addEventListener("pointercancel",()=>{pointer=null;});
$("new-game").onclick=()=>{
  if(game.score&&!game.over&&!confirm("结束当前对局，重新开始？"))return;
  game=new Animal2048();render();
};
$("continue").onclick=()=>{game.continued=true;render();};
animals.forEach(info=>{
  const li=document.createElement("li"),link=document.createElement("a");
  link.href=info.source;link.target="_blank";link.rel="noopener noreferrer";link.textContent=info.name+"资料";
  li.append(link);$("animal-sources").append(li);
});
render();

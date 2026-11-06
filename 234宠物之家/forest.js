const $ = id => document.getElementById(id);
const families = [
  [["🐹","仓鼠"],["🐰","兔子"],["🦊","赤狐"],["🐺","灰狼"],["🦁","狮子"]],
  [["🐤","小鸡"],["🕊️","鸽子"],["🦉","猫头鹰"],["🦅","金雕"],["🦚","孔雀"]]
];
const cap = 10;
const grid = $("grid"), trail = $("trail"), length = trail.getTotalLength();
const cells = [], sprites = new Map();
let state, selected = null, request = 0, previous = 0, drag = null, suppressClick = false;
let revealTimer;
let record = {seen:[], best:0};
try {
  const saved = JSON.parse(localStorage.getItem("pet234-forest-1"));
  if (Array.isArray(saved?.seen)) record.seen = saved.seen.filter(key=>/^[01]-[0-4]$/.test(key));
  if (Number.isInteger(saved?.best)) record.best = Math.max(0, Math.min(cap,saved.best));
} catch {}
function save(){
  try { localStorage.setItem("pet234-forest-1",JSON.stringify(record)); }
  catch { $("storage").textContent="浏览器暂时无法保存，本次收集仍可继续。"; }
}
const animal = (family,level=0)=>({family,level,cool:0});
const nameOf = unit => families[unit.family][unit.level][1];
const notice = text => { $("notice").textContent=text; };
function discover(unit){
  const key=unit.family+"-"+unit.level;
  if(record.seen.includes(key))return false;
  record.seen.push(key);save();return true;
}
function reveal(unit){
  const banner=$("reveal");
  banner.textContent="新伙伴　"+families[unit.family][unit.level][0]+" "+nameOf(unit);
  banner.hidden=false;
  clearTimeout(revealTimer);
  revealTimer=setTimeout(()=>{banner.hidden=true;},2200);
}
function book(){
  $("seen").textContent=record.seen.length+" / 10";
  $("best").textContent="最佳纪录　守住 "+record.best+" 波";
  $("album").replaceChildren();
  families.forEach((species,f)=>{
    const heading=document.createElement("h3");
    heading.textContent=f===0?"松果队 · 弹射":"飞羽队 · 减速";
    const row=document.createElement("div");row.className="species";
    species.forEach(([icon,name],level)=>{
      const known=record.seen.includes(f+"-"+level);
      const badge=document.createElement("span"),label=document.createElement("small");
      badge.append(known?icon:"·");label.textContent=known?name:"未发现";
      badge.append(label);row.append(badge);
    });
    $("album").append(heading,row);
  });
}
function reset(){
  cancelAnimationFrame(request);request=0;previous=0;selected=null;drag=null;
  clearTimeout(revealTimer);$("reveal").hidden=true;
  sprites.clear();$("foes").replaceChildren();$("shots").replaceChildren();
  state={phase:"ready",wave:0,nuts:10,life:8,units:Array(16).fill(null),bugs:[],effects:[],spawn:0,remaining:0,id:0};
  state.units[0]=animal(0);state.units[3]=animal(0);state.units[12]=animal(1);
  state.units.filter(Boolean).forEach(discover);
  notice("点两只仓鼠合成兔子，或先扭蛋添个伙伴，再迎战第一波。");
  updateBoard();book();
}
const playable=()=>!["won","lost"].includes(state.phase);
function hud(){
  $("life").textContent=state.life+"/8";$("wave").textContent=(state.wave||1)+"/"+cap;
  $("nuts").textContent=state.nuts;
  $("go").textContent=({active:"暂停",paused:"继续防守",won:"再玩一局",lost:"再玩一局"})[state.phase]||"迎战第 "+(state.wave+1)+" 波";
  $("recruit").disabled=!playable() || state.nuts<5 || state.units.every(Boolean);
}
function updateBoard(){
  state.units.forEach((unit,i)=>{
    const cell=cells[i], other=state.units[selected];
    cell.replaceChildren();
    cell.className="den"+(unit?" filled":"")+(unit?.family===1?" bird":"");
    cell.classList.toggle("selected",selected===i);
    cell.classList.toggle("match",!!unit && !!other && selected!==i && unit.family===other.family && unit.level===other.level && unit.level<4);
    cell.setAttribute("aria-pressed",String(selected===i));
    cell.setAttribute("aria-label","第 "+(i+1)+" 格，"+(unit?nameOf(unit)+"，"+(unit.level+1)+" 级":"空地"));
    if(unit){
      const icon=document.createElement("span"),label=document.createElement("small");
      icon.className="animal";icon.textContent=families[unit.family][unit.level][0];
      label.textContent=nameOf(unit);cell.append(icon,label);
    }
  });
  hud();
}
function choose(i){
  if(!playable())return;
  const target=state.units[i], source=state.units[selected];
  if(selected===i){selected=null;notice("已取消选择。");}
  else if(!source || (target && (source.level!==target.level || source.family!==target.family || source.level===4))){
    selected=i;
    notice(target?nameOf(target)+"已选中。点空位移动，点同种伙伴合成。":"已选中空位，扭出的伙伴会落在这里。");
  }else if(!target){
    state.units[i]=source;state.units[selected]=null;selected=null;notice(nameOf(source)+"已就位。");
  }else{
    const evolved=animal(source.family,source.level+1);
    state.units[i]=evolved;state.units[selected]=null;selected=null;
    const fresh=discover(evolved);
    notice((fresh?"图鉴新发现！":"进化成功！")+nameOf(source)+"合成了"+nameOf(evolved)+"。");
    cells[i].animate?.([{transform:"scale(.8)"},{transform:"scale(1.15)"},{transform:"scale(1)"}],{duration:350});
    if(fresh)reveal(evolved);
    book();
  }
  updateBoard();
}
for(let i=0;i<16;i++){
  const cell=document.createElement("button");cell.type="button";cell.dataset.slot=i;
  cell.onclick=()=>{if(!suppressClick)choose(i);};
  grid.append(cell);cells.push(cell);
}
grid.onpointerdown=e=>{
  const button=e.target.closest(".den");
  if(!button || !playable() || e.button!==0)return;
  drag={id:e.pointerId,slot:Number(button.dataset.slot),x:e.clientX,y:e.clientY};
  button.setPointerCapture(e.pointerId);
};
grid.onpointercancel=()=>{drag=null;};
grid.onpointerup=e=>{
  if(!drag || drag.id!==e.pointerId)return;
  const from=drag;drag=null;
  if(Math.hypot(e.clientX-from.x,e.clientY-from.y)<8)return;
  suppressClick=true;setTimeout(()=>{suppressClick=false;},0);
  const to=document.elementFromPoint(e.clientX,e.clientY)?.closest(".den");
  if(to && Number(to.dataset.slot)!==from.slot && state.units[from.slot]){
    selected=from.slot;choose(Number(to.dataset.slot));
  }
};
$("recruit").onclick=()=>{
  const free=state.units.flatMap((u,i)=>u?[]:[i]);
  if(!playable() || state.nuts<5 || !free.length)return;
  const i=free.includes(selected)?selected:free[Math.floor(Math.random()*free.length)];
  const cleared=state.phase==="ready"?state.wave:state.wave-1;
  const luck=Math.random();
  const level=cleared>=5 && luck<.12?2:cleared>=2 && luck<.30?1:0;
  const unit=animal(Math.random()<.5?0:1,level);
  state.nuts-=5;state.units[i]=unit;
  if(discover(unit))reveal(unit);
  book();selected=null;updateBoard();
  document.querySelector(".knob").animate?.([{transform:"rotate(0)"},{transform:"rotate(180deg)"}],{duration:350});
  cells[i].animate?.([{transform:"rotate(-15deg) scale(.55)"},{transform:"rotate(8deg) scale(1.12)"},{transform:"none"}],{duration:440});
  notice("扭蛋打开了！"+nameOf(unit)+"加入第 "+(i+1)+" 格。");
};
function wave(){
  state.phase="active";state.wave++;state.remaining=5+state.wave;state.spawn=0;
  notice(state.wave%5===0?"虫王将压轴出现，留意队尾！":"虫群出发了。防守时也可以招募、移动和合成。");
  hud();startClock();
}
function pause(){
  cancelAnimationFrame(request);request=0;previous=0;state.phase="paused";
  notice("防守已暂停，可以调整阵地。");hud();
}
$("go").onclick=()=>{
  if(state.phase==="active")pause();
  else if(state.phase==="paused"){state.phase="active";notice("继续防守。");hud();startClock();}
  else if(!playable())reset();
  else wave();
};
$("restart").onclick=()=>{if(!playable() || confirm("重新开始本局？已发现的动物会保留。"))reset();};
document.addEventListener("visibilitychange",()=>{if(document.hidden && state.phase==="active")pause();});

function svg(tag,props){
  const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const [k,v] of Object.entries(props))el.setAttribute(k,v);
  return el;
}
function spawn(){
  const boss=state.remaining===1 && state.wave%5===0;
  const hp=Math.ceil((5+state.wave**1.65*2.25)*(boss?3.4:1));
  const bug={id:++state.id,boss,hp,distance:0,slow:0,x:220,y:48,speed:58+state.wave*2};
  state.bugs.push(bug);state.remaining--;
  const group=svg("g",{}),bg=svg("circle",{r:boss?17:12,fill:boss?"#7c454b":"#586648",stroke:"#fbebc9","stroke-width":1.5});
  const icon=svg("text",{"text-anchor":"middle",y:7,"font-size":boss?24:18});icon.textContent=boss?"🪲":state.wave%2?"🐛":"🐞";
  const count=svg("text",{"text-anchor":"middle",y:-13,"font-size":13,"font-weight":750,fill:"white",stroke:"#354333","stroke-width":3,"paint-order":"stroke"});
  group.append(bg,icon,count);$("foes").append(group);sprites.set(bug.id,{group,count,bg});
}
function strike(from,bug,damage,family){
  state.effects.push({x:from.x,y:from.y,tx:bug.x,ty:bug.y,life:.22,family});
  bug.hp-=damage;
  if(family===1)bug.slow=1.5;
  if(bug.hp<=0){state.nuts+=2;hud();}
}
function attack(unit,i,dt){
  unit.cool=Math.max(0,unit.cool-dt);
  if(unit.cool>0)return;
  const pos={x:94.6+(i%4+.5)*62.7,y:94.6+(Math.floor(i/4)+.5)*62.7};
  const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const range=148+unit.level*9;
  let target=null;
  for(const bug of state.bugs){
    if(bug.hp>0 && near(pos,bug)<=range && (!target || bug.distance>target.distance))target=bug;
  }
  if(!target)return;
  unit.cool=unit.family===0?.91:.8;
  const damage=[3,7,16,37,82][unit.level];
  strike(pos,target,damage,unit.family);
  if(unit.family===0){
    const hit=new Set([target]);
    for(let j=0;j<Math.min(3,unit.level+1);j++){
      const next=state.bugs.find(b=>b.hp>0 && !hit.has(b) && near(target,b)<76);
      if(!next)break;
      strike(target,next,Math.max(1,Math.ceil(damage*.6)),0);
      hit.add(next);target=next;
    }
  }
}
function advance(dt){
  state.spawn-=dt;
  if(state.remaining && state.spawn<=0){spawn();state.spawn=Math.max(.55,1.05-state.wave*.025);}
  for(const bug of state.bugs){
    bug.slow=Math.max(0,bug.slow-dt);bug.distance+=dt*bug.speed*(bug.slow>0?.58:1);
    if(bug.distance>=length){bug.hp=0;state.life=Math.max(0,state.life-(bug.boss?3:1));hud();continue;}
    const p=trail.getPointAtLength(bug.distance);bug.x=p.x;bug.y=p.y;
  }
  state.units.forEach((unit,i)=>{if(unit)attack(unit,i,dt);});
  state.bugs=state.bugs.filter(bug=>{
    const sprite=sprites.get(bug.id);
    if(bug.hp<=0){sprite.group.remove();sprites.delete(bug.id);return false;}
    sprite.group.setAttribute("transform","translate("+bug.x+" "+bug.y+")");
    sprite.count.textContent=bug.hp;
    sprite.bg.setAttribute("stroke",bug.slow>0?"#7ad5ff":"#fbebc9");
    return true;
  });
  state.effects=state.effects.filter(f=>(f.life-=dt)>0);
  $("shots").replaceChildren();
  for(const f of state.effects){
    const t=Math.min(1,(.22-f.life)/.15),dx=f.tx-f.x,dy=f.ty-f.y;
    const color=f.family?"#468ab9":"#d08426";
    $("shots").append(svg("line",{x1:f.x,y1:f.y,x2:f.x+dx*t,y2:f.y+dy*t,stroke:color,"stroke-width":2,opacity:f.life*3}),
      svg("circle",{cx:f.x+dx*t,cy:f.y+dy*t,r:3.6,fill:color,stroke:"#fffae1"}));
  }
  if(state.life===0){state.phase="lost";notice("虫群冲进营地。本局守住 "+(state.wave-1)+" 波，再试一次不同的布阵吧。");hud();}
  else if(!state.remaining && !state.bugs.length){
    state.nuts+=5;record.best=Math.max(record.best,state.wave);save();book();
    state.phase=state.wave===cap?"won":"ready";
    notice(state.phase==="won"?"营地守住了！十波挑战全部完成。":"第 "+state.wave+" 波守住了！获得 5 松果，可以整队后再出发。");
    $("shots").replaceChildren();state.effects=[];hud();
  }
}
function frame(now){
  request=0;
  if(state.phase!=="active")return;
  const dt=previous?Math.min(.075,(now-previous)/1000):0;previous=now;
  advance(dt);
  if(state.phase==="active")request=requestAnimationFrame(frame);
}
function startClock(){previous=0;if(!request)request=requestAnimationFrame(frame);}
reset();

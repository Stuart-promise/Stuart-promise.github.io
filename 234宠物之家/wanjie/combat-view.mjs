import {FOOD_BY_ID} from './food.mjs?v=1';
// Shared small atlases: no per-monster images, filters, blur or unbounded particles.
const monsters=new Image();monsters.src='./assets/monsters.webp';
const walkers=new Image();walkers.src='./assets/hero-motion-v2.webp';
const ingredients=new Image();ingredients.src='./assets/ingredients.webp';
const produce=new Image();produce.src='./assets/produce.webp';
const TAU=Math.PI*2;
const ready=image=>image.complete&&image.naturalWidth>0;
const palette={knife:'#d7f1ff',bow:'#b5ed8b',crossbow:'#ffce86',drone:'#73f4ff',fire:'#ff9a42',magic:'#dcafff',ice:'#acf0ff',wind:'#b2ffe2',lightning:'#c4b0ff',blade:'#fff1b1',thorn:'#b1df81',shield:'#ffdf87'};
const eliteNames=['荆棘树卫','废铁督工','棱镜哨卫'];
export function heroFrame(b){return b.moving?Math.floor(b.stride/18)%4:-1;}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function line(c,x1,y1,x2,y2,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function diamond(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x+r,y);c.lineTo(x,y+r*.55);c.lineTo(x-r,y);c.lineTo(x,y-r*.55);c.closePath();c.fill();}
export function drawIngredient(c,p,b){
  if(b.t<p.ready)return;
  const near=Math.hypot(p.x-b.x,p.y-b.y)<90;
  ellipse(c,p.x,p.y+3,17,6,'#11231f38');
  if(near){c.strokeStyle=p.type==='veg'?'#ddf3ab99':'#edc3ff99';c.lineWidth=1.5;c.beginPath();c.ellipse(p.x,p.y+3,23,10,0,0,TAU);c.stroke();}
  ingredientSprite(c,p.ingredient,b.map,p.x-24,p.y-41,48);
  if(near&&p.ingredient){c.font='11px sans-serif';c.textAlign='center';c.strokeStyle='#153021';c.lineWidth=3;const label=FOOD_BY_ID[p.ingredient]?.name||'香料';c.strokeText(label,p.x,p.y+22);c.fillStyle='#f4f4cf';c.fillText(label,p.x,p.y+22);}
  if(near){const a=.5+Math.sin(b.t*3+p.x)*.3;c.globalAlpha=a;line(c,p.x+17,p.y-38,p.x+17,p.y-30,'#fff6c2');line(c,p.x+13,p.y-34,p.x+21,p.y-34,'#fff6c2');c.globalAlpha=1;}
}
export function drawTelegraph(c,e){
  if(!e.warn)return;const major=e.type!=='normal';c.save();c.translate(e.x,e.y);c.fillStyle=major?'#ff59383d':'#ff593809';c.strokeStyle=major?'#ffe4b7':'#ffbd9899';c.lineWidth=major?2.5:1.5;
  if(e.kind%2===0){c.rotate(e.angle);c.fillRect(0,-19,175,38);c.strokeRect(0,-19,175,38);c.beginPath();c.moveTo(150,-10);c.lineTo(165,0);c.lineTo(150,10);c.stroke();}
  else {c.beginPath();c.arc(0,0,115,0,TAU);c.fill();c.stroke();if(major){c.beginPath();c.arc(0,0,115*(1-e.warn),0,TAU);c.stroke();}}c.restore();
}
export function drawMonster(c,e,b){
  const boss=e.type==='boss',elite=e.type==='elite',size=boss?150:elite?96:52;
  const col=boss?5:elite?4:(e.appearance??e.kind),hover=(b.map===0&&col===2)||(b.map===2&&(col===0||col===2||boss));
  ellipse(c,e.x,e.y+e.r*.35,e.r*.9,e.r*.34,'#10221f52');
  if(boss||elite){c.strokeStyle=boss?'#f191688f':'#ffe0a295';c.lineWidth=boss?3:2;c.beginPath();c.ellipse(e.x,e.y+3,e.r+6,(e.r+6)*.5,0,0,TAU);c.stroke();}
  const bob=hover?Math.sin(b.t*5+e.x)*3:Math.abs(Math.sin((e.stride||0)/11))*1.5;
  c.save();c.translate(e.x,e.y);if(e.face>0)c.scale(-1,1);
  if(e.hit)c.globalAlpha=.72;
  if(ready(monsters))c.drawImage(monsters,col*192,b.map*192,192,192,-size/2,-size+e.r*.5-bob,size,size);
  else diamond(c,0,-e.r,e.r,'#b6c5aa');
  c.restore();
  if(e.slow){c.strokeStyle='#b8f5ff';c.lineWidth=1.5;c.beginPath();c.ellipse(e.x,e.y,e.r+3,e.r*.55,0,0,TAU);c.stroke();}
  if(boss||elite){const width=boss?116:76,y=e.y-size+e.r*.5-10;c.fillStyle='#152825db';c.fillRect(e.x-width/2-2,y-2,width+4,9);c.fillStyle=boss?'#f18a69':'#f0ce7e';c.fillRect(e.x-width/2,y,width*Math.max(0,e.hp/e.max),5);
    c.font='bold 11px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#14201d';const label=boss?'首领 · '+b.bossName:'精英 · '+eliteNames[b.map];c.strokeText(label,e.x,y-7);c.fillStyle='#fff0ca';c.fillText(label,e.x,y-7);
  }
}
export function drawHero(c,b,gender){
  ellipse(c,b.x,b.y+1,18,6,'#0b201b50');
  c.save();c.translate(b.x,b.y);if(b.face<0)c.scale(-1,1);c.globalAlpha=b.inv>0?.65:1;
  const frame=heroFrame(b),row=b.hero===0?gender:b.hero+1;
  if(ready(walkers))c.drawImage(walkers,(frame<0?0:frame+1)*160,row*160,160,160,-43,-82,86,86);
  c.restore();
  if(b.weapons.some(w=>w.id==='drone')){const x=b.x+Math.cos(b.t*1.8)*34,y=b.y-50+Math.sin(b.t*1.8)*10;line(c,x-13,y,x+13,y,'#356d81',3);diamond(c,x,y,9,'#8defff');ellipse(c,x,y,3,3,'#f4ffff');}
}
export function drawProjectile(c,p,b){
  c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));c.lineCap='round';
  switch(p.id){
    case 'knife':
      line(c,-21,0,-5,0,p.back?'#89e7db77':'#d6eaff66',3);diamond(c,5,0,13,'#e6f5ff');line(c,-12,-4,-12,4,'#d8ae6c',2);line(c,-18,0,-12,0,'#836346',3);line(c,0,0,15,0,'#8aa7c2',1);break;
    case 'bow':
      line(c,-29,0,-12,0,'#a4e87066',2);line(c,-17,0,14,0,'#e1c28e',2);diamond(c,16,0,7,'#d7f7b5');line(c,-16,0,-23,-5,'#87c76a',2);line(c,-16,0,-23,5,'#87c76a',2);break;
    case 'crossbow':
      line(c,-30,0,-10,0,'#ffbd6266',4);line(c,-13,0,12,0,'#4b5361',5);diamond(c,13,0,10,'#e8dbb8');line(c,-13,-5,-8,0,'#c78f58',3);line(c,-13,5,-8,0,'#c78f58',3);break;
    case 'fire':
      c.fillStyle='#ef583eaa';c.beginPath();c.moveTo(9,0);c.quadraticCurveTo(-8,-15,-29,-3);c.lineTo(-20,2);c.lineTo(-30,6);c.quadraticCurveTo(-3,14,9,0);c.fill();ellipse(c,0,0,10,7,'#ffae48');ellipse(c,3,0,5,4,'#fff3b0');break;
    case 'magic':
      diamond(c,-17,0,6,'#a986e366');diamond(c,-28,0,3,'#d8a8ff66');ellipse(c,0,0,9,9,'#ad75e988');diamond(c,2,0,10,'#e2beff');line(c,2,-6,2,6,'#fff1ff',2);break;
    case 'drone':
      line(c,-29,0,-4,0,'#29b9e86b',7);line(c,-18,0,10,0,'#77f6ff',4);line(c,-7,0,11,0,'#efffff',2);break;
  }c.restore();
}
function polygon(c,r,n,angle=0){c.beginPath();for(let i=0;i<n;i++){const a=angle+i*TAU/n,x=Math.cos(a)*r,y=Math.sin(a)*r;if(!i)c.moveTo(x,y);else c.lineTo(x,y);}c.closePath();}
function bolt(c,x,y,t){c.beginPath();c.moveTo(0,0);for(let i=1;i<7;i++){const f=i/7,off=Math.sin(i*9+t*18)*11;c.lineTo(x*f+off,y*f-off);}c.lineTo(x,y);c.stroke();}
export function drawEffect(c,e,b){
  const life=Math.max(0,e.t/e.max),progress=1-life;c.save();c.translate(e.x,e.y);c.globalAlpha=Math.min(1,life*2);c.lineCap='round';c.lineJoin='round';
  const color=palette[e.weapon||e.id]||'#fff4b7';
  if(e.id==='impact'){
    c.strokeStyle=color;c.lineWidth=2;for(let i=0;i<4;i++){const a=i*TAU/4+.4,r=5+progress*12;c.beginPath();c.moveTo(Math.cos(a)*r*.45,Math.sin(a)*r*.45);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke();}
  }else if(e.id==='harvest'){
    ingredientSprite(c,e.ingredient,b.map,-15,-30-progress*24,30);c.strokeStyle='#e9ffd0';c.lineWidth=2;for(let i=0;i<3;i++){const a=i*TAU/3;line(c,Math.cos(a)*(8+progress*18),Math.sin(a)*(8+progress*18)-10,Math.cos(a)*(11+progress*18),Math.sin(a)*(11+progress*18)-14,'#eeffc0',2);}
  }else if(e.id==='ice'){
    c.strokeStyle='#b9f5ff';c.lineWidth=3;c.beginPath();c.arc(0,0,e.r*(.7+progress*.3),0,TAU);c.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*e.r*.86,y=Math.sin(a)*e.r*.86;c.save();c.translate(x,y);c.rotate(a);diamond(c,0,0,8+progress*7,'#b4edffbb');line(c,-10,0,10,0,'#f2ffff',1);c.restore();}
  }else if(e.id==='wind'){
    c.strokeStyle=e.combo?'#ffc483':'#b9ffe9';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,e.r*(.45+i*.2),progress*4+i*2,progress*4+i*2+2.4);c.stroke();}
    for(let i=0;i<3;i++){const a=progress*6+i*TAU/3;diamond(c,Math.cos(a)*e.r*.8,Math.sin(a)*e.r*.8,5,e.combo?'#ff9e48':'#e3ffdc');}
  }else if(e.id==='lightning'){
    c.lineWidth=3;c.strokeStyle='#b6afff';for(const target of e.targets||[])bolt(c,target.x-e.x,target.y-e.y,b.t);c.lineWidth=1;c.strokeStyle='#f4f1ff';for(const target of e.targets||[])bolt(c,target.x-e.x,target.y-e.y,b.t);
    polygon(c,18+progress*5,6,progress*2);c.stroke();
  }else if(e.id==='blade'){
    for(let i=0;i<3;i++){const a=progress*TAU+i*TAU/3;c.strokeStyle='#ffe9a38c';c.lineWidth=3;c.beginPath();c.arc(0,0,e.r*.8,a-.65,a);c.stroke();c.save();c.translate(Math.cos(a)*e.r*.8,Math.sin(a)*e.r*.8);c.rotate(a+Math.PI/2);diamond(c,0,0,16,'#e4eff7');diamond(c,0,0,6,'#b99d61');c.restore();}
  }else if(e.id==='thorn'){
    c.strokeStyle='#a1cc6d';c.lineWidth=3;for(let i=0;i<7;i++){const a=i*TAU/7;c.save();c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(e.r*.2,-22,e.r*(.7+progress*.25),0);c.stroke();c.fillStyle='#b5df87';c.beginPath();c.moveTo(e.r*.5,0);c.lineTo(e.r*.5-6,-17);c.lineTo(e.r*.5+8,-2);c.fill();c.restore();}
  }else if(e.id==='shield'){
    c.strokeStyle='#ffe3a3';c.lineWidth=3;polygon(c,e.r*(.85+progress*.15),6,Math.PI/6);c.stroke();c.globalAlpha*=.12;c.fillStyle='#ffe3a3';c.fill();c.globalAlpha=Math.min(1,life*2);for(let i=0;i<6;i++){const a=i*TAU/6;diamond(c,Math.cos(a)*e.r*.86,Math.sin(a)*e.r*.86,5,'#fff3ce');}
  }else if(e.id==='fire'){
    c.strokeStyle='#ffac5f';c.lineWidth=5;c.beginPath();c.arc(0,0,e.r*(.3+progress*.7),0,TAU);c.stroke();for(let i=0;i<6;i++){const a=i*TAU/6,r=e.r*progress;ellipse(c,Math.cos(a)*r,Math.sin(a)*r,6*life+2,6*life+2,'#ffd08e');}
  }else if(e.id==='danger'){
    c.strokeStyle='#ff9b75';c.lineWidth=4;c.beginPath();c.arc(0,0,e.r*(.5+progress*.5),0,TAU);c.stroke();
  }c.restore();
}

function ingredientSprite(c,id,map,x,y,size){const f=FOOD_BY_ID[id];if(f&&ready(produce))c.drawImage(produce,f.index%4*128,Math.floor(f.index/4)*128,128,128,x,y,size,size);else if(ready(ingredients))c.drawImage(ingredients,map*128,128,128,128,x,y,size,size);}

import {FISH} from './model.mjs?v=1';
import {drawFish} from './fish-art.mjs?v=1';
// A small illustrated fishing diorama. Static scenery is painted once per map.
const W=1000,H=600;
const THEMES={
 lake:{sky:'#e6efdc',sun:'#fff2c7',far:'#bdd1b2',near:'#8eb59b',land:'#477c68',bank:'#73966b',water:['#8bd3ba','#62bba9','#3b9f97','#287d84'],sand:'#b3b97e',ink:'#244c4c'},
 river:{sky:'#f0ead6',sun:'#fff5cc',far:'#d1c9ae',near:'#a2b49c',land:'#657e62',bank:'#a3ac75',water:['#a9ccb2','#78b5a0','#51978d','#33777b'],sand:'#bdb78a',ink:'#34564d'},
 sea:{sky:'#dcecf1',sun:'#fff4ce',far:'#c4d3d1',near:'#91b8b7',land:'#5e8580',bank:'#a6ba9a',water:['#80d2cd','#4cb5c4','#2c88ad','#245b89'],sand:'#a5b8a4',ink:'#224b69'}
};
function shape(c,points,fill){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function oval(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function round(c,x,y,w,h,r,color){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=color;c.fill();}
function tree(c,x,y,size,color){line(c,[[x,y],[x,y-size*.8]],'#5c7061',size*.07);oval(c,x,y-size*.72,size*.28,size*.4,color);oval(c,x-size*.17,y-size*.57,size*.22,size*.28,color);oval(c,x+size*.19,y-size*.54,size*.22,size*.28,color);}
// Two illustrated anglers are rasterized once. The render loop only blits them.
function path(c,d,fill,stroke=null,width=1){const p=new Path2D(d);if(fill){c.fillStyle=fill;c.fill(p);}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke(p);}}
function gradient(c,top,bottom,y1,y2){const g=c.createLinearGradient(0,y1,0,y2);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
function anglerSprite(girl){
 const image=document.createElement('canvas');image.width=270;image.height=300;const c=image.getContext('2d');c.scale(2,2);c.translate(58,-70);
 // Chair, planted feet, and a tiny woven creel make the pose belong to the pier.
 oval(c,1,207,39,5,'#2f51402c');round(c,-20,186,36,7,4,'#94754d');line(c,[[-17,191],[-25,205]],'#6b6553',3);line(c,[[11,190],[17,206]],'#6b6553',3);
 round(c,-43,183,23,23,5,'#b7945e');round(c,-44,181,25,6,3,'#d5b478');for(let y=190;y<205;y+=5)line(c,[[-41,y],[-23,y]],'#886d4777',1);for(let x=-39;x<-23;x+=5)line(c,[[x,188],[x,205]],'#ead4a34d',1);
 path(c,'M-11 177 Q0 173 11 181 L29 184 Q34 188 30 196 L26 204 L15 203 L19 192 L1 192 Q-13 192-15 183Z',gradient(c,girl?'#607383':'#3d746a',girl?'#3f4c65':'#264f4a',177,204),'#294b48',1);
 path(c,'M0 181 Q14 178 20 187 L39 195 L36 204 L26 204 L28 198 L9 194 Q-1 191 0 181Z',girl?'#6d8190':'#528879','#355e59',1);
 round(c,13,199,18,9,3,girl?'#764f46':'#795d42');round(c,26,200,20,9,3,girl?'#a67762':'#957449');round(c,13,206,19,3,1,'#3e4e46');round(c,26,207,20,3,1,'#3e4e46');line(c,[[20,201],[26,201]],'#eed5ab',1.2);line(c,[[32,202],[38,202]],'#eed5ab',1.2);
 if(girl){path(c,'M-16 119 Q-33 127-29 159 Q-29 178-14 185 Q-20 169-14 158 L6 144Z',gradient(c,'#765447','#3e4246',120,185));path(c,'M-21 139 Q-39 162-26 182 Q-17 189-22 201 Q-10 190-15 179 Q-27 166-14 147Z','#785a50');for(let i=0;i<6;i++)oval(c,-24+Math.sin(i*1.6)*3,160+i*5,5,3.1,i%2?'#ac8068':'#674b45');round(c,-28,184,9,4,2,'#dda07c');}
 // Layered blouse, vest panels, stitching, pockets and a scarf instead of a flat body block.
 path(c,'M-16 155 Q-22 159-21 174 L-17 187 Q-2 192 18 185 L17 159 Q10 151-1 151Z',gradient(c,girl?'#fff0d2':'#eee5c8',girl?'#dbc8a6':'#c6d3b8',152,190),'#6c8774',.8);
 path(c,'M-15 154 L-4 156 L-8 178 L-14 187 L-22 181 L-23 163Z',gradient(c,girl?'#da907a':'#4d8575',girl?'#ac665c':'#2c6258',152,187));
 path(c,'M7 156 L17 157 Q23 165 19 185 L7 188 L5 172Z',gradient(c,girl?'#d68c78':'#508a75',girl?'#ab5d55':'#2b6655',155,188));
 path(c,'M-17 168 L-8 169 L-10 179 L-18 178Z',girl?'#e3aa8a':'#7ca390','#e8e1b1',.7);path(c,'M9 169 L19 167 L18 178 L10 179Z',girl?'#ebb497':'#7aa08a','#e8e1b1',.7);
 oval(c,-13,172,1.3,1.3,'#dcc17f');oval(c,14,172,1.3,1.3,'#dcc17f');line(c,[[-13,181],[-9,158]],'#f5edcd88',.8);line(c,[[11,182],[10,160]],'#f5edcd88',.8);
 round(c,-16,183,32,4,1,girl?'#537e77':'#b2935f');round(c,-1,182,7,6,1,'#e0bd74');round(c,1,183,3,3,1,'#816d47');
 round(c,-5,146,14,14,5,'#e8b79b');path(c,'M-10 155 L0 152 L9 157 L1 165Z',girl?'#719c93':'#d5a55d');path(c,'M0 160 L7 162 L10 177 L2 174Z',girl?'#8eb8a9':'#e0b86d');
 // Forearms and fingers wrap naturally around the separate animated rod handle.
 path(c,'M13 159 Q21 157 26 171 L35 167 L39 171 Q33 183 22 178 L15 171Z',gradient(c,'#ffddbd','#dfad8d',158,182),'#a17e66',.8);
 path(c,'M12 156 Q20 156 25 166 L20 171 L11 166Z',girl?'#f1c3a1':'#d5e3ca','#709280',.7);path(c,'M29 168 Q35 161 39 166 L42 171 Q38 177 33 175Z','#f4c9a6','#ac8268',.7);line(c,[[35,166],[38,171]],'#cb9b7c',.7);line(c,[[32,168],[35,173]],'#cb9b7c',.7);
 // Shaped cheeks, chin, two reflective eyes, small nose and a warm expression.
 path(c,'M-21 126 Q-20 108 0 108 Q22 107 25 128 Q26 148 9 157 Q-2 161-17 148 Q-24 140-21 126Z',gradient(c,'#ffe7ca','#efbd9e',111,158),'#bd9679',.7);
 oval(c,-21,136,4,7,'#edb89b');oval(c,-22,136,1.5,3.2,'#d69d84');oval(c,21,137,3,6,'#f2c4a4');
 for(const [x,y,k] of [[-6,134,.86],[11,133,1]]){c.save();c.translate(x,y);c.scale(k,1);path(c,'M-5-2 Q0-7 5-2 Q5 6 0 7 Q-5 6-5-2Z','#fff7e8');oval(c,1,1,3.3,5,girl?'#779c94':'#9b865c');oval(c,1,1,1.8,4,'#304f4a');oval(c,0,-2,1.5,1.8,'#ffffff');oval(c,2,3,1,1,'#dcecd1');path(c,'M-5-2 Q0-7 5-2',null,girl?'#63473f':'#575549',1.6);if(girl)line(c,[[4,-3],[6,-5]],'#63473f',1);c.restore();}
 path(c,'M-11 124 Q-6 121-1 124 M7 122 Q12 120 17 123',null,girl?'#745248':'#6f6048',1.5);path(c,'M11 140 Q15 143 11 144',null,'#cf977b',.9);path(c,'M3 149 Q8 152 13 148',null,'#b87569',1.1);oval(c,-9,144,5,2.4,'#ed9f8a55');oval(c,18,143,4.5,2.3,'#ed9f8a66');
 // Hair is built from curved locks with strands and highlights, leaving both eyes visible.
 const hair=gradient(c,girl?'#9a6f56':'#a4834c',girl?'#604a45':'#655642',108,145);
 path(c,girl?'M-24 129 Q-30 109-15 102 Q3 95 19 109 L25 127 Q17 126 13 114 Q2 125-10 125 L-5 114 Q-13 130-19 138 L-21 149 Q-29 139-24 129Z':'M-24 129 Q-29 110-13 104 L-16 98 Q-4 96 4 105 Q18 100 24 115 L24 130 L16 126 L12 115 L7 128 L0 119 L-8 132 L-9 119 L-19 139 L-22 148Z',hair,'#685344',.7);
 path(c,girl?'M-19 120 Q-17 110-8 108 M-8 119 Q2 111 10 111 M17 115 L21 123':'M-21 121 L-16 111 L-7 108 M-6 112 L1 108 L6 113 M10 109 L17 115',null,girl?'#d4a27d99':'#d2b37a99',1.5);
 // Broad brim and asymmetric decoration differentiate the two silhouettes.
 if(girl){path(c,'M-25 112 Q-26 92-8 90 Q11 87 22 104 L27 113Z',gradient(c,'#b6c8bc','#6f9d98',91,114),'#668e87',.9);oval(c,1,113,34,5,'#759b94');path(c,'M-22 108 Q0 113 22 109',null,'#f1d6a7',4);line(c,[[-6,93],[0,106]],'#dfebe0aa',1);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;oval(c,-22+Math.cos(a)*4,108+Math.sin(a)*4,3.5,3.5,'#efad91');}oval(c,-22,108,2.5,2.5,'#f7dfac');path(c,'M-23 113L-31 124L-25 123L-22 118L-19 125L-16 122Z','#d9b796');}
 else{path(c,'M-24 111 L-20 94 Q-13 87 3 90 L18 95 L23 112Z',gradient(c,'#eedca6','#c3a466',90,115),'#a38e5d',.8);oval(c,0,114,35,5.3,'#d7bd7c');path(c,'M-23 108 Q0 113 22 109',null,'#4f7a65',5);path(c,'M-18 96 Q-3 92 13 98 M-19 101 Q-3 98 17 103',null,'#fff4ca88',.8);path(c,'M17 107 Q23 101 28 106 L30 103 L30 111 L27 108 Q23 112 17 107Z','#e8c775');oval(c,20,106,1,1,'#54765d');}
 return image;
}
export class FishingScene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.background=document.createElement('canvas');this.time=0;this.map='';this.anglers=[anglerSprite(false),anglerSprite(true)];this.schools=[];this.resize();}
 resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight;this.dpr=Math.min(window.devicePixelRatio||1,1.5);this.width=Math.max(1,Math.round(w*this.dpr));this.height=Math.max(1,Math.round(h*this.dpr));if(this.canvas.width!==this.width||this.canvas.height!==this.height){this.canvas.width=this.width;this.canvas.height=this.height;}this.map='';}
 build(map){this.map=map;this.schools=Array.from({length:16},(_,i)=>{const depth=i%4,fish=FISH.filter(f=>f.map===map&&f.depth===depth)[Math.floor(i/4)%2];return {id:fish.id,depth,dir:i%2?1:-1,speed:6+i%4*2,size:(fish.shape==='long'?88:66)+(i%3)*7};});const t=THEMES[map]||THEMES.lake,b=this.background;b.width=Math.round(W*this.dpr);b.height=Math.round(H*this.dpr);const c=b.getContext('2d');c.scale(this.dpr,this.dpr);c.fillStyle=t.sky;c.fillRect(0,0,W,H);
  oval(c,742,69,35,35,t.sun);oval(c,742,69,51,51,t.sun+'45');
  for(const [x,y,k] of [[270,43,1],[530,74,.7],[864,42,.8]]){oval(c,x,y,37*k,9*k,'#ffffff7a');oval(c,x-15*k,y-6*k,20*k,12*k,'#ffffff7a');oval(c,x+15*k,y-3*k,24*k,10*k,'#ffffff7a');}
  shape(c,[[0,146],[50,102],[109,114],[199,47],[302,145],[361,100],[437,145],[517,84],[618,146],[729,119],[815,78],[920,147],[1000,111],[1000,232],[0,232]],t.far);
  shape(c,[[0,152],[75,129],[150,160],[242,104],[357,175],[434,143],[535,182],[624,129],[744,162],[826,135],[921,164],[1000,141],[1000,238],[0,238]],t.near);
  if(map==='sea'){
   shape(c,[[0,190],[76,158],[114,166],[135,210],[0,223]],t.land);shape(c,[[820,205],[860,171],[915,161],[951,190],[1000,184],[1000,226]],t.land);
   for(const [x,y] of [[425,78],[456,86],[647,53]]){c.beginPath();c.moveTo(x-8,y);c.quadraticCurveTo(x-3,y-6,x,y);c.quadraticCurveTo(x+4,y-6,x+9,y);c.strokeStyle='#6d9999';c.lineWidth=1.5;c.stroke();}
  }else{
   for(let i=0;i<20;i++){const x=i*53-7;tree(c,x,193+Math.sin(i*3)*7,34+(i%4)*9,i%2?t.land:t.bank);}
  }
  // Four depth bands are deliberately distinct, even on a small phone display.
  for(let depth=0;depth<4;depth++){c.fillStyle=t.water[depth];c.fillRect(0,215+depth*96.25,W,97);if(depth){c.setLineDash([3,9]);line(c,[[210,215+depth*96.25],[790,215+depth*96.25]],'#e7fff334',1);c.setLineDash([]);}}
  c.fillStyle=t.water[0];c.fillRect(0,197,W,25);line(c,[[0,207],[1000,207]],'#ddf5d66b',3);
  for(let i=0;i<16;i++){const x=40+(i*91)%930,y=230+(i*37)%330;c.globalAlpha=.15;line(c,[[x,y],[x+24+(i%3)*10,y]],'#e2fff2',2);}c.globalAlpha=1;
  shape(c,[[0,551],[79,566],[147,555],[251,581],[360,570],[455,589],[580,574],[668,582],[783,561],[886,572],[1000,547],[1000,600],[0,600]],t.sand);
  for(let i=0;i<11;i++){let x=(i*137+35)%1000,y=572+(i%3)*9;oval(c,x,y,15+i%4*7,5+i%3*3,i%2?'#839d8d':'#91a797');oval(c,x-3,y-3,9+i%3*4,2,'#cad5b45e');}
  for(let i=0;i<15;i++){const x=(i*83+13)%1000,y=578+(i%3)*8,green=map==='sea'?(i%2?'#bb9788':'#7fa990'):'#548c7d';for(let j=0;j<3;j++){c.beginPath();c.moveTo(x+j*5,y);c.bezierCurveTo(x-10+j*6,y-20,x+13-j*3,y-34,x+j*8-5,y-50-(i%4)*8);c.strokeStyle=green;c.lineWidth=map==='sea'?5:3;c.lineCap='round';c.stroke();}if(map==='sea'){line(c,[[x,y-21],[x-12,y-34]],green,4);line(c,[[x+7,y-33],[x+20,y-46]],green,4);}}
  // Near banks and timber piers anchor both characters in the same place.
  for(const side of [0,1]){c.save();if(side){c.translate(W,0);c.scale(-1,1);}shape(c,[[0,179],[40,187],[72,180],[111,202],[97,241],[0,253]],t.bank);shape(c,[[0,230],[97,224],[83,245],[0,254]],'#d0bd8b');for(const x of [31,145]){round(c,x,212,12,68,3,'#6d6955');round(c,x+2,214,3,58,1,'#999174');}round(c,0,202,188,17,3,'#ac8c60');round(c,0,201,188,5,2,'#dcc08a');for(let x=8;x<183;x+=21)line(c,[[x,205],[x,216]],'#876c4e',1);round(c,11,195,6,31,2,'#ddbc83');round(c,171,195,6,31,2,'#ddbc83');
   if(map==='river'){for(let i=0;i<9;i++){const x=i*6+5;line(c,[[x,202],[x+Math.sin(i)*8,153-i%4*8]],'#799367',2);round(c,x+Math.sin(i)*8-2,147-i%4*8,4,15,2,'#9c8058');}}else{for(let i=0;i<6;i++){line(c,[[i*8+5,201],[i*8+2,181-i%3*7]],t.land,3);}}
   c.restore();}
  c.font='600 10px system-ui, sans-serif';c.textAlign='left';c.fillStyle='#edfff29c';['01 · 浅水','02 · 中层','03 · 深水','04 · 深渊'].forEach((label,i)=>c.fillText(label,20,296+i*96));
 }
 draw(view={},dt=.033){if(!this.ctx)return;this.time+=Math.min(.1,Math.max(0,dt));const map=view.map||'lake';if(this.map!==map)this.build(map);const c=this.ctx,t=THEMES[map]||THEMES.lake;c.setTransform(this.width/W,0,0,this.height/H,0,0);c.drawImage(this.background,0,0,W,H);
  const now=this.time;
  // Fewer than twenty simple fish; no physics, particles, images, or per-frame DOM writes.
  for(let i=0;i<this.schools.length;i++){const f=this.schools[i];let x=110+((i*137+now*f.speed)%780);if(f.dir<0)x=W-x;const y=263+f.depth*91+(Math.floor(i/4)%2?17:-10)+Math.sin(now*.65+i*2)*5;c.globalAlpha=f.depth===view.depth?.86:.63;c.save();c.translate(x,y);c.scale(1,(this.width/W)/(this.height/H));drawFish(c,f.id,0,0,f.size,f.dir);c.restore();c.globalAlpha=1;}
  for(let i=0;i<9;i++){const x=233+i*71+Math.sin(now*.8+i)*6,y=570-((now*11+i*43)%320);c.beginPath();c.arc(x,y,1.5+i%3,0,Math.PI*2);c.strokeStyle='#e3fff32a';c.lineWidth=1;c.stroke();}
  for(let i=0;i<8;i++){const x=220+i*76,y=205+Math.sin(now*.6+i)*3;line(c,[[x,y],[x+28+Math.sin(now+i)*8,y]],'#f3ffe759',1.5);}
  const players=Array.isArray(view.players)?view.players:[];
  for(const player of players.slice(0,2))this.player(c,player,!!view.duel);
  if(!players.some(p=>p.side===1)){c.font='12px system-ui, sans-serif';c.textAlign='center';c.fillStyle='#315e59';c.fillText('留一个位置，等朋友来',871,160);c.strokeStyle='#5c817180';c.lineWidth=1.4;c.setLineDash([4,4]);c.beginPath();c.roundRect(847,171,45,27,6);c.stroke();c.setLineDash([]);}
  if(view.duel){const pulse=.5+Math.sin(now*7)*.5;c.strokeStyle=`rgba(255,231,155,${.2+pulse*.3})`;c.lineWidth=3;c.beginPath();c.ellipse(500,247,50+pulse*8,10+pulse*2,0,0,Math.PI*2);c.stroke();}
 }
 player(c,p,duel){const right=p.side===1,x=right?863:137,d=right?-1:1,phase=p.phase||'idle',active=['waiting','bite','duel'].includes(phase),bite=phase==='bite'||phase==='duel',depth=Math.max(0,Math.min(3,Number(p.depth)||0)),hookX=duel?500:x+d*(163+depth*28),hookY=260+depth*91,now=this.time;
  const aspect=(this.height/H)/(this.width/W),tipX=x+d*97*aspect,tipY=136+(bite?Math.sin(now*10)*3:0);
  if(active){c.strokeStyle='#f5f2ccad';c.lineWidth=1.15;c.beginPath();c.moveTo(tipX,tipY);c.quadraticCurveTo((tipX+hookX)/2,158,hookX,216);c.lineTo(hookX,hookY);c.stroke();const bob=bite?Math.sin(now*12)*3:Math.sin(now*2)*1.5;c.beginPath();c.ellipse(hookX,215+bob,13+(bite?5:0),3,0,0,Math.PI*2);c.strokeStyle=bite?'#ffedb7':'#eaffeb8a';c.stroke();oval(c,hookX,211+bob,3.2,6,'#f8e9ba');round(c,hookX-2.6,206+bob,5.2,6,2,'#dd775c');c.beginPath();c.arc(hookX+2,hookY,4,0,Math.PI*1.45);c.strokeStyle='#f3e4a0';c.lineWidth=1.8;c.stroke();if(bite){oval(c,hookX-13,hookY,19,7,'#eddea561');c.font='bold 21px system-ui';c.fillStyle='#ffedaa';c.textAlign='center';c.fillText('!',hookX,193+Math.sin(now*8)*2);}}
  c.save();c.translate(x,0);c.scale(d*aspect,1);c.drawImage(this.anglers[right?1:0],-58,70,135,150);
  c.restore();line(c,[[x+d*35*aspect,169],[x+d*55*aspect,152],[tipX,tipY]],'#6f5c40',3);line(c,[[x+d*35*aspect,169],[x+d*46*aspect,160]],'#c4aa6b',4);
  if(p.fishId){const fishX=x+d*72*aspect;line(c,[[x+d*38*aspect,170],[fishX,175]],'#a8bfa1',1);c.save();c.translate(fishX,183);c.scale(aspect,1);c.rotate(-.16*d);drawFish(c,p.fishId,0,0,64,d);c.restore();}
  // Put readable labels beside the angler, clear of the in-scene toolbar and face.
  c.textAlign='center';const name=String(p.name||'钓鱼人').slice(0,16),label=String(p.catchText||name).slice(0,40),font=Math.min(27,Math.max(11,10*H/(this.height/this.dpr))),height=font*1.45;
  c.font=`600 ${font}px system-ui, sans-serif`;const width=Math.min(330,c.measureText(label).width+20),center=Math.max(width/2+10,Math.min(W-width/2-10,x+d*110*aspect));
  round(c,center-width/2,96-height/2,width,height,8,p.catchText?'#fff2c8':'#f8f1dce8');c.fillStyle=p.catchText?'#7a6037':'#355d53';c.fillText(label,center,96+font*.32,width-18);

 }
 dispose(){this.ctx=null;this.background.width=this.background.height=1;for(const image of this.anglers)image.width=image.height=1;this.anglers=[];}
}

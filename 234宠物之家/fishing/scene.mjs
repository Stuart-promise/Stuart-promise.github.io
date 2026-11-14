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
function fish(c,x,y,size,color,dir=1,phase=0){c.save();c.translate(x,y);c.scale(dir,1);shape(c,[[-size*.85,0],[-size*1.4,-size*.44],[-size*1.32,size*.4]],color);oval(c,0,0,size,size*.43,color);shape(c,[[-size*.4,-size*.29],[0,-size*.68],[size*.25,-size*.25]],color);c.globalAlpha*=.38;shape(c,[[-size*.1,0],[-size*.45,size*.53],[size*.3,size*.25]],'#e8fff0');c.globalAlpha/= .38;oval(c,size*.59,-size*.07,Math.max(1.2,size*.075),Math.max(1.2,size*.075),'#eaf9e1');oval(c,size*.61,-size*.07,Math.max(.7,size*.037),Math.max(.7,size*.037),'#214f5c');c.strokeStyle='#f3fff34a';c.lineWidth=1;c.beginPath();c.arc(size*.22,0,size*.28,-1.1,1.15);c.stroke();c.restore();}
export class FishingScene{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.background=document.createElement('canvas');this.time=0;this.map='';this.resize();}
 resize(){const rect=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,1.5);this.width=Math.max(1,Math.round(rect.width*this.dpr));this.height=Math.max(1,Math.round(rect.height*this.dpr));if(this.canvas.width!==this.width||this.canvas.height!==this.height){this.canvas.width=this.width;this.canvas.height=this.height;}this.map='';}
 build(map){this.map=map;const t=THEMES[map]||THEMES.lake,b=this.background;b.width=Math.round(W*this.dpr);b.height=Math.round(H*this.dpr);const c=b.getContext('2d');c.scale(this.dpr,this.dpr);c.fillStyle=t.sky;c.fillRect(0,0,W,H);
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
  for(let i=0;i<16;i++){const depth=i%4,dir=i%2?1:-1,speed=5+(i%4)*2;let x=100+((i*131+now*speed) % 800);if(dir<0)x=W-x;const y=264+depth*91+Math.sin(now*.65+i*2)*9;c.globalAlpha=.2+(depth===view.depth ? .18 : 0);fish(c,x,y,9+(i%5)*3,map==='sea'?'#d5e7b7':'#d4e9b2',dir);c.globalAlpha=1;}
  for(let i=0;i<9;i++){const x=233+i*71+Math.sin(now*.8+i)*6,y=570-((now*11+i*43)%320);c.beginPath();c.arc(x,y,1.5+i%3,0,Math.PI*2);c.strokeStyle='#e3fff32a';c.lineWidth=1;c.stroke();}
  for(let i=0;i<8;i++){const x=220+i*76,y=205+Math.sin(now*.6+i)*3;line(c,[[x,y],[x+28+Math.sin(now+i)*8,y]],'#f3ffe759',1.5);}
  const players=Array.isArray(view.players)?view.players:[];
  for(const player of players.slice(0,2))this.player(c,player,!!view.duel);
  if(!players.some(p=>p.side===1)){c.font='12px system-ui, sans-serif';c.textAlign='center';c.fillStyle='#315e59';c.fillText('留一个位置，等朋友来',871,160);c.strokeStyle='#5c817180';c.lineWidth=1.4;c.setLineDash([4,4]);c.beginPath();c.roundRect(847,171,45,27,6);c.stroke();c.setLineDash([]);}
  if(view.duel){const pulse=.5+Math.sin(now*7)*.5;c.strokeStyle=`rgba(255,231,155,${.2+pulse*.3})`;c.lineWidth=3;c.beginPath();c.ellipse(500,247,50+pulse*8,10+pulse*2,0,0,Math.PI*2);c.stroke();}
 }
 player(c,p,duel){const right=p.side===1,x=right?863:137,d=right?-1:1,phase=p.phase||'idle',active=['waiting','bite','duel'].includes(phase),bite=phase==='bite'||phase==='duel',depth=Math.max(0,Math.min(3,Number(p.depth)||0)),hookX=duel?500:x+d*(163+depth*28),hookY=260+depth*91,now=this.time;
  const tipX=x+d*97,tipY=136+(bite?Math.sin(now*10)*3:0);
  if(active){c.strokeStyle='#f5f2ccad';c.lineWidth=1.15;c.beginPath();c.moveTo(tipX,tipY);c.quadraticCurveTo((tipX+hookX)/2,158,hookX,216);c.lineTo(hookX,hookY);c.stroke();const bob=bite?Math.sin(now*12)*3:Math.sin(now*2)*1.5;c.beginPath();c.ellipse(hookX,215+bob,13+(bite?5:0),3,0,0,Math.PI*2);c.strokeStyle=bite?'#ffedb7':'#eaffeb8a';c.stroke();oval(c,hookX,211+bob,3.2,6,'#f8e9ba');round(c,hookX-2.6,206+bob,5.2,6,2,'#dd775c');c.beginPath();c.arc(hookX+2,hookY,4,0,Math.PI*1.45);c.strokeStyle='#f3e4a0';c.lineWidth=1.8;c.stroke();if(bite){fish(c,hookX-16,hookY,18,'#f0ce83',1);c.font='bold 21px system-ui';c.fillStyle='#ffedaa';c.textAlign='center';c.fillText('!',hookX,193+Math.sin(now*8)*2);}}
  c.save();c.translate(x,0);c.scale(d,1);
  oval(c,-2,204,31,5,'#384f4433');round(c,-17,188,26,6,3,'#644e3b');line(c,[[-14,192],[-21,204]],'#6c6351',3);line(c,[[4,192],[12,204]],'#6c6351',3);
  // Bent knees and shoes rest on the pier, never float above it.
  line(c,[[-6,184],[17,186],[20,202]],right?'#566880':'#507366',9);line(c,[[1,184],[24,191],[31,201]],right?'#5b6d88':'#527f70',8);round(c,15,199,15,6,3,'#4c514d');round(c,27,199,15,6,3,'#4c514d');
  round(c,-17,155,31,32,10,right?'#d6b49d':'#e8cf95');shape(c,[[-17,165],[-10,158],[-7,183],[-17,183]],right?'#ba938c':'#d3b277');round(c,-8,158,8,22,3,right?'#788694':'#688b76');line(c,[[8,164],[24,174],[35,166]],'#f4d1ad',8);line(c,[[8,164],[18,171]],right?'#d6b49d':'#e8cf95',10);
  oval(c,1,140,19,20,'#f0c8a6');oval(c,16,143,4,6,'#f0c8a6');shape(c,[[-17,136],[-16,123],[-4,117],[13,124],[14,135],[6,128],[-4,133]],right?'#61585b':'#6c624f');oval(c,10,140,1.8,2.1,'#464b43');line(c,[[9,151],[14,150]],'#9b745c',1.2);oval(c,13,146,3.5,2,'#df9b8173');
  oval(c,1,123,29,5,right?'#9aa6a1':'#d6bc7f');round(c,-16,109,32,16,7,right?'#b3bfac':'#e7d39b');round(c,-16,121,32,4,2,right?'#6c8790':'#77907b');
  c.restore();line(c,[[x+d*26,174],[x+d*55,152],[tipX,tipY]],'#6f5c40',3);line(c,[[x+d*28,172],[x+d*41,163]],'#c4aa6b',4);
  c.textAlign='center';const name=String(p.name||'钓鱼人').slice(0,16),compact=this.width/this.dpr<700;
  if(compact){
   // On phones the catch temporarily replaces the name, keeping one readable row above the hat.
   const label=String(p.catchText||name).slice(0,40),font=Math.min(32,Math.max(11,11*W/(this.width/this.dpr))),height=font*1.4;
   c.font=`600 ${font}px system-ui, sans-serif`;const width=Math.min(540,c.measureText(label).width+24),center=Math.max(width/2+10,Math.min(W-width/2-10,x));
   round(c,center-width/2,110-height,width,height,height/2,p.catchText?'#fff2c8':'#f8f1dce8');c.fillStyle=p.catchText?'#7a6037':'#355d53';c.fillText(label,center,110-font*.34,width-20);
  }else{
   c.font='600 11px system-ui, sans-serif';const nameWidth=Math.min(170,c.measureText(name).width+22);round(c,x-nameWidth/2,79,nameWidth,23,11,'#f8f1dce8');c.fillStyle='#355d53';c.fillText(name,x,95);
   if(p.catchText){const text=String(p.catchText).slice(0,40);c.font='600 12px system-ui, sans-serif';const width=Math.min(280,c.measureText(text).width+24),center=Math.max(width/2+8,Math.min(W-width/2-8,x));round(c,center-width/2,44,width,27,12,'#fff2c8');c.fillStyle='#7a6037';c.fillText(text,center,62,width-16);}
  }
 }
 dispose(){this.ctx=null;this.background.width=this.background.height=1;}
}

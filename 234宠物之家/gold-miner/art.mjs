const W = 800, H = 520;
const INK = '#482c21';
const backgrounds = new Map();

function path(c, points, fill, stroke, width = 1.5) {
  c.beginPath();
  points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
  if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c, x, y, rx, ry, fill, stroke, width = 1.5, angle = 0) {
  c.beginPath(); c.ellipse(x,y,rx,ry,angle,0,Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.stroke(); }
}
function grad(c, y, end, stops) {
  const g = c.createLinearGradient(0,y,0,end);
  stops.forEach(([p,col]) => g.addColorStop(p,col));
  return g;
}
function random(seed) {
  return () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function sparkle(c, x, y, size, color) {
  path(c, [[x,y-size],[x+size*.23,y-size*.2],[x+size*.78,y],[x+size*.23,y+size*.21],[x,y+size],[x-size*.23,y+size*.21],[x-size*.78,y],[x-size*.23,y-size*.21]],color);
}

// Paint the landscape once per palette. Collision objects always stay on top of these strata.
function landscape(c, theme) {
  const rand = random(227 + theme * 45);
  const skies = [['#75b8be','#fce1a2'],['#8ebbc7','#ffe7b1'],['#e4a084','#fbe2ab']];
  const soil = [
    ['#b26d43','#96563a','#774230','#583125'],
    ['#af7249','#945f44','#774634','#553329'],
    ['#af6745','#945139','#713f31','#4c302a']
  ][theme];
  c.fillStyle = grad(c,0,111,[[0,skies[theme][0]],[1,skies[theme][1]]]); c.fillRect(0,0,W,115);
  oval(c,648,31,21,21,'#ffeaaf');
  for (const [x,y,s] of [[30,28,.8],[204,15,.65],[475,28,1.05],[710,19,.6]]) {
    c.save(); c.translate(x,y); c.scale(s,s);
    c.fillStyle = '#ffedc3'; c.fillRect(0,0,63,2); c.fillRect(21,-4,53,2);
    oval(c,40,-2,13,2.6,'#ffedc3'); c.restore();
  }
  path(c,[[0,62],[34,62],[60,51],[70,52],[96,32],[116,31],[131,45],[150,46],[177,62],[214,62],[257,49],[274,49],[311,61],[344,59],[375,67],[420,66],[448,50],[463,51],[487,40],[497,42],[523,65],[573,67],[610,55],[647,54],[688,38],[713,38],[741,60],[765,56],[800,52],[800,108],[0,108]],'#b6ada0');
  path(c,[[0,80],[43,77],[60,61],[101,58],[116,47],[139,47],[151,64],[182,68],[198,82],[233,80],[259,69],[269,62],[295,62],[311,73],[336,77],[366,87],[422,77],[451,75],[466,64],[478,61],[487,51],[507,50],[516,66],[526,70],[544,69],[555,79],[584,82],[625,75],[666,77],[685,62],[713,59],[720,46],[750,46],[762,68],[800,72],[800,105],[0,105]],'#b98565');
  path(c,[[77,60],[101,58],[117,48],[137,48],[125,52],[123,58],[109,60],[105,68],[94,69]],'#d3a079');
  path(c,[[700,61],[712,58],[721,47],[745,47],[730,51],[727,61],[715,64]],'#d3a079');
  path(c,[[0,89],[49,84],[98,88],[126,80],[170,85],[208,83],[260,91],[312,84],[358,89],[406,83],[475,90],[505,83],[549,83],[590,91],[643,82],[681,78],[712,80],[758,74],[800,79],[800,111],[0,111]],'#947d5c');
  // A distant headframe and a few weathered fence posts establish the scale of the dig.
  c.save(); c.translate(84,87);
  for (const pts of [[[-11,0],[-5,-30],[4,-30],[11,0]], [[-8,-11],[7,-20]], [[-7,-20],[8,-11]], [[0,-30],[0,0]],[[-8,-23],[7,-23]],[[-8,-10],[8,-10]]])
    path(c,pts,null,'#786c57',1.8);
  path(c,[[-10,-30],[-6,-35],[5,-35],[9,-30]],'#786c57');
  path(c,[[4,-29],[31,-11],[51,-4]],null,'#756c58',.8); c.restore();
  for(let i=0;i<14;i++){
    const x=rand()*W, y=89+rand()*6;
    path(c,[[x,y],[x-1,y-7],[x+1,y-9],[x+2,y]],'#8e7858');
    path(c,[[x,y-4],[x+13,y-5]],null,'#928064',1);
  }
  c.fillStyle=grad(c,98,H,[[0,soil[0]],[.32,soil[1]],[.73,soil[2]],[1,soil[3]]]); c.fillRect(0,99,W,H-99);
  const seam=(x,y,phase)=>y+Math.sin(x/115+phase)*10+Math.sin(x/52-phase)*3+x*.017;
  for(const [y,phase,depth,tint] of [[144,1.2,6,'#57362222'],[212,0.7,17,'#efba7f17'],[253,2.1,4,'#4c2a222e'],[319,.6,15,'#502c2626'],[384,-.6,9,'#f0a66914'],[455,1.1,17,'#3f252422']]){
    const upper=[],lower=[];
    for(let x=0;x<=W;x+=16){
      const v=seam(x,y,phase);
      upper.push([x,v+rand()*2]); lower.push([x,v+depth*(.55+.45*Math.sin(x/43+phase))+rand()*2]);
    }
    path(c,[...upper,...lower.reverse()],tint);
  }
  for(let i=0;i<285;i++){
    const x=rand()*W,y=117+rand()*408,w=1+rand()*4;
    path(c,[[x,y],[x+w*.7,y-1.3],[x+w,y]],i%3===0?'#f4c38a35':'#402b2537');
  }
  for (const [x,y,dir] of [[25,151,1],[714,212,-1],[155,322,1],[495,408,-1],[756,476,1],[42,490,1],[386,245,1]]) {
    const points=[[x,y],[x+12*dir,y+4],[x+17*dir,y+14],[x+28*dir,y+17],[x+33*dir,y+24]];
    path(c,points,null,'#432c262d',1.8); path(c,[points[2],[x+13*dir,y+21],[x+16*dir,y+27]],null,'#432c2626',1);
  }
  const bank=[[0,98]]; for(let x=0;x<=W;x+=8)bank.push([x,103+rand()*4]);
  path(c,[...bank,[W,114],...bank.slice(1).reverse().map(([x,y])=>[x,y+5+rand()*5])],'#794a35');
  path(c,[[0,96],[W,96],[W,102],...bank.slice(1).reverse()],'#e2af62');
  c.fillStyle='#93643b'; c.fillRect(0,97,W,2);
  for(let i=0;i<50;i++){
    const x=rand()*W; path(c,[[x-2,97],[x-4,94-rand()*3],[x,96],[x+2,93-rand()*3],[x+2,97]],'#9a8551');
  }
}
function backdrop(c, theme) {
  if(!backgrounds.has(theme)){
    const layer=c.canvas.ownerDocument?.createElement('canvas') ??
      (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W,H) : null);
    if(!layer){ landscape(c,theme); return; }
    layer.width=W*2; layer.height=H*2;
    const bg=layer.getContext('2d'); bg.scale(2,2); landscape(bg,theme);
    backgrounds.set(theme,layer);
  }
  c.drawImage(backgrounds.get(theme),0,0,W,H);
}

function ore(c,r,id,gold) {
  const rand=random(56+id*177);
  const rim=[], count=gold?9:7;
  for(let i=0;i<count;i++){
    const theta=(i+.1+(rand()-.5)*.3)/count*Math.PI*2;
    const d=r*(.87+rand()*.17);
    rim.push([Math.cos(theta)*d,Math.sin(theta)*d*.89]);
  }
  const palette=gold?['#ffdc65','#ffbd36','#e99720','#ad631d','#ffe891','#f9bb38']:['#bcc4c0','#929e9e','#778483','#5b686a','#adb6b4','#8f9d9a'];
  path(c,rim,palette[0],gold?'#78431e':'#414849',Math.max(2,r*.10));
  const core=[-r*.22,-r*.09], bevel=[r*.33,r*.20];
  for(let i=0;i<count;i++){
    const a=rim[i],b=rim[(i+1)%count];
    const middle=i<3||i===count-1?bevel:core;
    path(c,[middle,a,b],palette[i<3?i+1:i===3?2:i<6?0:i===6?4:5]);
  }
  path(c,[core,rim[3],bevel,rim[count-1]],palette[1]);
  path(c,[rim[Math.floor(count*.62)],rim[Math.floor(count*.75)],rim[Math.floor(count*.87)]],null,gold?'#fff1a1':'#d1d3c4',Math.max(1,r*.065));
  if(r>11) path(c,[[core[0]-r*.16,core[1]+r*.04],core,[core[0]+r*.03,core[1]-r*.15]],null,gold?'#b87620':'#6b7576',r*.048);
}
function jewel(c,r) {
  const top=-r*.76,mid=-r*.17,foot=r*.84;
  path(c,[[-r,mid],[-r*.56,top],[r*.47,top],[r,mid],[0,foot]],'#78e0e0','#204f63',2.3);
  path(c,[[-r,mid],[-r*.56,top],[-r*.35,mid]],'#ceffed');
  path(c,[[-r*.56,top],[r*.47,top],[-r*.35,mid]],'#e5ffff');
  path(c,[[r*.47,top],[r*.44,mid],[-r*.35,mid]],'#86e0dd');
  path(c,[[-r,mid],[-r*.35,mid],[0,foot]],'#53becc');
  path(c,[[r*.44,mid],[r,mid],[0,foot]],'#3695ba');
  path(c,[[-r,mid],[r,mid]],null,'#e5ffff',1.1);
}
function bag(c,r) {
  path(c,[[-r*.27,-r*.54],[-r*.55,-r*.92],[-r*.18,-r*.84],[r*.02,-r],[r*.43,-r*.93],[r*.26,-r*.55],[r*.39,-r*.34],[r*.79,r*.15],[r*.8,r*.59],[r*.55,r*.86],[0,r*.94],[-r*.6,r*.84],[-r*.85,r*.54],[-r*.77,r*.04]],'#d59b59',INK,2);
  path(c,[[r*.26,-r*.44],[r*.69,r*.16],[r*.74,r*.56],[r*.53,r*.82],[-r*.2,r*.89],[r*.25,r*.59]],'#b47748');
  path(c,[[-r*.33,-r*.48],[r*.31,-r*.53],[r*.65,-r*.35]],null,'#73503d',2.4);
  path(c,[[-r*.40,-r*.1],[-r*.56,r*.12],[-r*.59,r*.26]],null,'#ebbb80',2);
  c.fillStyle='#734933'; c.textAlign='center'; c.textBaseline='middle';
  c.font='bold '+Math.round(r*1.1)+'px Georgia,serif'; c.fillText('?',0,r*.25);
}
function barrel(c,r) {
  c.fillStyle='#a3422c'; c.fillRect(-r*.84,-r*.69,r*1.68,r*1.45);
  path(c,[[-r*.84,-r*.69],[-r*.84,r*.66],[-r*.53,r*.85],[r*.48,r*.85],[r*.84,r*.66],[r*.84,-r*.69]],'#b94e32',INK,2);
  oval(c,0,-r*.65,r*.84,r*.22,'#ce8b58',INK,1.8);
  for(const h of [-.44,.56]) path(c,[[-r*.85,r*h],[-r*.27,r*(h+.10)],[r*.33,r*(h+.09)],[r*.85,r*h]],null,'#554743',2.8);
  path(c,[[0,-r*.65],[r*.13,-r*.96],[r*.38,-r*1.09]],null,'#4d3b2d',2.3);
  c.fillStyle='#ffe0aa'; c.textAlign='center'; c.textBaseline='middle'; c.font='bold '+Math.round(r*.73)+'px monospace'; c.fillText('TNT',0,r*.13);
}
function mole(c,it,t) {
  const r=it.r, step=Math.sin(t*12+it.x*.2)*1.6;
  c.scale(it.face<0?-1:1,1);
  path(c,[[-r*.81,r*.17],[-r*1.12,r*.07],[-r*1.24,-r*.09]],null,'#55392f',2);
  oval(c,-r*.42,r*.43+step,r*.25,r*.14,'#e2ad7d',INK,1);
  oval(c,r*.48,r*.43-step,r*.25,r*.14,'#e2ad7d',INK,1);
  oval(c,-r*.08,0,r*.86,r*.56,'#796050',INK,2);
  oval(c,r*.35,-r*.11,r*.45,r*.39,'#a18369');
  oval(c,r*.77,0,r*.3,r*.19,'#cb9c79',INK,1);
  oval(c,r*.99,-r*.02,r*.12,r*.105,'#e29a80');
  oval(c,r*.52,-r*.19,r*.09,r*.09,'#241f21');
  if(it.gems){ c.translate(-r*.15,-r*.59); jewel(c,r*.42); }
}

function item(c,it,t) {
  const {x,y,r,type,id}=it; c.save(); c.translate(x,y);
  // Small cast shadows anchor free objects to the dark cut face.
  if(it.claimedBy==null)oval(c,r*.08,r*.68,r*.83,r*.23,'#39262135');
  if(type==='gold'||type==='rock') ore(c,r,id,type==='gold');
  else if(type==='diamond') jewel(c,r);
  else if(type==='bag') bag(c,r);
  else if(type==='tnt') barrel(c,r);
  else if(type==='mole') mole(c,it,t);
  if((type==='diamond'||type==='gold') && Math.sin(t*2.6+id*3.7)>.89)
    sparkle(c,-r*.40,-r*.53,r*.28,'#fff6c9');
  c.restore();
}

function miner(c,hook,index,elapsed) {
  c.save(); c.translate(hook.x,hook.y);
  const working=hook.state==='retract', crank=working?elapsed*11:0;
  const armX=5+Math.cos(crank)*4,armY=-12+Math.sin(crank)*3;
  const shirt=index===0?'#a3483c':'#416d88',shirtLight=index===0?'#c9704e':'#6791a5';
  // Three timber beams, two bolts and a ratchet holding the winch.
  path(c,[[-41,6],[-40,2],[16,2],[19,7],[16,9],[-41,9]],'#bd844e',INK,1.6);
  for(const x of [-33,10]){path(c,[[x,7],[x+7,7],[x+5,14],[x,14]],'#845335',INK,1.2);oval(c,x+2,5,1.2,1.2,'#48362b');}
  // Bent legs and work boots.
  path(c,[[-32,-21],[-16,-21],[-9,-13],[-11,-1],[-19,-1],[-19,-10],[-27,-9],[-29,-1],[-37,-1],[-36,-13]],'#435758',INK,2);
  path(c,[[-38,-4],[-30,-4],[-25,-1],[-24,2],[-39,2]],'#684936',INK,1.7);
  path(c,[[-18,-4],[-10,-4],[-5,-1],[-4,2],[-19,2]],'#684936',INK,1.7);
  c.translate(0,working?Math.sin(crank)*.65:0);
  path(c,[[-31,-40],[-20,-42],[-15,-37],[-12,-22],[-17,-16],[-34,-17],[-39,-22],[-37,-33]],shirt,INK,2.1);
  path(c,[[-32,-38],[-28,-40],[-24,-28],[-19,-29],[-19,-36],[-16,-35],[-15,-19],[-32,-18],[-35,-22],[-30,-24]],'#526b69',INK,1.1);
  path(c,[[-28,-25],[-20,-25],[-20,-20],[-25,-19],[-28,-21]],'#6d8480');
  oval(c,-29,-27,1.4,1.4,'#e1b771');
  // Sun-worn face, sideburns, eyebrows and a heavy beard.
  oval(c,-23,-49,11,12,'#e8ad78',INK,2,-.1);
  oval(c,-32,-49,3.5,4.5,'#d29567',INK,1.4);
  path(c,[[-32,-51],[-29,-51],[-29,-45],[-24,-43],[-20,-45],[-17,-44],[-13,-46],[-12,-40],[-14,-37],[-17,-37],[-19,-34],[-23,-36],[-25,-35],[-31,-39],[-33,-44]],'#e0ceb0',INK,1.7);
  path(c,[[-32,-44],[-30,-40],[-26,-38],[-27,-36],[-31,-38],[-34,-43]],'#b49e87');
  path(c,[[-22,-51],[-17,-52]],null,'#5a4033',2.1);
  oval(c,-17,-49,1.15,1.65,'#322e2a');
  oval(c,-12.6,-46.5,3.6,2.7,'#e8a06a',INK,1.3);
  path(c,[[-22,-44],[-19,-45],[-16,-45],[-14,-43],[-18,-42]],'#f8e0ba');
  path(c,[[-16,-41],[-18.5,-40.6]],null,'#735b4b',1);
  // Brass headlamp on a creased felt hat.
  path(c,[[-35,-55],[-33,-62],[-29,-66],[-22,-67],[-18,-64],[-15,-65],[-12,-60],[-11,-55]],'#b47d3f',INK,2);
  path(c,[[-32,-59],[-16,-60],[-11,-57],[-12,-54],[-34,-53]],'#74503a');
  path(c,[[-39,-53],[-35,-56],[-29,-55],[-20,-55],[-10,-59],[-5,-57],[-7,-54],[-21,-50],[-34,-51]],'#d7a25a',INK,1.6);
  oval(c,-16,-58,3.6,4.0,'#e8b759',INK,1.3); oval(c,-15.5,-58.5,2,2.4,'#fff3be');
  // The moving forearm meets the crank handle.
  path(c,[[-27,-32],[-23,-34],[-16,-28],[-19,-23],[-25,-25],[-29,-29]],shirtLight,INK,1.6);
  path(c,[[-19,-25],[-14,-26],[armX-1,armY-3],[armX+1,armY],[armX-2,armY+2],[-16,-20],[-21,-22]],'#e8ad78',INK,1.6);
  path(c,[[-10,2],[-4,-13],[1,-13],[9,2]],'#695846',INK,2);
  oval(c,0,-10,9,9,'#ae8156',INK,2); oval(c,0,-10,5.8,5.8,'#694c39',INK,1);
  for(let k=0;k<3;k++){const a=crank+k*2.094;path(c,[[0,-10],[Math.cos(a)*6,-10+Math.sin(a)*6]],null,'#d4ad77',1.2);}
  oval(c,0,-10,2,2,'#ddbc87'); path(c,[[0,-10],[armX,armY]],null,'#604832',2);
  oval(c,armX,armY,2.5,2.0,'#c69561',INK,1);
  path(c,[[0,-2],[0,0]],null,'#5a4433',2.5);
  c.restore();
}

function cable(c,h) {
  path(c,[[h.x,h.y-1],[h.tipX,h.tipY]],null,'#392a24',3.0);
  path(c,[[h.x-.45,h.y-1],[h.tipX-.45,h.tipY]],null,'#d2ad77',1.15);
}
function grapple(c,h,index) {
  c.save(); c.translate(h.tipX,h.tipY); c.rotate(-h.angle);
  const open=h.item?1:0;
  for (const side of [-1,1]) {
    c.save(); c.scale(side,1);
    path(c,[[0,-4],[4,-2],[8,3],[open?7:9,8],[open?1.5:6,open?10:11],[open?3:5,7],[open?4:6,4],[0,0]],'#b7bbb1','#3d3a32',1.4);
    c.restore();
  }
  oval(c,0,-3,3.6,3.4,index===0?'#c88651':'#6d9caa','#403529',1.5);
  c.restore();
}
function effect(c,e) {
  const t=1-Math.max(0,e.life)/e.maxLife;
  c.save(); c.translate(e.x,e.y); c.globalAlpha=Math.max(0,1-t);
  if(e.type==='blast'){
    const s=18+42*t;
    const points=Array.from({length:22},(_,i)=>{
      const angle=i*Math.PI/11,rad=s*(i%2?0.6:1);
      return [Math.cos(angle)*rad,Math.sin(angle)*rad];
    });
    path(c,points,'#f89638','#e85326',2.5); c.scale(.56,.56); path(c,points,'#ffeaaa');
  } else if(e.type==='cash' && e.text){
    const y=-8-t*18; c.font='bold 18px system-ui,sans-serif';c.textAlign='center';c.lineWidth=3.5;c.strokeStyle='#513526';c.strokeText(e.text,0,y);c.fillStyle='#fff2ae';c.fillText(e.text,0,y);
  } else {
    for(let i=0;i<5;i++)sparkle(c,Math.cos(i*1.26)*(5+t*15),Math.sin(i*1.26)*(5+t*15),3*(1-t),'#ffdaa0');
  }
  c.restore();
}

/** Draw the current mine into an 800 x 520 logical viewport. The caller handles DPI scaling. */
export function drawMine(c, game) {
  c.save(); c.lineJoin='round';c.lineCap='round';
  const theme=Math.floor((game.level-1)/2)%3;
  backdrop(c,theme);
  for(const h of game.hooks)cable(c,h);
  for(const it of game.items)item(c,it,game.elapsed);
  game.hooks.forEach((h,i)=>{miner(c,h,i,game.elapsed);grapple(c,h,i);});
  for(const e of game.effects)effect(c,e);
  c.restore();
}

const ground=new Image();ground.src='./assets/ground-hd.webp';
const props=new Image();props.src='./assets/props-hd.webp';
let tile=null,tileMap=-1,pattern=null,patternContext=null;
export function drawGround(c,b){
  if(ground.complete&&ground.naturalWidth){
    if(tileMap!==b.map){tile=document.createElement('canvas');tile.width=1012;tile.height=2048;const t=tile.getContext('2d');
      // Mirror adjacent tiles so their edges agree, excluding atlas divider pixels.
      for(let x=0;x<2;x++)for(let y=0;y<2;y++){t.save();t.translate(x?1012:0,y?2048:0);t.scale(x?-1:1,y?-1:1);t.drawImage(ground,b.map*512+3,0,506,1024,0,0,506,1024);t.restore();}tileMap=b.map;pattern=null;}
    if(!pattern||patternContext!==c){pattern=c.createPattern(tile,'repeat');patternContext=c;}c.fillStyle=pattern;c.fillRect(0,0,b.width,b.height);
  }
  // Soft footpaths cross in the arrival clearing and lead between obstacle islands.
  if(b.map!==2){c.save();c.lineCap='round';c.lineJoin='round';
    const path=new Path2D();path.moveTo(0,850);path.bezierCurveTo(420,850,650,620,900,650);path.bezierCurveTo(1200,700,1400,550,1800,550);path.moveTo(900,0);path.bezierCurveTo(780,300,900,450,900,650);path.bezierCurveTo(920,900,1250,1150,1250,1300);
    for(const [width,alpha] of [[100,.035],[84,.055],[68,.09],[52,.12]]){c.lineWidth=width;c.strokeStyle=b.map===0?`rgba(205,180,110,${alpha})`:`rgba(99,74,45,${alpha})`;c.stroke(path);}c.restore();
  }
  c.save();c.strokeStyle=b.map===2?'#71d9ee88':'#d7d8a575';c.lineWidth=4;c.setLineDash([10,12]);c.strokeRect(14,14,b.width-28,b.height-28);c.restore();
  c.save();c.translate(900,650);c.strokeStyle=b.map===2?'#7be8ec77':'#ede0aa88';c.lineWidth=3;c.beginPath();c.ellipse(0,10,64,32,0,0,Math.PI*2);c.stroke();c.restore();
}
export function drawProp(c,o,map,player){
  c.save();c.fillStyle='#14221835';c.beginPath();c.ellipse(o.x,o.y+3,o.r+12,o.r*.5+5,0,0,Math.PI*2);c.fill();
  // Fade only foliage above the player; solid bases always remain visible.
  const fade=o.kind===0&&map===0&&player.y<o.y&&player.y>o.y-o.size*.8&&Math.abs(player.x-o.x)<o.size*.43;
  if(props.complete&&props.naturalWidth){
    c.globalAlpha=fade?.48:1;c.drawImage(props,map*512,o.kind*512,512,350,o.x-o.size/2,o.y-o.size*.88,o.size,o.size*350/512);
    c.globalAlpha=1;c.drawImage(props,map*512,o.kind*512+350,512,162,o.x-o.size/2,o.y-o.size*.88+o.size*350/512,o.size,o.size*162/512);
  }
  else {c.fillStyle=map===0?'#547b42':'#777568';c.beginPath();c.arc(o.x,o.y,o.r,0,Math.PI*2);c.fill();}c.restore();
}

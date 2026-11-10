// Ground coordinates are shared by collision, spawning and the scenery renderer.
export const WORLD_WIDTH=1800, WORLD_HEIGHT=1300;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function makeObstacles(map){
  const objects=[];
  const add=(x,y,kind,size)=>objects.push({x,y,kind,size,r:kind===0?(map===0?size*.13:size*.30):size*.34});
  // A visible perimeter and scattered islands leave broad connected escape routes.
  for(let x=70;x<1800;x+=205){add(x,80,0,190);add(x+35,1240,0,180);}
  for(let y=300;y<1200;y+=225){add(65,y,0,190);add(1740,y+30,0,185);}
  [[365,310,0,220],[680,240,1,124],[1120,300,0,215],[1450,390,1,130],
   [300,710,1,135],[565,580,0,210],[1235,690,0,220],[1510,875,0,200],
   [450,1025,0,220],[820,1040,1,130],[1060,980,0,205]].forEach(p=>add(...p));
  return objects;
}
export class Terrain {
  constructor(map){this.obstacles=makeObstacles(map);this.buckets=new Map();
    for(const o of this.obstacles)for(let x=Math.floor((o.x-o.r)/180);x<=Math.floor((o.x+o.r)/180);x++)for(let y=Math.floor((o.y-o.r)/180);y<=Math.floor((o.y+o.r)/180);y++){const key=x+','+y;if(!this.buckets.has(key))this.buckets.set(key,[]);this.buckets.get(key).push(o);}
  }
  nearby(x,y,r){const result=new Set();for(let i=Math.floor((x-r)/180);i<=Math.floor((x+r)/180);i++)for(let j=Math.floor((y-r)/180);j<=Math.floor((y+r)/180);j++)for(const o of this.buckets.get(i+','+j)||[])result.add(o);return result;}
  free(x,y,r=16){if(x<r+12||y<r+12||x>WORLD_WIDTH-r-12||y>WORLD_HEIGHT-r-12)return false;for(const o of this.nearby(x,y,r))if(Math.hypot(x-o.x,y-o.y)<r+o.r+.1)return false;return true;}
  spawn(x,y,r=16){x=clamp(x,r+14,WORLD_WIDTH-r-14);y=clamp(y,r+14,WORLD_HEIGHT-r-14);if(this.free(x,y,r))return {x,y};
    for(let ring=24;ring<500;ring+=24)for(let i=0;i<16;i++){const a=i*Math.PI/8,px=x+Math.cos(a)*ring,py=y+Math.sin(a)*ring;if(this.free(px,py,r))return {x:px,y:py};}
    return {x:900,y:650};
  }
  move(body,dx,dy,r=16){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));dx/=steps;dy/=steps;
    for(let i=0;i<steps;i++){let x=clamp(body.x+dx,r+12,WORLD_WIDTH-r-12),y=clamp(body.y+dy,r+12,WORLD_HEIGHT-r-12);
      for(const o of this.nearby(x,y,r)){const ox=x-o.x,oy=y-o.y,d=Math.hypot(ox,oy),limit=r+o.r+.15;if(d<limit){const nx=d?ox/d:1,ny=d?oy/d:0;x=o.x+nx*limit;y=o.y+ny*limit;}}
      x=clamp(x,r+12,WORLD_WIDTH-r-12);y=clamp(y,r+12,WORLD_HEIGHT-r-12);
      if(this.free(x,y,r)){body.x=x;body.y=y;}
      else if(this.free(body.x+dx,body.y,r))body.x+=dx;
      else if(this.free(body.x,body.y+dy,r))body.y+=dy;
    }
  }
  chase(body,target,distance){const dx=target.x-body.x,dy=target.y-body.y,len=Math.hypot(dx,dy)||1;let vx=dx/len,vy=dy/len;
    // Follow the tangent of a blocking island, retaining a side to prevent jitter.
    let blocker=null,best=Infinity;
    for(const o of this.nearby(body.x,body.y,body.r+100)){const ox=o.x-body.x,oy=o.y-body.y,along=ox*vx+oy*vy,side=Math.abs(ox*vy-oy*vx);if(along>0&&along<Math.min(len,body.r+o.r+75)&&side<body.r+o.r+6&&along<best){blocker=o;best=along;}}
    if(blocker){if(body.avoid!==blocker){body.avoid=blocker;body.turn=((blocker.x-body.x)*vy-(blocker.y-body.y)*vx)>=0?1:-1;}
      const ox=body.x-blocker.x,oy=body.y-blocker.y,d=Math.hypot(ox,oy)||1;vx=-oy/d*body.turn;vy=ox/d*body.turn;
    }else body.avoid=null;
    this.move(body,vx*distance,vy*distance,body.r);
  }
}

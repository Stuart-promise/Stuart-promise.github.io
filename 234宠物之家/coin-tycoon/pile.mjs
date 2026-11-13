// A solid, mineable height field. Only the exposed coins are rendered.
export const GRID=39,STEP=.36,ORIGIN_X=-(GRID-1)*STEP/2,ORIGIN_Z=-8.84,LAYER=.06,SHELL=3;
const template=[];let total=0;
for(let row=0;row<GRID;row++)for(let col=0;col<GRID;col++){
 const x=ORIGIN_X+col*STEP,z=ORIGIN_Z+row*STEP;
 const main=2.85*Math.max(0,1-Math.hypot(x,z+2)/6.65)**.78;
 const shoulder=.32*Math.max(0,1-Math.hypot(x-3,z+3.6)/2.6);
 const depth=Math.max(0,Math.round((main+shoulder)/LAYER));
 template.push({x,z,depth,start:total,index:template.length});total+=depth;
}
export const COUNT=total;
export class CoinPile {
 constructor(shipment=0,taken=[]){
  this.shipment=shipment;this.gone=new Set(taken);this.columns=template.map(c=>({...c,left:c.depth,next:c.start+c.depth-1}));this.owner=new Uint16Array(COUNT);
  for(const c of this.columns)for(let id=c.start;id<c.start+c.depth;id++)this.owner[id]=c.index;
  for(const id of this.gone)if(id>=0&&id<COUNT)this.columns[this.owner[id]].left--;
  for(const c of this.columns)this.seek(c);
 }
 seek(c){while(c.next>=c.start&&this.gone.has(c.next))c.next--;}
 remove(ids){const changed=new Set();for(const id of ids){if(id<0||id>=COUNT||this.gone.has(id))continue;this.gone.add(id);const c=this.columns[this.owner[id]];c.left--;this.seek(c);changed.add(c.index);}return [...changed];}
 heightAt(x,z){const gx=(x-ORIGIN_X)/STEP,gz=(z-ORIGIN_Z)/STEP;if(gx<0||gz<0||gx>GRID-1||gz>GRID-1)return 0;const col=Math.min(GRID-2,Math.floor(gx)),row=Math.min(GRID-2,Math.floor(gz)),u=gx-col,v=gz-row;const height=(r,c)=>this.columns[r*GRID+c].left*LAYER;return (height(row,col)*(1-u)+height(row,col+1)*u)*(1-v)+(height(row+1,col)*(1-u)+height(row+1,col+1)*u)*v;}
 surface(c,layer=0){const n=(Math.imul(c.index+1,1664525)+Math.imul(this.shipment+1,1013904223)+layer*19937)>>>0;return {x:c.x+((n%101)/100-.5)*.16,z:c.z+(((n>>>8)%101)/100-.5)*.16,y:Math.max(.025,(c.left-layer)*LAYER),a:n%628/100,tilt:((n>>>16)%21-10)/100,size:.18+(n%31)/1000};}
 targets(s,stats){const fx=-Math.sin(s.yaw),fz=-Math.cos(s.yaw),ground=this.heightAt(s.x,s.z),eligible=[];let best=null,score=Infinity;
  for(const c of this.columns){if(!c.left)continue;const p=this.surface(c),dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),distance=Math.hypot(d,p.y-ground);if(distance>stats.reach||d<.12)continue;const facing=(dx*fx+dz*fz)/d;if(facing<.4)continue;const rank=distance+(1-facing)*2;eligible.push({c,p});if(rank<score){score=rank;best=p;}}
  if(!best)return {ids:[],point:null};const candidates=[];
  for(const {c,p} of eligible){const d=Math.hypot(p.x-best.x,p.z-best.z,p.y-best.y);if(d>stats.radius)continue;let id=c.next,n=0;while(id>=c.start&&n<Math.min(SHELL,stats.batch)){if(!this.gone.has(id)){candidates.push({id,d:d+n*.025});n++;}id--;}}
  candidates.sort((a,b)=>a.d-b.d);return {ids:candidates.map(c=>c.id),point:best};
 }
}

import {COUNT,CoinPile} from './pile.mjs?v=2';
export {COUNT};
export const ROOM=10,MACHINE={x:0,z:8.2};
export const TECH=[
 {id:'grip',name:'灵巧指尖',icon:'✦',branch:0,max:5,base:12,growth:1.85,desc:'每次多收集1枚金币'},
 {id:'tempo',name:'熟练拾取',icon:'↻',branch:0,max:8,base:18,growth:1.8,desc:'每级缩短拾取间隔',requires:['grip',1]},
 {id:'reach',name:'延伸手套',icon:'⌁',branch:0,max:5,base:28,growth:1.9,desc:'每级增加0.35米拾取距离',requires:['grip',2]},
 {id:'value',name:'精密分选',icon:'◇',branch:0,max:8,base:65,growth:2,desc:'每枚金币回收价增加1元',requires:['tempo',2]},
 {id:'bag',name:'加固背包',icon:'▣',branch:1,max:10,base:16,growth:1.8,desc:'每级增加8枚携带容量'},
 {id:'speed',name:'轻快步伐',icon:'»',branch:1,max:8,base:18,growth:1.8,desc:'每级增加0.28米/秒移动速度'},
 {id:'cart',name:'随身推车',icon:'▤',branch:1,max:5,base:160,growth:2.1,desc:'每级增加40枚容量',requires:['bag',3]},
 {id:'recycle',name:'高速回收',icon:'⇄',branch:1,max:5,base:45,growth:1.9,desc:'加快回收机卸货',requires:['bag',2]},
 {id:'scoop',name:'集币铲',icon:'⤓',branch:2,max:5,base:75,growth:2,desc:'解锁铲子，每级增加3枚拾取量',requires:['grip',2]},
 {id:'magnet',name:'磁力收集器',icon:'∩',branch:2,max:4,base:280,growth:2.1,desc:'解锁磁力工具，每级扩大吸附范围',requires:['scoop',2]},
 {id:'vacuum',name:'旋风吸币器',icon:'◎',branch:2,max:5,base:900,growth:2.2,desc:'每级增加8枚拾取量，并提高拾取速度',requires:['magnet',2]},
 {id:'auto',name:'感应启动',icon:'ϟ',branch:2,max:1,base:2400,growth:1,desc:'使用吸币器时自动收集附近金币',requires:['vacuum',2]}
];
export const level=(s,id)=>s.tech[id]||0;
export const price=(s,t)=>Math.ceil(t.base*t.growth**level(s,t.id));
export const unlocked=(s,t)=>!t.requires||level(s,t.requires[0])>=t.requires[1];
export const tool=s=>level(s,'vacuum')?'旋风吸币器':level(s,'magnet')?'磁力收集器':level(s,'scoop')?'集币铲':'徒手拾取';
export function stats(s){return {capacity:12+8*level(s,'bag')+40*level(s,'cart'),batch:1+level(s,'grip')+3*level(s,'scoop')+8*level(s,'vacuum'),speed:1.8+.28*level(s,'speed'),reach:1.65+.35*level(s,'reach')+.25*level(s,'magnet'),radius:.3+.3*level(s,'scoop')+.55*level(s,'magnet')+.25*level(s,'vacuum'),interval:1.05/(1+.18*level(s,'tempo')+.18*level(s,'vacuum')),value:1+level(s,'value'),unload:5+5*level(s,'recycle'),auto:!!level(s,'auto')};}
export function fresh(){return {schema:2,money:0,bag:0,collected:0,delivered:0,earned:0,tech:{},taken:[],shipment:0,x:0,z:5.6,yaw:0,pitch:-.18,seconds:0,tutorial:false,sound:true};}
export function restore(raw){if(!raw)return fresh();let d;try{d=JSON.parse(raw);}catch{throw Error('存档无法读取，已保留原始记录，请到账号中心检查备份。');}if(![1,2].includes(d.schema))throw Error('存档版本不兼容，请刷新页面。');const s=fresh();for(const k of ['money','bag','collected','delivered','earned','shipment','seconds'])if(Number.isFinite(d[k])&&d[k]>=0)s[k]=Math.floor(d[k]);for(const t of TECH)s.tech[t.id]=Math.min(t.max,Math.max(0,Math.floor(d.tech?.[t.id]||0)));let removed=d.taken;if(typeof d.removed==='string'){try{const bytes=atob(d.removed);if(bytes.length!==Math.ceil(COUNT/8))throw Error();removed=[];for(let i=0;i<COUNT;i++)if(bytes.charCodeAt(i>>3)&(1<<(i&7)))removed.push(i);}catch{throw Error('金币山存档不完整，原记录已保留，请到账号中心检查备份。');}}s.taken=[...new Set((Array.isArray(removed)?removed:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<COUNT))];for(const k of ['x','z'])if(Number.isFinite(d[k]))s[k]=Math.max(-9.5,Math.min(9.5,d[k]));for(const k of ['yaw','pitch'])if(Number.isFinite(d[k]))s[k]=d[k];s.pitch=Math.max(-1.35,Math.min(.65,s.pitch));s.tutorial=!!d.tutorial;s.sound=d.sound!==false;s.bag=Math.min(s.bag,stats(s).capacity);return s;}
export function buy(s,id){const t=TECH.find(t=>t.id===id);if(!t||!unlocked(s,t)||level(s,id)>=t.max||s.money<price(s,t))return false;s.money-=price(s,t);s.tech[id]=level(s,id)+1;return true;}
export function recycle(s,amount){const n=Math.min(s.bag,Math.max(0,Math.floor(amount)));const gain=n*stats(s).value;s.bag-=n;s.money+=gain;s.earned+=gain;s.delivered+=n;return gain;}
export function collect(s,ids){const taken=new Set(s.taken),limit=Math.min(stats(s).batch,stats(s).capacity-s.bag),picked=[];for(const id of ids){if(picked.length>=limit)break;if(Number.isInteger(id)&&id>=0&&id<COUNT&&!taken.has(id)){taken.add(id);picked.push(id);}}s.taken.push(...picked);s.bag+=picked.length;s.collected+=picked.length;return picked;}
export function refill(s){if(s.taken.length<COUNT)return false;s.shipment++;s.taken=[];return true;}
export function coins(shipment){const pile=new CoinPile(shipment),out=[];for(const c of pile.columns)for(let layer=0;layer<c.depth;layer++)out.push(pile.surface(c,layer));return out;}
export function serialize(s){const bytes=new Uint8Array(Math.ceil(COUNT/8));for(const id of s.taken)bytes[id>>3]|=1<<(id&7);const {taken,...rest}=s;return JSON.stringify({...rest,pileVersion:1,removed:btoa(String.fromCharCode(...bytes))});}
export function move(s,forward,side,dt){const speed=stats(s).speed,len=Math.max(1,Math.hypot(forward,side));const dx=(-Math.sin(s.yaw)*forward+Math.cos(s.yaw)*side)*speed*dt/len,dz=(-Math.cos(s.yaw)*forward-Math.sin(s.yaw)*side)*speed*dt/len;
 const valid=(x,z)=>Math.abs(x)<9.55&&Math.abs(z)<9.55&&!(Math.abs(x)<1.65&&z>7.2&&z<9.65);
 if(valid(s.x+dx,s.z))s.x+=dx;if(valid(s.x,s.z+dz))s.z+=dz;
}
export const atMachine=s=>Math.hypot(s.x-MACHINE.x,s.z-MACHINE.z)<3;

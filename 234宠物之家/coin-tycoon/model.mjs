import {MUSHROOM_COUNT} from './mushrooms.mjs?v=3';
import {COUNT,CoinPile} from './pile.mjs?v=2';
export {COUNT};
export const ROOM=10,MACHINE={x:0,z:8.2};
export const TECH=[
 {id:'grip',name:'灵巧指尖',icon:'✦',branch:0,max:15,base:12,growth:1.85,desc:'每次多收集1枚金币'},
 {id:'tempo',name:'熟练拾取',icon:'↻',branch:0,max:20,base:18,growth:1.8,desc:'每级缩短拾取间隔',requires:['grip',1]},
 {id:'reach',name:'延伸手套',icon:'⌁',branch:0,max:10,base:28,growth:1.9,desc:'每级增加0.35米拾取距离',requires:['grip',2]},
 {id:'value',name:'精密分选',icon:'◇',branch:0,max:16,base:65,growth:2,desc:'每枚金币回收价增加1元',requires:['tempo',2]},
 {id:'bag',name:'加固背包',icon:'▣',branch:1,max:30,base:16,growth:1.8,desc:'前10级每级+8容量，之后每级+24'},
 {id:'speed',name:'轻快步伐',icon:'»',branch:1,max:20,base:18,growth:1.8,desc:'前8级每级+0.28米/秒，之后+0.36'},
 {id:'cart',name:'随身推车',icon:'▤',branch:1,max:15,base:160,growth:2.1,desc:'前5级每级+40容量，之后每级+80',requires:['bag',3]},
 {id:'recycle',name:'高速回收',icon:'⇄',branch:1,max:20,base:45,growth:1.9,desc:'前5级每级+5枚/秒，之后+20枚/秒',requires:['bag',2]},
 {id:'scoop',name:'集币铲',icon:'⤓',branch:2,max:12,base:75,growth:2,desc:'解锁铲子，每级增加3枚拾取量',requires:['grip',2]},
 {id:'magnet',name:'磁力收集器',icon:'∩',branch:2,max:10,base:280,growth:2.1,desc:'解锁磁力工具，每级扩大吸附范围',requires:['scoop',2]},
 {id:'vacuum',name:'旋风吸币器',icon:'◎',branch:2,max:12,base:900,growth:2.2,desc:'每级增加8枚拾取量，并提高拾取速度',requires:['magnet',2]},
 {id:'auto',name:'感应启动',icon:'ϟ',branch:2,max:1,base:2400,growth:1,desc:'使用吸币器时自动收集附近金币',requires:['vacuum',2]}
];
export const MUSHROOM_TECH=[
 {id:'m_pick',name:'成簇采摘',icon:'✿',branch:0,max:18,base:600,growth:1.8,desc:'每次多采2朵蘑菇'},
 {id:'m_tempo',name:'采菇巧手',icon:'↻',branch:0,max:20,base:900,growth:1.85,desc:'缩短采摘间隔',requires:['m_pick',1]},
 {id:'m_reach',name:'长柄采菇器',icon:'⌁',branch:0,max:10,base:1200,growth:1.9,desc:'增加采摘距离和覆盖范围',requires:['m_pick',2]},
 {id:'m_sickle',name:'旋刃采菇器',icon:'⤓',branch:0,max:12,base:3200,growth:2,desc:'每级多采4朵，并加快采摘',requires:['m_tempo',2]},
 {id:'m_fire',name:'旺火炭炉',icon:'♨',branch:1,max:20,base:800,growth:1.9,desc:'提高烤串出餐速度'},
 {id:'m_grill',name:'并排烤架',icon:'▤',branch:1,max:15,base:2600,growth:2,desc:'扩充烤架，进一步提高出餐速度',requires:['m_fire',2]},
 {id:'m_glaze',name:'秘制酱汁',icon:'◇',branch:1,max:20,base:1100,growth:1.85,desc:'每串售价增加6元'},
 {id:'m_recipe',name:'招牌菌香串',icon:'✦',branch:1,max:12,base:3600,growth:2.1,desc:'每串售价再增加20元',requires:['m_glaze',2]},
 {id:'m_basket',name:'分层采菇篮',icon:'▣',branch:2,max:30,base:700,growth:1.8,desc:'前6级每级+12容量，之后每级+36'},
 {id:'m_stride',name:'林间快步',icon:'»',branch:2,max:20,base:1300,growth:1.9,desc:'前4级每级+0.3米/秒，之后+0.36'},
 {id:'m_handoff',name:'快捷交付',icon:'⇄',branch:2,max:20,base:900,growth:1.9,desc:'前5级每级+6朵/秒，之后+15朵/秒'},
 {id:'m_auto',name:'感应采菇',icon:'ϟ',branch:2,max:1,base:12000,growth:1,desc:'朝向附近蘑菇时自动采摘',requires:['m_sickle',2]}
];
export {MUSHROOM_COUNT};
export const techTree=s=>s.map===1?MUSHROOM_TECH:TECH;
export const level=(s,id)=>s.tech[id]||0;
// Preserve the opening purchases; use linear growth after level 3 so late levels remain attainable.
export const price=(s,t)=>{const lv=level(s,t.id);return Math.ceil(t.base*t.growth**Math.min(lv,3)*(1+.18*Math.max(0,lv-3)));};
export const unlocked=(s,t)=>!t.requires||level(s,t.requires[0])>=t.requires[1];
export const tool=s=>s.map===1?(level(s,'m_sickle')?'旋刃采菇器':level(s,'m_reach')?'长柄采菇器':'徒手采菇'):(level(s,'vacuum')?'旋风吸币器':level(s,'magnet')?'磁力收集器':level(s,'scoop')?'集币铲':'徒手拾取');
const tierGain=(s,id,early,threshold,late)=>{const lv=level(s,id);return Math.min(lv,threshold)*early+Math.max(0,lv-threshold)*late;};
export function stats(s){
 if(s.map===1)return {capacity:12+tierGain(s,'m_basket',12,6,36),speed:1.8+tierGain(s,'m_stride',.3,4,.36),batch:1+2*level(s,'m_pick')+4*level(s,'m_sickle'),reach:1.7+.3*level(s,'m_reach'),radius:.4+.18*level(s,'m_pick')+.25*level(s,'m_reach')+.2*level(s,'m_sickle'),interval:1.2/(1+.2*level(s,'m_tempo')+.15*level(s,'m_sickle')),value:12+6*level(s,'m_glaze')+20*level(s,'m_recipe'),unload:6+tierGain(s,'m_handoff',6,5,15),cookRate:.5*(1+.4*level(s,'m_fire'))*(1+.5*level(s,'m_grill')),auto:!!level(s,'m_auto')};
 return {capacity:12+tierGain(s,'bag',8,10,24)+tierGain(s,'cart',40,5,80),batch:1+level(s,'grip')+3*level(s,'scoop')+8*level(s,'vacuum'),speed:1.8+tierGain(s,'speed',.28,8,.36),reach:1.65+.35*level(s,'reach')+.25*level(s,'magnet'),radius:.3+.3*level(s,'scoop')+.55*level(s,'magnet')+.25*level(s,'vacuum'),interval:1.05/(1+.18*level(s,'tempo')+.18*level(s,'vacuum')),value:1+level(s,'value'),unload:5+tierGain(s,'recycle',5,5,20),auto:!!level(s,'auto')};
}
const freshMushrooms=()=>({taken:[],batch:0,harvested:0,delivered:0,queue:0,cookFraction:0,sold:0,revenue:0});
export function fresh(){return {schema:3,map:0,goldCompleted:false,finalGold:0,money:0,bag:0,collected:0,delivered:0,earned:0,tech:{},taken:[],shipment:0,mushrooms:freshMushrooms(),x:0,z:5.6,yaw:0,pitch:-.18,seconds:0,tutorial:false,sound:true};}
function decodeRemoved(d,count){let removed=d.taken;if(typeof d.removed==='string'){try{const bytes=atob(d.removed);if(bytes.length!==Math.ceil(count/8))throw Error();removed=[];for(let i=0;i<count;i++)if(bytes.charCodeAt(i>>3)&(1<<(i&7)))removed.push(i);}catch{throw Error('采集存档不完整，原记录已保留，请到账号中心检查备份。');}}return [...new Set((Array.isArray(removed)?removed:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<count))];}
function packRemoved(taken,count){const bytes=new Uint8Array(Math.ceil(count/8));for(const id of taken)bytes[id>>3]|=1<<(id&7);return btoa(String.fromCharCode(...bytes));}
export function restore(raw){if(!raw)return fresh();let d;try{d=JSON.parse(raw);}catch{throw Error('存档无法读取，已保留原始记录，请到账号中心检查备份。');}if(!d||![1,2,3].includes(d.schema))throw Error('存档版本不兼容，请刷新页面。');const s=fresh();for(const k of ['money','bag','collected','delivered','earned','shipment','seconds','finalGold'])if(Number.isFinite(d[k])&&d[k]>=0)s[k]=Math.floor(d[k]);for(const t of [...TECH,...MUSHROOM_TECH]){const n=Number(d.tech?.[t.id]);if(Number.isFinite(n)&&n>0)s.tech[t.id]=Math.min(t.max,Math.floor(n));}
 s.taken=decodeRemoved(d,COUNT);s.goldCompleted=s.taken.length===COUNT||(s.shipment>0&&s.collected>=COUNT)||(d.schema===3&&d.goldCompleted===true);s.map=s.goldCompleted&&d.map===1?1:0;
 if(d.schema===3&&d.mushrooms){const m=d.mushrooms;s.mushrooms.taken=decodeRemoved(m,MUSHROOM_COUNT);for(const k of ['batch','harvested','delivered','queue','sold','revenue'])if(Number.isFinite(m[k])&&m[k]>=0)s.mushrooms[k]=Math.floor(m[k]);s.mushrooms.cookFraction=Number.isFinite(m.cookFraction)?Math.min(.999999,Math.max(0,m.cookFraction)):0;}
 for(const k of ['x','z'])if(Number.isFinite(d[k]))s[k]=Math.max(-9.5,Math.min(9.5,d[k]));for(const k of ['yaw','pitch'])if(Number.isFinite(d[k]))s[k]=d[k];s.pitch=Math.max(-1.35,Math.min(.65,s.pitch));s.tutorial=!!d.tutorial;s.sound=d.sound!==false;s.bag=Math.min(s.bag,stats(s).capacity);return s;
}
export function buy(s,id){const t=techTree(s).find(t=>t.id===id);if(!t||!unlocked(s,t)||level(s,id)>=t.max||s.money<price(s,t))return false;s.money-=price(s,t);s.tech[id]=level(s,id)+1;return true;}
export function recycle(s,amount){const n=Math.min(s.bag,Math.max(0,Math.floor(amount)));s.bag-=n;if(s.map===1){s.mushrooms.queue+=n;s.mushrooms.delivered+=n;return 0;}const gain=n*stats(s).value;s.money+=gain;s.earned+=gain;s.delivered+=n;return gain;}
export function cook(s,dt){if(s.map!==1||s.mushrooms.queue<=0||!Number.isFinite(dt)||dt<=0)return {count:0,gain:0};const m=s.mushrooms,st=stats(s);m.cookFraction+=dt*st.cookRate;const count=Math.min(m.queue,Math.floor(m.cookFraction+1e-9));m.cookFraction-=count;m.queue-=count;if(!m.queue)m.cookFraction=0;const gain=count*st.value;m.sold+=count;m.revenue+=gain;s.money+=gain;s.earned+=gain;return {count,gain};}
export const takenFor=s=>s.map===1?s.mushrooms.taken:s.taken;
export const countFor=s=>s.map===1?MUSHROOM_COUNT:COUNT;
export function collect(s,ids){const list=takenFor(s),taken=new Set(list),limit=Math.min(stats(s).batch,stats(s).capacity-s.bag),picked=[];for(const id of ids){if(picked.length>=limit)break;if(Number.isInteger(id)&&id>=0&&id<countFor(s)&&!taken.has(id)){taken.add(id);picked.push(id);}}list.push(...picked);s.bag+=picked.length;if(s.map===1)s.mushrooms.harvested+=picked.length;else {s.collected+=picked.length;if(s.taken.length===COUNT)s.goldCompleted=true;}return picked;}
export const canAdvance=s=>s.map===0&&(s.goldCompleted||s.taken.length===COUNT);
export function advance(s){if(!canAdvance(s))return false;s.goldCompleted=true;s.finalGold=recycle(s,s.bag);s.map=1;s.x=0;s.z=5.6;s.yaw=0;s.pitch=-.25;return true;}
export function refill(s){if(s.map!==1||s.mushrooms.taken.length<MUSHROOM_COUNT)return false;s.mushrooms.batch++;s.mushrooms.taken=[];return true;}
export function coins(shipment){const pile=new CoinPile(shipment),out=[];for(const c of pile.columns)for(let layer=0;layer<c.depth;layer++)out.push(pile.surface(c,layer));return out;}
export function serialize(s){const {taken,mushrooms,...rest}=s,{taken:mt,...ms}=mushrooms;return JSON.stringify({...rest,pileVersion:1,removed:packRemoved(taken,COUNT),mushrooms:{...ms,removed:packRemoved(mt,MUSHROOM_COUNT)}});}
export function move(s,forward,side,dt){const speed=stats(s).speed,len=Math.max(1,Math.hypot(forward,side));const dx=(-Math.sin(s.yaw)*forward+Math.cos(s.yaw)*side)*speed*dt/len,dz=(-Math.cos(s.yaw)*forward-Math.sin(s.yaw)*side)*speed*dt/len;
 const valid=(x,z)=>Math.abs(x)<9.55&&Math.abs(z)<9.55&&!(Math.abs(x)<1.65&&z>7.2&&z<9.65);
 if(valid(s.x+dx,s.z))s.x+=dx;if(valid(s.x,s.z+dz))s.z+=dz;
}
export const atMachine=s=>Math.hypot(s.x-MACHINE.x,s.z-MACHINE.z)<3;

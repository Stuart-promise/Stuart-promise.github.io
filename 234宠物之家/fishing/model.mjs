// All sizes, prices, and habitats are game balance values, not fishing advice.
export const MAPS=[
 {id:'lake',name:'青岚湖',subtitle:'湖光初见 · 从第一尾鱼开始',depths:[2,5,9,14]},
 {id:'river',name:'长风江',subtitle:'奔流向前 · 江底藏着大家伙',depths:[4,12,24,40]},
 {id:'sea',name:'星潮海',subtitle:'潮汐与远方 · 寻找深海巨物',depths:[8,30,70,130]}
];
export const RODS=[
 {id:'r0',name:'旧竹竿',kg:2,price:0},
 {id:'r1',name:'轻盈玻纤竿',kg:5,price:95},
 {id:'r2',name:'青岚碳素竿',kg:12,price:350},
 {id:'r3',name:'韧芯远投竿',kg:25,price:950},
 {id:'r4',name:'长风加强竿',kg:45,price:2250},
 {id:'r5',name:'玄铁巨物竿',kg:80,price:5250},
 {id:'r6',name:'星潮船钓竿',kg:130,price:10625},
 {id:'r7',name:'深蓝重型竿',kg:220,price:20000},
 {id:'r8',name:'逐浪大师竿',kg:350,price:37500},
 {id:'r9',name:'海王旗舰竿',kg:500,price:65000}
];
export const LINES=[
 {id:'l0',name:'基础细线',kg:2,meters:2,price:0},
 {id:'l1',name:'湖岸尼龙线',kg:5,meters:5,price:115},
 {id:'l2',name:'长抛碳线',kg:12,meters:14,price:400},
 {id:'l3',name:'加强编织线',kg:25,meters:24,price:1025},
 {id:'l4',name:'江底粗编线',kg:45,meters:40,price:2375},
 {id:'l5',name:'巨物八股线',kg:80,meters:55,price:5500},
 {id:'l6',name:'远海耐磨线',kg:130,meters:70,price:11250},
 {id:'l7',name:'深海重载线',kg:220,meters:130,price:21250},
 {id:'l8',name:'逐浪超强线',kg:350,meters:160,price:40000},
 {id:'l9',name:'海王旗舰线',kg:500,meters:200,price:68750}
];
export const BAITS=[
 {id:'none',name:'空钩',pack:0,price:0,unitPrice:0,description:'免费使用，等待稍久；仍有机会钓到所在水层的任何鱼。'},
 {id:'worm',name:'鲜活蚯蚓',pack:10,price:10,unitPrice:1,description:'适合鲫鱼、白条、鲶鱼、鳟鱼。入门实惠，每次抛竿消耗 1 份。'},
 {id:'corn',name:'甜玉米',pack:10,price:15,unitPrice:1.5,description:'适合鲤鱼、草鱼、青鱼、白鲢。每次抛竿消耗 1 份。'},
 {id:'dough',name:'谷香面团',pack:10,price:20,unitPrice:2,description:'适合鲫鱼、鲤鱼、草鱼、鲢鱼。每次抛竿消耗 1 份。'},
 {id:'insect',name:'鲜活昆虫',pack:10,price:25,unitPrice:2.5,description:'适合白条、鲈鱼、翘嘴、鳜鱼、鳟鱼。每次抛竿消耗 1 份。'},
 {id:'shrimp',name:'鲜虾',pack:10,price:40,unitPrice:4,description:'适合鲈鱼、鳜鱼、江鱼和海鲷。每次抛竿消耗 1 份。'},
 {id:'fishmeal',name:'浓香鱼粉',pack:10,price:60,unitPrice:6,description:'适合湖底青鱼、鲶鱼与江海巨鱼。每次抛竿消耗 1 份。'},
 {id:'krill',name:'鲜活磷虾',pack:10,price:100,unitPrice:10,description:'适合海鲷、鲭鱼、金枪鱼等海鱼，湖中小鱼不划算。每次抛竿消耗 1 份。'},
 {id:'squid',name:'鱿鱼切块',pack:10,price:180,unitPrice:18,description:'适合石斑、旗鱼、深海巨物，湖中小鱼不划算。每次抛竿消耗 1 份。'}
];
// Two species per layer means every depth contributes to completing a map.
export const FISH=[
 {id:'lake-crucian',map:'lake',name:'鲫鱼',minKg:.2,maxKg:1.4,depth:0,baits:['worm','dough'],price:12,color:'#e8c97f'},
 {id:'lake-minnow',map:'lake',name:'白条鱼',minKg:.15,maxKg:.8,depth:0,baits:['worm','insect'],price:20,color:'#c5dde1'},
 {id:'lake-carp',map:'lake',name:'鲤鱼',minKg:1.2,maxKg:4.5,depth:1,baits:['corn','dough'],price:15,color:'#dfa35b'},
 {id:'lake-perch',map:'lake',name:'淡水鲈鱼',minKg:.8,maxKg:3.8,depth:1,baits:['shrimp','insect'],price:24,color:'#92b2a0'},
 {id:'lake-grass',map:'lake',name:'草鱼',minKg:3,maxKg:8,depth:2,baits:['corn','dough'],price:21,color:'#9ab77e'},
 {id:'lake-mandarin',map:'lake',name:'鳜鱼',minKg:2.4,maxKg:7,depth:2,baits:['insect','shrimp'],price:32,color:'#d4ae74'},
 {id:'lake-catfish',map:'lake',name:'大口鲶鱼',minKg:6,maxKg:13,depth:3,baits:['worm','fishmeal'],price:26,color:'#72999e'},
 {id:'lake-blackcarp',map:'lake',name:'青鱼',minKg:8,maxKg:18,depth:3,baits:['corn','fishmeal'],price:30,color:'#5d8291'},
 {id:'river-dace',map:'river',name:'翘嘴鱼',minKg:2,maxKg:8,depth:0,baits:['insect','shrimp'],price:28,color:'#c6d8c9'},
 {id:'river-trout',map:'river',name:'虹鳟',minKg:2.5,maxKg:9,depth:0,baits:['insect','worm'],price:35,color:'#dcb6ac'},
 {id:'river-silver',map:'river',name:'白鲢',minKg:6,maxKg:18,depth:1,baits:['dough','corn'],price:32,color:'#c6d7df'},
 {id:'river-bighead',map:'river',name:'花鲢',minKg:8,maxKg:23,depth:1,baits:['dough','fishmeal'],price:36,color:'#8298ac'},
 {id:'river-salmon',map:'river',name:'江鲑',minKg:14,maxKg:35,depth:2,baits:['shrimp','insect'],price:42,color:'#ddaa88'},
 {id:'river-eel',map:'river',name:'巨鳗',minKg:12,maxKg:40,depth:2,baits:['worm','fishmeal'],price:46,color:'#839b77',shape:'long'},
 {id:'river-catfish',map:'river',name:'江底巨鲶',minKg:28,maxKg:65,depth:3,baits:['fishmeal','worm'],price:48,color:'#6b8292'},
 {id:'river-sturgeon',map:'river',name:'银甲鲟',minKg:30,maxKg:72,depth:3,baits:['fishmeal','shrimp'],price:55,color:'#a5b9ba',shape:'long'},
 {id:'sea-bream',map:'sea',name:'红海鲷',minKg:4,maxKg:16,depth:0,baits:['krill','shrimp'],price:45,color:'#e9a09a'},
 {id:'sea-mackerel',map:'sea',name:'蓝鲭鱼',minKg:3,maxKg:14,depth:0,baits:['krill','fishmeal'],price:48,color:'#78aab9'},
 {id:'sea-grouper',map:'sea',name:'珊瑚石斑',minKg:18,maxKg:55,depth:1,baits:['squid','shrimp'],price:60,color:'#cba15c'},
 {id:'sea-mahi',map:'sea',name:'金色鲯鳅',minKg:22,maxKg:65,depth:1,baits:['squid','krill'],price:62,color:'#d4ce67'},
 {id:'sea-tuna',map:'sea',name:'蓝鳍金枪鱼',minKg:65,maxKg:180,depth:2,baits:['krill','fishmeal'],price:75,color:'#6688b7'},
 {id:'sea-sailfish',map:'sea',name:'紫帆旗鱼',minKg:75,maxKg:200,depth:2,baits:['squid','krill'],price:78,color:'#9697d2',shape:'long'},
 {id:'sea-swordfish',map:'sea',name:'深海剑鱼',minKg:140,maxKg:320,depth:3,baits:['squid','fishmeal'],price:86,color:'#70acba',shape:'long'},
 {id:'sea-giant',map:'sea',name:'星潮巨斑',minKg:180,maxKg:460,depth:3,baits:['squid','fishmeal'],price:95,color:'#b69bce'}
];
export const MAX_INVENTORY=500;
export const MAX_BAIT_STOCK=10000;
const MAX_BAIT_USES=256;
const tables={rod:RODS,line:LINES,bait:BAITS},fishById=new Map(FISH.map(f=>[f.id,f]));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const random01=rng=>Math.min(.999999999,Math.max(0,finite(rng(),.5)));
const moneyLimit=1e12;
const roundKg=n=>Math.round(n*100)/100;
export function fresh(){return {schema:2,money:0,map:'lake',depth:0,equipped:{rod:'r0',line:'l0',bait:'none'},owned:{rod:['r0'],line:['l0'],bait:['none']},baitStock:Object.fromEntries(BAITS.filter(b=>b.id!=='none').map(b=>[b.id,0])),recentBaitUses:[],inventory:[],catalog:{},landed:0,escaped:0,sold:0,earned:0,seenRewards:[]};}
export function unlocked(s,id){const at=MAPS.findIndex(m=>m.id===id);return at===0||(at>0&&FISH.filter(f=>MAPS.findIndex(m=>m.id===f.map)<at).every(f=>s.catalog[f.id]?.count>0));}
export function gear(s){return Object.fromEntries(Object.entries(tables).map(([kind,list])=>[kind,list.find(t=>t.id===s.equipped[kind])||list[0]]));}
export function canDepth(s,depth){const map=MAPS.find(m=>m.id===s.map);return !!map&&unlocked(s,s.map)&&Number.isInteger(depth)&&depth>=0&&depth<4&&gear(s).line.meters>=map.depths[depth];}
export function baitCount(s,id=s.equipped.bait){if(id==='none')return Infinity;return Math.min(MAX_BAIT_STOCK,Math.max(0,Math.floor(finite(s.baitStock?.[id]))));}
export function buy(s,kind,id){
 const item=tables[kind]?.find(t=>t.id===id);if(!item||s.money<item.price)return false;
 if(kind==='bait'){
  if(id==='none'||baitCount(s,id)+item.pack>MAX_BAIT_STOCK)return false;
  s.baitStock[id]=baitCount(s,id)+item.pack;
 }else if(s.owned[kind].includes(id))return false;
 s.money-=item.price;if(!s.owned[kind].includes(id))s.owned[kind].push(id);return true;
}
// Use one unique cast ID, save immediately, then begin the cast. Retrying the
// same recent cast (including after a reload) must never spend another bait.
export function consumeBait(s,castId){
 const previous=s.recentBaitUses.find(use=>use.id===castId),baitId=previous?.baitId||gear(s).bait.id;
 if(previous)return {ok:true,baitId,remaining:baitCount(s,baitId)};
 const remaining=baitCount(s,baitId);
 if(typeof castId!=='string'||!castId.length||castId.length>100||remaining===0||!s.owned.bait.includes(baitId))return {ok:false,baitId,remaining};
 if(baitId!=='none')s.baitStock[baitId]=remaining-1;
 s.recentBaitUses.push({id:castId,baitId});
 if(s.recentBaitUses.length>MAX_BAIT_USES)s.recentBaitUses.splice(0,s.recentBaitUses.length-MAX_BAIT_USES);
 return {ok:true,baitId,remaining:baitCount(s,baitId)};
}
export function equip(s,kind,id){if(!tables[kind]?.some(t=>t.id===id)||!s.owned[kind].includes(id))return false;s.equipped[kind]=id;if(kind==='line'&&!canDepth(s,s.depth)){let best=0;for(let d=0;d<4;d++)if(canDepth(s,d))best=d;s.depth=best;}return true;}
export function waitSeconds(s,rng=Math.random){return gear(s).bait.id==='none'?7+random01(rng)*4:3+random01(rng)*3;}
let sequence=0;
export function rollCatch(s,rng=Math.random){if(!canDepth(s,s.depth)||s.inventory.length>=MAX_INVENTORY)return null;const bait=gear(s).bait.id,pool=FISH.filter(f=>f.map===s.map&&f.depth===s.depth),weights=pool.map(f=>f.baits.includes(bait)?3.5:1);let pick=random01(rng)*weights.reduce((a,b)=>a+b,0),f=pool.at(-1);for(let i=0;i<pool.length;i++){pick-=weights[i];if(pick<0){f=pool[i];break;}}const kg=roundKg(f.minKg+random01(rng)*(f.maxKg-f.minKg));return {id:f.id,uid:globalThis.crypto?.randomUUID?.()||`fish-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2,10)}`,kg,value:Math.max(1,Math.round(kg*f.price))};}
function validFish(value){const f=fishById.get(value?.id);if(!f||typeof value.uid!=='string'||value.uid.length<1||value.uid.length>100||!Number.isFinite(value.kg)||value.kg<f.minKg-.005||value.kg>f.maxKg+.005)return null;const kg=roundKg(value.kg);return {id:f.id,uid:value.uid,kg,value:Math.max(1,Math.round(kg*f.price))};}
export function land(s,value){const f=validFish(value);if(!f||s.seenRewards.includes(f.uid)||s.inventory.length>=MAX_INVENTORY)return false;s.seenRewards.push(f.uid);if(s.seenRewards.length>2048)s.seenRewards.splice(0,s.seenRewards.length-2048);const g=gear(s);if(f.kg>Math.min(g.rod.kg,g.line.kg)){s.escaped++;return false;}s.inventory.push(f);const old=s.catalog[f.id]||{count:0,best:0};s.catalog[f.id]={count:old.count+1,best:Math.max(old.best,f.kg)};s.landed++;return true;}
export function sell(s,uid){const items=uid==='all'?s.inventory:s.inventory.filter(f=>f.uid===uid);if(!items.length)return 0;const ids=new Set(items.map(f=>f.uid)),gain=items.reduce((n,f)=>n+f.value,0);s.inventory=s.inventory.filter(f=>!ids.has(f.uid));s.money=Math.min(moneyLimit,s.money+gain);s.earned=Math.min(moneyLimit,s.earned+gain);s.sold+=items.length;return gain;}
export function restore(raw){if(!raw)return fresh();let d;try{d=JSON.parse(raw);}catch{throw Error('钓鱼存档无法读取，原始记录已保留，请到账号中心查看备份。');}if(!d||![1,2].includes(d.schema))throw Error('钓鱼存档版本不兼容，请刷新页面。');const s=fresh();for(const k of ['money','landed','escaped','sold','earned'])s[k]=Math.min(moneyLimit,Math.max(0,Math.floor(finite(d[k]))));for(const [kind,list] of Object.entries(tables)){s.owned[kind]=[...new Set([list[0].id,...(Array.isArray(d.owned?.[kind])?d.owned[kind]:[]).filter(id=>list.some(t=>t.id===id))])];if(s.owned[kind].includes(d.equipped?.[kind]))s.equipped[kind]=d.equipped[kind];}
 for(const bait of BAITS.filter(b=>b.id!=='none'))if(s.owned.bait.includes(bait.id))s.baitStock[bait.id]=d.schema===1?bait.pack:baitCount(d,bait.id);
 const uses=new Set();for(const use of Array.isArray(d.recentBaitUses)?d.recentBaitUses.slice(-MAX_BAIT_USES):[]){if(typeof use?.id==='string'&&use.id.length>0&&use.id.length<=100&&s.owned.bait.includes(use.baitId)&&!uses.has(use.id)){uses.add(use.id);s.recentBaitUses.push({id:use.id,baitId:use.baitId});}}
 for(const f of FISH){const c=d.catalog?.[f.id];if(c&&Number.isFinite(c.count)&&c.count>0)s.catalog[f.id]={count:Math.min(1e9,Math.floor(c.count)),best:Math.max(0,Math.min(f.maxKg,finite(c.best)))};}const found=new Set();for(const candidate of Array.isArray(d.inventory)?d.inventory.slice(0,MAX_INVENTORY):[]){const f=validFish(candidate);if(f&&!found.has(f.uid)){found.add(f.uid);s.inventory.push(f);}}
 s.seenRewards=[...new Set([...(Array.isArray(d.seenRewards)?d.seenRewards:[]).filter(x=>typeof x==='string'&&x.length<=100),...s.inventory.map(f=>f.uid)])].slice(-2048);if(MAPS.some(m=>m.id===d.map)&&unlocked(s,d.map))s.map=d.map;s.depth=canDepth(s,d.depth)?d.depth:0;return s;}
export function serialize(s){return JSON.stringify(s);}

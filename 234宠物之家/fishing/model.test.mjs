import assert from 'node:assert/strict';
import {MAPS,FISH,RODS,LINES,BAITS,fresh,restore,serialize,gear,buy,equip,baitCount,consumeBait,unlocked,canDepth,rollCatch,waitSeconds,land,sell,MAX_INVENTORY,MAX_BAIT_STOCK} from './model.mjs';
const s=fresh();assert.equal(MAPS.length,3);assert(MAPS.every(m=>m.depths.length===4));assert.equal(FISH.length,24);assert.equal(RODS.length,10);assert.equal(LINES.length,10);assert(BAITS.length>=8);assert(canDepth(s,0));assert(!canDepth(s,1));assert(!unlocked(s,'river'));assert(!unlocked(s,'sea'));assert(!equip(s,'rod','r9'));assert(!buy(s,'rod','r9'));
const fish=rollCatch(s,()=>.5);assert(land(s,fish));assert(!land(s,fish),'duplicate reward cannot land twice');assert.equal(s.inventory.length,1);assert.equal(s.money,0);const gain=sell(s,fish.uid);assert(gain>0);assert.equal(s.money,gain);assert.equal(sell(s,fish.uid),0);assert(!land(s,fish),'sold reward cannot be re-landed');assert.equal(s.catalog[fish.id].count,1);
assert(waitSeconds(s,()=>0)>=7);s.money=1000;assert(buy(s,'bait','worm'));assert(buy(s,'bait','worm'),'bait can be restocked');assert.equal(baitCount(s,'worm'),20);assert(equip(s,'bait','worm'));assert(waitSeconds(s,()=>.99)<7);assert(equip(s,'bait','none'));assert(waitSeconds(s,()=>0)>=7);assert(buy(s,'line','l2'));assert(equip(s,'line','l2'));assert(canDepth(s,3));s.depth=3;const heavy=rollCatch(s,()=>.9);assert(!land(s,heavy),'rod overload loses fish');assert.equal(s.escaped,1);s.money=1e8;assert(buy(s,'rod','r9'));assert(equip(s,'rod','r9'));assert(!land(s,{...heavy,uid:'line-overload'}),'line overload also loses fish');assert(buy(s,'line','l9'));assert(equip(s,'line','l9'));assert(land(s,{...heavy,uid:'both-strong'}));
for(const f of FISH.filter(f=>f.map==='lake'))assert(land(s,{id:f.id,uid:f.id,kg:f.minKg,value:99999999}));assert(unlocked(s,'river'));assert(!unlocked(s,'sea'));sell(s,'all');assert(unlocked(s,'river'),'selling does not erase encyclopedia');s.map='river';assert(canDepth(s,3));for(const f of FISH.filter(f=>f.map==='river'))assert(land(s,{id:f.id,uid:f.id,kg:f.maxKg,value:99999999}));assert(unlocked(s,'sea'));s.map='sea';s.depth=3;for(const f of FISH.filter(f=>f.map==='sea'))assert(land(s,{id:f.id,uid:f.id,kg:f.maxKg,value:99999999}));assert.equal(Object.keys(s.catalog).length,24);assert.deepEqual(restore(serialize(s)),s);assert(s.inventory.every(f=>f.value===Math.round(f.kg*FISH.find(t=>t.id===f.id).price)),'sale prices recomputed');
assert(equip(s,'line','l0'));assert.equal(s.depth,0);assert(!canDepth(s,0),'basic line is too short for sea');s.map='lake';assert(canDepth(s,0));const still=restore(serialize(s));assert.equal(gear(still).rod.id,'r9');assert.equal(gear(still).line.id,'l0');assert(unlocked(still,'sea'));
const corrupted=restore(JSON.stringify({...fresh(),money:-20,owned:{rod:['bad']},equipped:{rod:'bad'},inventory:[{id:'bad'}],map:'sea'}));assert.equal(corrupted.money,0);assert.equal(corrupted.map,'lake');assert.equal(corrupted.equipped.rod,'r0');assert.equal(corrupted.inventory.length,0);assert.throws(()=>restore('oops'));assert.throws(()=>restore('{"schema":3}'));
// Every species is obtainable at maximum gear, while preferred bait increases selection probability.
const perfect=fresh();perfect.owned.rod.push('r9');perfect.owned.line.push('l9');equip(perfect,'rod','r9');equip(perfect,'line','l9');for(const f of FISH)perfect.catalog[f.id]={count:1,best:f.minKg};for(const m of MAPS){perfect.map=m.id;for(let d=0;d<4;d++){perfect.depth=d;const first=rollCatch(perfect,()=>0),last=rollCatch(perfect,()=>.999999);assert(land(perfect,first));assert(land(perfect,last));assert.equal(FISH.find(f=>f.id===first.id).depth,d);assert.equal(FISH.find(f=>f.id===last.id).depth,d);}}
const baited=fresh();baited.money=1000;buy(baited,'bait','dough');equip(baited,'bait','dough');assert.equal(rollCatch(baited,()=>.6).id,'lake-crucian');equip(baited,'bait','none');assert.equal(rollCatch(baited,()=>.6).id,'lake-minnow');
const full=fresh();for(let i=0;i<MAX_INVENTORY;i++)assert(land(full,{id:'lake-crucian',uid:'bag'+i,kg:.2}));assert.equal(rollCatch(full),null);assert(!land(full,{id:'lake-crucian',uid:'extra',kg:.2}));assert(sell(full,'all')>0);assert(rollCatch(full));
// A cast spends exactly once, including cancellation, duel button retries, and reloads.
const stock=fresh();stock.money=100;assert(buy(stock,'bait','dough'));assert(equip(stock,'bait','dough'));
assert.deepEqual(consumeBait(stock,'cast-1'),{ok:true,baitId:'dough',remaining:9});
for(let i=0;i<30;i++)assert(consumeBait(stock,'cast-1').ok);
assert.equal(baitCount(stock),9,'one cast costs one bait even if its action is retried');
let loaded=restore(serialize(stock));assert(consumeBait(loaded,'cast-1').ok);assert.equal(baitCount(loaded),9,'saving does not permit double charging');
assert(equip(loaded,'bait','none'));assert.equal(consumeBait(loaded,'cast-1').baitId,'dough','an existing cast keeps its original bait identity');
assert(consumeBait(loaded,'free-cast').ok);assert.equal(baitCount(loaded),Infinity);assert.equal(baitCount(loaded,'dough'),9);
assert(equip(loaded,'bait','dough'));for(let i=2;i<=9;i++)assert(consumeBait(loaded,`cast-${i}`).ok);
assert.equal(baitCount(loaded),1);const lastFish=rollCatch(loaded,()=>.6),lastWait=waitSeconds(loaded,()=>.5);
assert(consumeBait(loaded,'last-cast').ok);assert.equal(baitCount(loaded),0);
assert.equal(lastFish.id,'lake-crucian');assert.equal(lastWait,4.5);assert.equal(rollCatch(loaded,()=>.6).id,'lake-crucian','last consumed bait retains its cast preference');
assert.equal(waitSeconds(loaded,()=>.5),4.5);assert.equal(loaded.equipped.bait,'dough','empty stock does not silently change the selected bait');
const emptySnapshot=serialize(loaded);assert(!consumeBait(loaded,'empty-cast').ok);assert.equal(serialize(loaded),emptySnapshot,'empty cast spends neither bait nor money');
assert(equip(loaded,'bait','dough'),'empty owned bait remains selectable for restocking');assert(!consumeBait(loaded,'').ok);assert(!consumeBait(loaded,'x'.repeat(101)).ok);
assert(buy(loaded,'bait','dough'));assert.equal(baitCount(loaded),10);assert(consumeBait(loaded,'empty-cast').ok,'previous failed cast did not reserve an ID');
assert.equal(baitCount(loaded),9);assert.equal(restore(serialize(loaded)).baitStock.dough,9);
const cashBefore=loaded.money;loaded.baitStock.dough=MAX_BAIT_STOCK;assert(!buy(loaded,'bait','dough'));assert.equal(loaded.money,cashBefore,'full stock does not charge for a discarded pack');

// Migration grants each existing permanent recipe one pack exactly once, preserving progress.
const legacy={...s,schema:1,money:2345,landed:42,escaped:3,sold:35,earned:4321,owned:{rod:['r0','r9'],line:['l0','l9'],bait:['none','worm','squid']},equipped:{rod:'r9',line:'l9',bait:'squid'}};
delete legacy.baitStock;delete legacy.recentBaitUses;
const migrated=restore(JSON.stringify(legacy));assert.equal(migrated.schema,2);assert.equal(migrated.money,2345);assert.equal(migrated.landed,42);assert.equal(migrated.escaped,3);assert.equal(migrated.sold,35);assert.equal(migrated.earned,4321);
assert.deepEqual(migrated.inventory,legacy.inventory);assert.deepEqual(migrated.catalog,legacy.catalog);assert.deepEqual(migrated.owned,legacy.owned);assert.deepEqual(migrated.equipped,legacy.equipped);
assert.equal(baitCount(migrated,'worm'),10);assert.equal(baitCount(migrated,'squid'),10);assert.equal(baitCount(migrated,'corn'),0);
assert(consumeBait(migrated,'migrated-cast').ok);let migratedAgain=restore(serialize(migrated));assert.equal(baitCount(migratedAgain,'squid'),9);assert(consumeBait(migratedAgain,'migrated-cast').ok);assert.equal(baitCount(migratedAgain,'squid'),9,'migration and cast retries never refill stock');
const emptyOwned=restore(JSON.stringify({...migratedAgain,baitStock:{squid:0}}));assert.equal(baitCount(emptyOwned,'squid'),0,'missing/empty new stock is not a legacy recipe grant');
const bounded=restore(JSON.stringify({...migratedAgain,baitStock:{squid:1e12,worm:-3,corn:300},recentBaitUses:[{id:'same',baitId:'squid'},{id:'same',baitId:'worm'},{id:'bad',baitId:'invalid'},null]}));
assert.equal(baitCount(bounded,'squid'),MAX_BAIT_STOCK);assert.equal(baitCount(bounded,'worm'),0);assert.equal(baitCount(bounded,'corn'),0,'unowned bait cannot be equipped via forged stock');assert.equal(bounded.recentBaitUses.length,1);
const ledger=fresh();for(let i=0;i<1000;i++)assert(consumeBait(ledger,`free-${i}`).ok);assert.equal(ledger.recentBaitUses.length,256);assert.equal(restore(serialize(ledger)).recentBaitUses.length,256,'cast ledger stays small for mobile/cloud saves');

// Expected net proceeds at every map/depth/bait with gear that can land the whole layer.
// High-cost sea bait is deliberately labelled unsuitable for lake shallows.
let matchedScenarios=0,minMatchedNet=Infinity;
const expectedNet=(map,depth,bait)=>{const pool=FISH.filter(f=>f.map===map&&f.depth===depth),weights=pool.map(f=>f.baits.includes(bait.id)?3.5:1),total=weights.reduce((a,b)=>a+b,0);return pool.reduce((sum,f,i)=>sum+weights[i]/total*((f.minKg+f.maxKg)/2*f.price),0)-bait.unitPrice;};
for(const map of MAPS)for(let depth=0;depth<4;depth++)for(const bait of BAITS){
 const pool=FISH.filter(f=>f.map===map.id&&f.depth===depth),net=expectedNet(map.id,depth,bait),matched=bait.id==='none'||pool.some(f=>f.baits.includes(bait.id));
 assert(Number.isFinite(net));if(matched){assert(net>0,`${map.id}/${depth}/${bait.id} should make money with suitable gear`);minMatchedNet=Math.min(minMatchedNet,net);matchedScenarios++;}
 if(net<=0)assert(map.id==='lake'&&depth===0&&['krill','squid'].includes(bait.id),'only explicitly warned sea bait in lake shallows may lose money');
}
for(const bait of BAITS.filter(b=>b.id!=='none'))assert.equal(bait.unitPrice,bait.price/bait.pack);
const worm=BAITS.find(b=>b.id==='worm');for(const f of FISH.filter(f=>f.map==='lake'&&f.depth===0))assert(Math.round(f.minKg*f.price)>worm.unitPrice,'even the smallest starter catch covers one worm');

// Repeat buying, casting, selling and saving for each appropriately targeted bait.
// Starting bankroll pays only one pack; proceeds must fund every subsequent pack.
let simulationCasts=0;
for(const map of MAPS)for(let depth=0;depth<4;depth++)for(const bait of BAITS.filter(b=>b.id!=='none'&&FISH.some(f=>f.map===map.id&&f.depth===depth&&f.baits.includes(b.id)))){
 let run=fresh();const layer=FISH.filter(f=>f.map===map.id&&f.depth===depth),maxKg=Math.max(...layer.map(f=>f.maxKg));
 const rod=RODS.find(g=>g.kg>=maxKg),line=LINES.find(g=>g.kg>=maxKg&&g.meters>=map.depths[depth]);run.owned.rod.push(rod.id);run.owned.line.push(line.id);equip(run,'rod',rod.id);equip(run,'line',line.id);
 for(const f of FISH)run.catalog[f.id]={count:1,best:f.minKg};run.map=map.id;run.depth=depth;run.money=bait.price;assert(buy(run,'bait',bait.id));equip(run,'bait',bait.id);
 let seed=123456789;const rng=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
 for(let cast=0;cast<80;cast++){
  if(baitCount(run)===0)assert(buy(run,'bait',bait.id),`earnings must fund restocking ${map.id}/${depth}/${bait.id}`);
  const caught=rollCatch(run,rng),wait=waitSeconds(run,rng);assert(caught);assert(wait>=3&&wait<6);assert(consumeBait(run,`trip-${cast}`).ok);assert(land(run,caught));assert(sell(run,caught.uid)>0);
  if(cast%10===9){run=restore(serialize(run));assert(consumeBait(run,`trip-${cast}`).ok);}
  simulationCasts++;
 }
 assert(run.money>bait.price,`positive net income after 80 paid casts: ${map.id}/${depth}/${bait.id}`);assert.equal(baitCount(run),0);assert.equal(run.sold,80);assert.equal(run.escaped,0);
}
const starter=fresh();starter.money=worm.price;buy(starter,'bait','worm');equip(starter,'bait','worm');for(let cast=0;cast<40;cast++){if(!baitCount(starter))assert(buy(starter,'bait','worm'));const caught=rollCatch(starter,()=>.5);assert(consumeBait(starter,`starter-${cast}`).ok);assert(land(starter,caught));sell(starter,'all');}
assert(buy(starter,'rod','r1'));assert(buy(starter,'line','l1'),'early earnings comfortably reach both first gear upgrades');
console.log(`PASS existing fishing progression; consumable bait, save/retry safety, one-time migration, stock limits; ${matchedScenarios} positive targeted economy scenarios (lowest expected net ${minMatchedNet.toFixed(2)}/cast), ${simulationCasts} profitable simulated casts, affordable starter upgrades.`);

import assert from 'node:assert/strict';
import {fresh,stats,TECH,MUSHROOM_TECH,price,buy,collect,recycle,cook,restore,serialize,COUNT,advance,move} from './model.mjs';
// Existing upgrades retain their effects; the additional tiers improve the late game.
const old=fresh();Object.assign(old.tech,{bag:10,cart:5,speed:8,recycle:5});
assert.equal(stats(old).capacity,292);assert.equal(stats(old).speed,4.04);assert.equal(stats(old).unload,30);
old.map=1;Object.assign(old.tech,{m_basket:6,m_stride:4,m_handoff:5});
assert.equal(stats(old).capacity,84);assert.equal(stats(old).speed,3);assert.equal(stats(old).unload,36);
for(const map of [0,1]){
 const s=fresh();s.map=map;s.goldCompleted=!!map;s.money=1e9;const tree=map?MUSHROOM_TECH:TECH;
 // Buy prerequisites and every new rank through the same economy functions as the UI.
 for(let pass=0;pass<3;pass++)for(const t of tree)while(buy(s,t.id)){}
 for(const t of tree){assert.equal(s.tech[t.id],t.max);assert(!buy(s,t.id));let previous=0;for(let lv=0;lv<t.max;lv++){const amount=price({tech:{[t.id]:lv}},t);assert(Number.isSafeInteger(amount)&&amount>previous);previous=amount;}}
 const st=stats(s);assert.equal(st.capacity,map?948:1572);assert(Math.abs(st.speed-(map?8.76:8.36))<1e-9);assert.equal(st.unload,map?261:330);
 s.bag=st.capacity;s.x=0;s.z=6.8;const roundtrip=restore(serialize(s));assert.deepEqual(roundtrip.tech,s.tech);assert.equal(roundtrip.bag,s.bag);assert.deepEqual(stats(roundtrip),st);
 // A maximum backpack unloads within five seconds, pays once, and preserves the map-specific pipeline.
 const balance=s.money;for(let i=0;i<5;i++)recycle(s,st.unload);assert.equal(s.bag,0);recycle(s,st.unload);
 if(map){assert.equal(s.money,balance);assert.equal(s.mushrooms.queue,948);cook(s,100);assert.equal(s.mushrooms.sold,948);assert.equal(s.money,balance+948*st.value);}
 else assert.equal(s.money,balance+1572*st.value);
 s.x=0;s.z=7;move(s,-1,0,.05);assert(s.z<=7.2,'late speed cannot pass through workbench');
 if(!map){s.taken=Array.from({length:COUNT},(_,i)=>i);assert(advance(s));assert.equal(stats(s).capacity,12);assert.equal(stats(s).speed,1.8);assert.equal(stats(s).unload,6);}
}
// Fixed coin supply must be enough to buy the extended gold tree through a legitimate earnings route.
const investor=fresh();let used=0;
function fund(t){while(investor.money<price(investor,t)){assert(used<COUNT,'extended tree exceeds all coin income');collect(investor,[used++]);recycle(investor,1);}assert(buy(investor,t.id));}
fund(TECH.find(t=>t.id==='grip'));fund(TECH.find(t=>t.id==='tempo'));fund(TECH.find(t=>t.id==='tempo'));
const value=TECH.find(t=>t.id==='value');while((investor.tech.value||0)<value.max)fund(value);
for(const t of TECH)while((investor.tech[t.id]||0)<t.max)fund(t);
assert(used<COUNT);console.log(`PASS expanded caps, old-effect preservation, compact save at new caps, fast bulk delivery, map isolation, collision; full gold tree funded by ${used}/${COUNT} coins`);

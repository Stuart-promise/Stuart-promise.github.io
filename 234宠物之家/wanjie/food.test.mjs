import assert from 'node:assert/strict';
import {Battle} from './engine.mjs';import {FOODS,FOOD_BY_ID,MAP_FOODS} from './food.mjs';
const state={hero:0,talents:{},training:{health:0,attack:0,speed:0,regen:0,reroll:0}};
assert.equal(FOODS.length,12);assert.equal(FOODS.filter(f=>f.group==='fruit').length,6);
for(let m=0;m<3;m++){
 const b=new Battle(state,m,()=>.5);const ids=new Set(b.plants.filter(p=>p.ingredient!=='spice').map(p=>p.ingredient));assert.deepEqual([...ids].sort(),[...MAP_FOODS[m]].sort());
 b.spawn=1000;b.weapons=[];
 for(const id of MAP_FOODS[m]){b.plants=[{x:b.x,y:b.y,ingredient:id,type:FOOD_BY_ID[id].group,ready:0}];b.step(.01,0,0);assert(b.loot.produce[id]>0);}
 for(const group of ['veg','fruit'])assert.equal(b.loot[group],Object.entries(b.loot.produce).filter(([id])=>FOOD_BY_ID[id].group===group).reduce((sum,[,n])=>sum+n,0));
}
const b=new Battle(state,0);let last=0,interval=2;
for(let wave=1;wave<=8;wave++){b.t=(wave-1)*60;const p=b.wavePressure();assert.equal(p.wave,wave);assert(p.batch>last);assert(p.interval<=interval);last=p.batch;interval=p.interval;}
b.t=420;const normal=b.wavePressure();b.endless=true;assert(b.wavePressure().interval<normal.interval);for(let i=0;i<200;i++)b.enemy();for(let i=0;i<200;i++)b.enemy('elite');b.enemy('boss');assert.equal(b.enemies.length,104);b.enemy('boss');assert.equal(b.enemies.length,104);
const c=new Battle(state,0);c.xp=8;c.step(.001,0,0);assert.equal(c.level,2);assert(c.need>5+2*2.2);
console.log('PASS: map-specific produce, aggregate harvest totals, wave batches and intervals, endless pressure, hard entity budget and higher XP');

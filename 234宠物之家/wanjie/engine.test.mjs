import assert from 'node:assert/strict';
import {Battle} from './engine.mjs';
const state={hero:0,talents:{},training:{health:0,attack:0,speed:0,regen:0,reroll:0}};
const b=new Battle(state,0,()=>.5);
for(let i=0;i<500;i++){const choices=b.choices(i%3===0);assert(choices.length>0&&choices.length<=3);b.choose(choices[0]);assert(b.weapons.length<=6);assert(Object.keys(b.passives).length<=6);}
const c=new Battle(state,0);c.hp=c.maxhp=1e8;
for(let i=0;i<60*480;i++){c.step(1/60,Math.sin(i/100),Math.cos(i/100));if(c.pending){c.choose(c.choices()[0]);c.pending--;}if(c.high){c.choose(c.choices(true)[0]);c.high--;}assert(c.enemies.length<=103);assert(c.shots.length<=100);assert(c.gems.length<=110);}
assert(c.bossSpawned);assert(c.t>479);assert(Number.isFinite(c.x));assert(c.loot.meat>0);
const d=new Battle({...state,training:{...state.training,attack:20}},0,()=>.5),e=new Battle(state,0,()=>.5);d.enemy();e.enemy();assert.equal(d.enemies[0].hp,e.enemies[0].hp,'permanent growth must not scale enemies');
console.log('PASS: 8 minute simulation, build limits, entity caps, loot, boss, independent difficulty');

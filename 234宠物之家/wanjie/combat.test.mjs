import assert from 'node:assert/strict';
import {Battle,WEAPONS} from './engine.mjs';
const state={hero:0,talents:{},training:{health:0,attack:0,speed:0,regen:0,reroll:0}};
const b=new Battle(state,0,()=>.5);b.spawn=1e6;b.weapons=[];
b.step(.05,1,0);assert(b.moving&&b.stride>0);const stride=b.stride;
b.step(.05,0,0);assert(!b.moving);assert.equal(b.stride,stride,'standing must not advance walk frames');
const o=b.obstacles.find(o=>o.x===565);b.x=o.x-o.r-16-.15;b.y=o.y;
b.step(.05,1,0);assert(!b.moving,'blocked movement must stop walking animation');
for(const [id] of WEAPONS){
 const a=new Battle(state,0,()=>.5);a.spawn=1e6;a.weapons=[{id,lv:1,cd:0}];a.plants=[];
 a.enemy();Object.assign(a.enemies[0],{x:980,y:650,hp:1e6,max:1e6,cd:100});
 for(let i=0;i<2;i++)a.step(.016,0,0);
 assert(a.shots.some(p=>p.id===id)||a.effects.some(e=>e.id===id),'weapon retains its own visual identity: '+id);
 if(id==='lightning'){const fx=a.effects.find(e=>e.id===id);assert.equal(fx.targets.length,1);assert(fx.targets[0].x>900);}
}
for(let i=0;i<200;i++)b.emit({id:'impact',t:.2,max:.2});assert.equal(b.effects.length,24,'reserve effect budget for attacks');
for(let i=0;i<200;i++)b.emit({id:'ice',t:.3,max:.3});assert.equal(b.effects.length,40,'total visual effects remain bounded');
const a=new Battle(state,0,()=>.5);a.weapons=[];a.spawn=1e6;a.plants=[{x:900,y:650,type:'spice',ready:0}];a.step(.016,0,0);assert(a.effects.some(e=>e.id==='harvest'&&e.food==='spice'));assert(a.loot.spice>0);
console.log('PASS: distance-based walking, idle/wall stop, 12 weapon identities, lightning targets, effect caps and harvesting');

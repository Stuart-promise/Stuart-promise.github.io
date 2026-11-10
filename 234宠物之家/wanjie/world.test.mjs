import assert from 'node:assert/strict';
import {Terrain} from './world.mjs';
import {Battle} from './engine.mjs';
const state={hero:0,talents:{},training:{health:0,attack:0,speed:0,regen:0,reroll:0}};
for(let map=0;map<3;map++){
  const terrain=new Terrain(map),o=terrain.obstacles.find(o=>o.x===565);
  for(const radius of [16,29,48]){
    const actor={x:o.x-o.r-radius-30,y:o.y};
    terrain.move(actor,300,0,radius);
    assert(actor.x<o.x,'swept movement must not tunnel through solid scenery');
    assert(terrain.free(actor.x,actor.y,radius));
    for(let i=0;i<80;i++){terrain.move(actor,2,2,radius);assert(terrain.free(actor.x,actor.y,radius),'diagonal movement slides along obstacles');}
    const enemy={x:o.x-o.r-radius-60,y:o.y,r:radius};
    const target={x:o.x+o.r+radius+80,y:o.y};
    for(let i=0;i<600;i++){terrain.chase(enemy,target,1.5);assert(terrain.free(enemy.x,enemy.y,radius));}
    assert(Math.hypot(enemy.x-target.x,enemy.y-target.y)<20,'enemy routes around obstacle');
  }
  let seed=12;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const b=new Battle(state,map,rng);b.hp=b.maxhp=1e8;
  for(const p of b.plants)assert(terrain.free(p.x,p.y,28),'food spawns on walkable ground');
  for(const type of ['normal','elite','boss'])for(let i=0;i<20;i++){b.enemy(type);const e=b.enemies.at(-1);assert(terrain.free(e.x,e.y,e.r));}
  for(let i=0;i<3600;i++){b.step(1/60,Math.sin(i/220),Math.cos(i/220));assert(terrain.free(b.x,b.y,16));for(const e of b.enemies)assert(terrain.free(e.x,e.y,e.r),'enemy movement and dash stay outside solids');}
  // Flood the world on a 20-unit grid to ensure every collectible connects to arrival.
  const seen=new Set(),queue=[[900,660]];seen.add('900,660');
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&terrain.free(nx,ny,16)){seen.add(key);queue.push([nx,ny]);}}}
  for(const p of b.plants)assert(queue.some(([x,y])=>Math.hypot(p.x-x,p.y-y)<30),'food reachable from start');
}
console.log('PASS: all maps; collision, sliding, dash, enemy detours, safe spawns and reachable food');

import assert from 'node:assert/strict';
import {Restaurant,restaurantFrame,GUEST_TYPES,isSeated} from './restaurant.mjs';
for(const level of [1,3,8]){
 const r=new Restaurant({level,assigned:[0,2],staff:{0:1,2:1}});
 const start=r.chefs.map(c=>[c.x,c.y]);let queueSeen=false,eatingSeen=false,deliverySeen=false;const looks=new Set(),walkingFrames=new Set();
 for(let i=0;i<18000;i++){
  r.step(1/30);
  const occupied=r.seats.filter(s=>s.guest);
  assert(occupied.length<=r.seats.length);
  assert.equal(new Set(occupied.map(s=>s.guest.id)).size,occupied.length);
  assert(r.queue.length<=6);assert(r.customers.length<=r.seats.length+6);
  assert.deepEqual(r.chefs.map(c=>[c.x,c.y]),start);
  for(const g of r.customers){looks.add(g.look);assert.equal(g.race,GUEST_TYPES[g.look]);assert(Number.isFinite(g.stride));if(isSeated(g))assert.equal(restaurantFrame(g,'guest'),5);else if(g.moving)walkingFrames.add(restaurantFrame(g,'guest'));else assert.equal(restaurantFrame(g,'guest'),0);}
  if(r.queue.length)queueSeen=true;
  if(r.customers.some(g=>g.state==='eating'))eatingSeen=true;
  if(r.waiters.some(w=>w.phase==='delivery'))deliverySeen=true;
 }
 assert(queueSeen&&eatingSeen&&deliverySeen&&r.completed>5);
 assert.equal(looks.size,8);assert.equal(walkingFrames.size,4);
 console.log('PASS',level,'level:',r.completed,'served; bounded FIFO queue, reserved chairs, fixed chefs');
}

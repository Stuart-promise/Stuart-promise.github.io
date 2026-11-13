import assert from 'node:assert/strict';
import {CoinPile,COUNT,LAYER} from './pile.mjs';
import {restore,serialize,stats,fresh,collect,recycle} from './model.mjs';
const p=new CoinPile(),s=fresh();assert(COUNT>20000);const peak=p.columns.reduce((a,b)=>a.depth>b.depth?a:b);assert(peak.depth*LAYER>2.8);assert(peak.depth*LAYER+1.6<4.9);
const before=p.heightAt(peak.x,peak.z),top=peak.next;p.remove([top]);assert(Math.abs(p.heightAt(peak.x,peak.z)-(before-LAYER))<1e-6);p.remove([top]);assert.equal(peak.left,peak.depth-1,'duplicate mining cannot remove another layer');assert.equal(peak.next,top-1);
const legacy={schema:1,money:321,bag:3,collected:8,delivered:5,earned:321,tech:{grip:2},taken:[4,1,8],shipment:3,x:1,z:5,yaw:0,pitch:-.5};const migrated=restore(JSON.stringify(legacy));assert.equal(migrated.schema,3);for(const k of ['money','bag','collected','delivered','earned','shipment'])assert.equal(migrated[k],legacy[k]);assert.deepEqual(migrated.taken,legacy.taken);assert.equal(migrated.tech.grip,2);
const sparse=restore(serialize(migrated));assert.deepEqual(new Set(sparse.taken),new Set(migrated.taken));const dense=fresh();dense.taken=Array.from({length:COUNT},(_,i)=>i);const packed=serialize(dense);assert(packed.length<5000);assert.equal(restore(packed).taken.length,COUNT);assert.equal(new CoinPile(0,dense.taken).heightAt(peak.x,peak.z),0);assert.throws(()=>restore('{"schema":2,"removed":"bad"}'));
// Every remaining coin can be exposed and harvested from above, without buried IDs being lost.
const mine=new CoinPile(0,[1,4,8]);for(const c of mine.columns){while(c.left){const id=c.next;assert(id>=c.start);mine.remove([id]);}assert(c.next<c.start);}assert.equal(mine.gone.size,COUNT);
const playable=new CoinPile();s.x=0;s.z=3.8;const targets=playable.targets(s,stats(s));assert(targets.ids.length);const ids=collect(s,targets.ids);playable.remove(ids);assert.equal(ids.length,1);assert.equal(s.bag,1);recycle(s,1);assert.equal(s.money,1);
console.log('PASS mountain height, layer removal/idempotency, legacy migration, compact cloud save, full depletion and reachable pickup');

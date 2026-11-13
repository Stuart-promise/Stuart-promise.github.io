import * as THREE from './vendor/three.module.js';
import {CoinRoom} from './scene.mjs?v=4';
import {MUSHROOM_COUNT,mushrooms,mushroomTargets} from './mushrooms.mjs?v=3';
import {level,stats} from './model.mjs?v=4';
export class MushroomRoom extends CoinRoom {
 build(){
  this.scene.fog=new THREE.Fog(0x6e8c69,17,38);this.renderer.setClearColor(0x839e79);
  this.box(0,-.14,0,20,.28,20,0x66744a);const bed=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,.025,12),this.mat(0x8a8951),54);for(let i=0;i<54;i++){this.dummy.position.set(-7.5+(i%6)*3,.02,-8+Math.floor(i/6)*1.45);this.dummy.scale.set(1.35,1,.8);this.dummy.rotation.set(0,0,0);this.dummy.updateMatrix();bed.setMatrixAt(i,this.dummy.matrix);}this.scene.add(bed);
  for(const x of [-9.8,9.8])for(let z=-9;z<=9;z+=2){this.box(x,.65,z,.18,1.3,.18,0x6d593c);for(const y of [.4,.95])this.box(x,y,z,.13,.13,2.1,0xb6a071);}
  for(let x=-9;x<=9;x+=2){this.box(x,.65,-9.8,.18,1.3,.18,0x6d593c);for(const y of [.4,.95])this.box(x,y,-9.8,2.1,.13,.13,0xb6a071);}
  // Trees stay outside the playable boundary; no invisible trunks in harvesting routes.
  const leaves=new THREE.ConeGeometry(2.5,4.5,7),trunk=new THREE.CylinderGeometry(.25,.4,4,7);for(let i=0;i<18;i++){const side=i<7?-1:i<14?1:0,x=side?side*11.2:-8+(i-14)*5,z=side?-10+(i%7)*3.7:-12;const stem=new THREE.Mesh(trunk,this.mat(0x765a3a));stem.position.set(x,2,z);this.scene.add(stem);const crown=new THREE.Mesh(leaves,this.mat(i%2?0x416d50:0x587b4b));crown.position.set(x,5,z);this.scene.add(crown);}
  this.text('MUSHROOM GARDEN',0,3.4,-9.6,6,1,'#3f6349','#f3e1b1');this.text('02 / 菌香小馆',0,2.45,-9.6,3.5,.65,'#3f6349','#ecdfb4');
  this.box(0,.04,6.6,4,.08,5,0xa99568);for(let z=4.3;z<9.4;z+=.5)this.box(0,.09,z,3.9,.025,.025,0x7a654a);
  this.box(0,.65,8.45,3,1.3,1.5,0x795d3b);this.box(0,1.35,8.45,3.3,.16,1.75,0xd5b77d);for(const x of [-1.6,1.6])this.box(x,2.1,8.9,.16,4.2,.16,0x6d5034);this.box(0,4,8.7,4.2,.2,2.6,0xb77c4f);
  this.text('蘑菇烤串 · 出餐口',0,2.75,8.3,3.5,.65,'#754a31','#ffe8b9',Math.PI);this.text('交付 → 烤制 → 出餐',0,.73,7.66,2.65,.4,'#795d3b','#ffe7b3',Math.PI);
  this.box(0,1.48,8.4,2,.18,.9,0x313c33);this.coals=this.box(0,1.59,8.4,1.7,.035,.65,0xf18b38);this.coals.material=new THREE.MeshBasicMaterial({color:0xf18b38});for(let x=-.8;x<=.8;x+=.2)this.box(x,1.64,8.4,.035,.025,.82,0x9c9a7f);
  this.skewers=new THREE.Group();this.scene.add(this.skewers);for(let k=0;k<4;k++){const x=-.65+k*.43;this.box(x,1.72,8.3,.025,.025,1.1,0xe2c58b,this.skewers);for(let j=0;j<3;j++){const cap=new THREE.Mesh(new THREE.SphereGeometry(.11,8,4,0,Math.PI*2,0,Math.PI/2),this.mat(0xc48649));cap.position.set(x,1.74,8+j*.22);this.skewers.add(cap);}}
  this.box(-1.18,1.46,7.88,.5,.08,.45,0xf0e0b1);this.box(1.18,1.58,8,.22,.45,.22,0xaa6034);
  this.ring=new THREE.Mesh(new THREE.RingGeometry(.2,.23,20),new THREE.MeshBasicMaterial({color:0xffe5a7,side:THREE.DoubleSide,transparent:true,opacity:.9}));this.ring.rotation.x=-Math.PI/2;this.scene.add(this.ring);
 }
 resetCoins(s){this.pile={heightAt:()=>0};this.positions=mushrooms(s.mushrooms.batch);this.gone=new Set(s.mushrooms.taken);if(!this.stems){this.stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.085,.4,7),this.mat(0xf4dfae),MUSHROOM_COUNT);this.caps=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,5,0,Math.PI*2,0,Math.PI/2),this.mat(0xffffff,12),MUSHROOM_COUNT);this.dots=new THREE.InstancedMesh(new THREE.SphereGeometry(.038,5,3),this.mat(0xffedce),MUSHROOM_COUNT*2);for(const mesh of [this.stems,this.caps,this.dots]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;this.scene.add(mesh);}}
  const color=new THREE.Color();for(let i=0;i<MUSHROOM_COUNT;i++)this.caps.setColorAt(i,color.setHex([0xb97145,0xc34f3d,0xe0bc6d][this.positions[i].kind]));this.caps.instanceColor.needsUpdate=true;
  for(let i=0;i<MUSHROOM_COUNT;i++)this.setMushroom(i);this.updateMushrooms();
 }
 setMushroom(id){const p=this.positions[id],d=this.dummy,scale=this.gone.has(id)?0:p.size;d.position.set(p.x,p.y/2,p.z);d.rotation.set(0,p.angle,0);d.scale.set(scale,p.y/.4,scale);if(!scale)d.scale.setScalar(0);d.updateMatrix();this.stems.setMatrixAt(id,d.matrix);d.position.y=p.y;d.scale.set(.23*scale,.16*scale,.23*scale);d.updateMatrix();this.caps.setMatrixAt(id,d.matrix);for(let n=0;n<2;n++){d.position.set(p.x+Math.cos(p.angle+n*2)*.1*scale,p.y+.13*scale,p.z+Math.sin(p.angle+n*2)*.1*scale);d.scale.setScalar(scale);d.updateMatrix();this.dots.setMatrixAt(id*2+n,d.matrix);}}
 updateMushrooms(){for(const mesh of [this.stems,this.caps,this.dots])mesh.instanceMatrix.needsUpdate=true;}
 remove(ids){for(const id of ids){this.gone.add(id);this.setMushroom(id);}this.updateMushrooms();this.pulse=1;}
 targets(s,st){const {ids,point}=mushroomTargets(s,st,this.positions,this.gone);this.ring.visible=!!point;if(point){this.ring.position.set(point.x,.045,point.z);this.ring.scale.setScalar(Math.min(3,1+st.radius*.5));}return ids;}
 updateTool(s){const id=level(s,'m_sickle')?'harvester':level(s,'m_reach')?'picker':'mushroom-hand';if(id===this.lastTool)return;this.lastTool=id;for(const child of [...this.implement.children]){child.geometry?.dispose();this.implement.remove(child);}if(id==='mushroom-hand')return;this.box(0,.25,-.1,.06,.25,.08,0x98683d,this.implement);this.box(0,.4,-.28,.07,.08,.4,0xa8bba1,this.implement);if(id==='picker'){for(const x of [-.12,.12])this.box(x,.4,-.48,.05,.08,.3,0xd4d5ad,this.implement);this.box(0,.4,-.35,.3,.06,.05,0xd4d5ad,this.implement);}else{this.box(0,.42,-.42,.4,.1,.3,0x507b5e,this.implement);for(const x of [-.16,0,.16])this.box(x,.38,-.6,.055,.05,.2,0xe7d9ae,this.implement);}}
 draw(s,dt,moving){this.skewers.visible=s.mushrooms.queue>0;this.coals.material.color.setHex(s.mushrooms.queue>0?0xf3a33d:0x8a5135);super.draw(s,dt,moving);}
}

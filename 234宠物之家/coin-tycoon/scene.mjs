import * as THREE from './vendor/three.module.js';
import {COUNT,coins,level,MACHINE} from './model.mjs?v=1';
export class CoinRoom {
 constructor(canvas,state){
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0x9cae9b);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;
  this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(0xaab9a3,16,33);this.camera=new THREE.PerspectiveCamera(66,1,.06,45);this.camera.rotation.order='YXZ';this.scene.add(this.camera);this.scene.add(new THREE.HemisphereLight(0xfff4d9,0x5b7969,1.8));const sun=new THREE.DirectionalLight(0xffefcb,2.2);sun.position.set(-4,9,3);this.scene.add(sun);const fill=new THREE.DirectionalLight(0xbceee0,.8);fill.position.set(7,4,-8);this.scene.add(fill);
  this.materials={};this.dummy=new THREE.Object3D();this.effects=[];this.clock=0;this.lastTool='';this.build();this.resetCoins(state);this.createHands();this.resize();
 }
 mat(color,shine=0){const key=color+':'+shine;return this.materials[key]??=new THREE.MeshPhongMaterial({color,shininess:shine,specular:shine?0xffdba0:0x222222});}
 box(x,y,z,w,h,d,color,parent=this.scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(color));m.position.set(x,y,z);parent.add(m);return m;}
 text(text,x,y,z,w,h,bg='#214b43',color='#f8e8af',rotation=0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,512,128);c.fillStyle=color;c.font='bold 54px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,67,480);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));m.position.set(x,y,z);m.rotation.y=rotation;this.scene.add(m);return m;}
 build(){
  this.box(0,-.15,0,20,.3,20,0xc8c6a7);const tile=new THREE.InstancedMesh(new THREE.BoxGeometry(1.96,.016,1.96),this.mat(0xd7d4b6),100);let i=0;for(let x=-9;x<10;x+=2)for(let z=-9;z<10;z+=2){this.dummy.position.set(x,.005,z);this.dummy.rotation.set(0,0,0);this.dummy.scale.set(1,1,1);this.dummy.updateMatrix();tile.setMatrixAt(i++,this.dummy.matrix);}this.scene.add(tile);
  this.box(0,2.5,-10,20,5,.3,0x88a591);this.box(-10,2.5,0,.3,5,20,0x729a89);this.box(10,2.5,0,.3,5,20,0xaec2a4);this.box(0,2.5,10,20,5,.3,0x88a591);
  this.box(0,.45,-9.8,20,.9,.15,0x315e51);this.box(-9.8,.45,0,.15,.9,20,0x315e51);this.box(9.8,.45,0,.15,.9,20,0x315e51);this.box(0,.45,9.8,20,.9,.15,0x315e51);
  for(let p=-8;p<=8;p+=4){this.box(p,2.5,-9.7,.17,5,.26,0x4d7965);this.box(-9.7,2.5,p,.26,5,.17,0x4d7965);this.box(9.7,2.5,p,.26,5,.17,0x839f83);}
  this.box(0,5.15,0,20,.2,20,0x34554a);for(let p=-8;p<=8;p+=4){this.box(p,4.9,0,.16,.3,20,0x547163);this.box(0,4.9,p,20,.3,.16,0x547163);}
  for(const x of [-5,5])for(const z of [-6,1,7]){this.box(x,4.6,z,2,.16,.65,0x25473e);const m=this.box(x,4.5,z,1.8,.03,.48,0xffefbf);m.material=new THREE.MeshBasicMaterial({color:0xfff2ce});}
  this.text('GOLD RESERVE',0,3.5,-9.76,6,1.5);this.text('01 / 金币仓库',0,2.1,-9.75,3,.75,'#88a591','#e6f0d6');
  for(const x of [-7,7]){this.box(x,.55,-8.7,2.5,1.1,1.3,0x817348);this.box(x,1.12,-8.7,2.65,.12,1.45,0xbba66d);for(const dx of [-.8,.8])this.box(x+dx,.55,-7.99,.12,1.1,.05,0x435645);}
  // Clear return lane and painted stripes, without dynamic shadows or textures.
  this.box(0,.025,6.5,4,.02,5,0x9eaa8c);for(const x of [-2,2])for(let z=4;z<9;z+=.6)this.box(x,.04,z,.1,.02,.35,0xf1cd63);
  this.box(0,1,8.6,3,2,1.5,0x1f5148);this.box(0,2.1,8.6,3.16,.22,1.65,0x375e54);this.box(0,.2,8.5,3.4,.4,1.9,0x25433e);
  this.box(0,1.2,7.83,2.35,.85,.08,0xe8d9a0);this.box(0,1.2,7.76,1.95,.55,.08,0x152f2d);this.box(0,.91,7.5,2.25,.08,.7,0x9ca888);
  this.box(-1.2,1.85,7.8,.12,.1,.04,0x9ff1b7);this.text('金币回收  /  RECYCLE',0,2.65,8.5,3.5,.65,'#214b43','#f8e8af',Math.PI);this.text('走近后按 E 投入',0,.54,7.73,1.9,.35,'#214b43','#cbe0ba',Math.PI);
  this.machineLight=this.box(1.17,1.85,7.78,.14,.1,.06,0x8cdb9b);this.machineLight.material=new THREE.MeshBasicMaterial({color:0xb2ffd3});
  this.ring=new THREE.Mesh(new THREE.RingGeometry(.19,.22,24),new THREE.MeshBasicMaterial({color:0xfff5b5,side:THREE.DoubleSide,transparent:true,opacity:.9}));this.ring.rotation.x=-Math.PI/2;this.scene.add(this.ring);
 }
 resetCoins(s){this.positions=coins(s.shipment);this.gone=new Set(s.taken);if(!this.coinMesh){const geo=new THREE.CylinderGeometry(1,1,.22,10);this.coinMesh=new THREE.InstancedMesh(geo,this.mat(0xeeba42,90),COUNT);this.coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.coinMesh.frustumCulled=false;this.scene.add(this.coinMesh);this.stampMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.62,.62,.025,8),this.mat(0xffe698,50),COUNT);this.stampMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.stampMesh.frustumCulled=false;this.scene.add(this.stampMesh);}
  for(let i=0;i<COUNT;i++)this.setCoin(i);this.coinMesh.instanceMatrix.needsUpdate=true;this.stampMesh.instanceMatrix.needsUpdate=true;
 }
 setCoin(i){const p=this.positions[i],d=this.dummy;d.position.set(p.x,p.y,p.z);d.rotation.set(p.tilt,p.a,0);const size=this.gone.has(i)?0:p.size;d.scale.setScalar(size);d.updateMatrix();this.coinMesh.setMatrixAt(i,d.matrix);d.position.y+=size*.13;d.updateMatrix();this.stampMesh.setMatrixAt(i,d.matrix);}
 remove(ids){for(const id of ids){this.gone.add(id);this.setCoin(id);}this.coinMesh.instanceMatrix.needsUpdate=true;this.stampMesh.instanceMatrix.needsUpdate=true;this.pulse=1;}
 targets(s,stats){const fx=-Math.sin(s.yaw),fz=-Math.cos(s.yaw),candidates=[];let best=null,bestScore=Infinity;for(let i=0;i<COUNT;i++){if(this.gone.has(i))continue;const p=this.positions[i],dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz);if(d>stats.reach||d<.15)continue;const facing=(dx*fx+dz*fz)/d;if(facing<.4)continue;const score=d+(1-facing)*2;if(score<bestScore){bestScore=score;best=i;}}
  if(best===null){this.ring.visible=false;return [];}
  const p=this.positions[best];this.ring.visible=true;this.ring.position.set(p.x,p.y+.03,p.z);this.ring.scale.setScalar(Math.min(3,1+stats.radius*.5));
  for(let i=0;i<COUNT;i++){if(this.gone.has(i))continue;const q=this.positions[i],d=Math.hypot(q.x-p.x,q.z-p.z);if(d<=stats.radius&&Math.hypot(q.x-s.x,q.z-s.z)<=stats.reach)candidates.push({id:i,d});}candidates.sort((a,b)=>a.d-b.d);return candidates.map(c=>c.id);
 }
 createHands(){this.hand=new THREE.Group();this.camera.add(this.hand);this.hand.position.set(.37,-.42,-.62);this.hand.scale.setScalar(.8);this.box(0,-.17,.08,.19,.48,.2,0x294f46,this.hand);this.box(0,.1,0,.2,.23,.2,0xe7b58c,this.hand);for(let i=0;i<4;i++)this.box(-.074+i*.048,.23,-.025,.039,.13,.12,0xf1c8a3,this.hand);this.implement=new THREE.Group();this.hand.add(this.implement);}
 updateTool(s){const id=level(s,'vacuum')?'vacuum':level(s,'magnet')?'magnet':level(s,'scoop')?'scoop':'hand';if(id===this.lastTool)return;this.lastTool=id;for(const child of [...this.implement.children]){child.geometry?.dispose();this.implement.remove(child);}if(id==='hand')return;
  this.box(0,.26,-.1,.065,.28,.07,0x765b35,this.implement);
  if(id==='scoop'){this.box(0,.4,-.25,.36,.07,.45,0xc1d0bb,this.implement);this.box(0,.46,-.44,.36,.11,.05,0x7f9c89,this.implement);}
  else if(id==='magnet'){for(const x of [-.12,.12]){this.box(x,.38,-.25,.1,.13,.4,0xc77d4a,this.implement);this.box(x,.38,-.48,.1,.13,.1,0xe8dfbd,this.implement);}this.box(0,.38,-.05,.34,.13,.1,0xc77d4a,this.implement);}
  else{this.box(0,.35,-.25,.28,.23,.5,0x358b7e,this.implement);this.box(0,.35,-.56,.4,.16,.16,0x243e3b,this.implement);this.box(0,.48,-.22,.12,.04,.2,0xefca63,this.implement);}
 }
 resize(){const c=this.renderer.domElement,w=c.clientWidth,h=c.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 draw(s,dt,moving){this.clock+=dt;this.pulse=Math.max(0,(this.pulse||0)-dt*4);this.camera.position.set(s.x,1.6+(moving?Math.sin(this.clock*9)*.025:0),s.z);this.camera.rotation.set(s.pitch,s.yaw,0,'YXZ');this.hand.position.y=-.42+(moving?Math.sin(this.clock*9)*.018:0)+this.pulse*.07;this.hand.rotation.x=-this.pulse*.5;this.updateTool(s);this.renderer.render(this.scene,this.camera);}
}

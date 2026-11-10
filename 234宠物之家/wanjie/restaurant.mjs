// Lightweight, bounded visual service simulation. Currency remains server-authoritative.
export const GUEST_TYPES=['人类旅人','人类淑女','精灵学者','精灵乐师','赛博旅客','赛博访客','仙侠书生','仙侠游人'];
export const isSeated=g=>['ordered','cooking','ready','delivery','eating'].includes(g.state);
export function restaurantFrame(actor,role,time=0){if(role==='chef')return actor.job?1+Math.floor(time*5)%4:0;if(role==='guest'&&isSeated(actor))return 5;return actor.moving?1+Math.floor(actor.stride/2)%4:0;}
export class Restaurant {
  constructor(state) {
    this.time=0;this.nextArrival=0;this.serial=0;this.completed=0;
    this.customers=[];this.queue=[];this.orders=[];this.ready=[];
    this.configure(state);
  }
  configure(state) {
    this.level=state.level;
    this.tables=Array.from({length:Math.min(8,state.level+1)},(_,i)=>({x:37+(i%4)*16,y:51+Math.floor(i/4)*25}));
    this.seats=this.tables.flatMap((t,i)=>[-1,1].map(side=>({x:t.x+side*6,y:t.y+3,table:i,side,guest:null})));
    this.chefs=state.assigned.filter(i=>[0,1,4].includes(i)).map((id,i)=>({id,x:36+i*20,y:29,job:null,timer:0,speed:1+.12*(state.staff[id]-1)}));
    this.waiters=state.assigned.filter(i=>[2,3,5].includes(i)).map((id,i)=>({id,x:64+i*5,y:43,job:null,phase:'idle',speed:18*(1+.12*(state.staff[id]-1)),path:[],stride:0,moving:false,face:1}));
  }
  arrival() {
    if(this.queue.length>=6)return;
    const id=++this.serial,look=(id-1)%8;
    const g={id,look,race:GUEST_TYPES[look],x:6,y:94,state:'queue',seat:null,timer:0,path:[],stride:0,moving:false,face:1};
    this.customers.push(g);this.queue.push(g);
  }
  move(actor,dt,speed) {
    const p=actor.path[0];if(!p)return true;
    const dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx*2,dy),travel=Math.min(d,speed*dt);
    if(d<=speed*dt){actor.x=p.x;actor.y=p.y;actor.path.shift();}else{actor.x+=dx/d*travel;actor.y+=dy/d*travel;}
    actor.moving=travel>.001;actor.stride+=travel;if(Math.abs(dx)>.001)actor.face=Math.sign(dx);
    return actor.path.length===0;
  }
  step(dt) {
    for(const a of [...this.customers,...this.waiters])a.moving=false;
    this.time+=dt;this.nextArrival-=dt;
    if(this.nextArrival<=0){this.arrival();this.nextArrival=Math.max(1.8,3.5-this.level*.12);}
    // A chair is reserved before walking to it: two guests can never claim one seat.
    for(const seat of this.seats)if(!seat.guest&&this.queue.length){
      const g=this.queue.shift();seat.guest=g;g.seat=seat;g.state='walking';
      g.path=[{x:23,y:g.y},{x:23,y:seat.y+8},{x:seat.x,y:seat.y+8},{x:seat.x,y:seat.y}];
    }
    this.queue.forEach((g,i)=>{g.path=[{x:9+(i%2)*10,y:47+Math.floor(i/2)*18}];this.move(g,dt,22);});
    for(const g of this.customers){
      if(g.state==='walking'&&this.move(g,dt,24)){g.state='ordered';g.moving=false;g.face=g.seat.side<0?1:-1;this.orders.push(g);}
      if(g.state==='eating'){g.timer-=dt;if(g.timer<=0){g.state='leaving';g.path=[{x:g.x,y:g.y+8},{x:23,y:g.y+8},{x:23,y:94},{x:5,y:94}];}}
      if(g.state==='leaving'&&this.move(g,dt,17)){g.state='gone';g.seat.guest=null;this.completed++;}
    }
    this.customers=this.customers.filter(g=>g.state!=='gone');
    for(const chef of this.chefs){
      if(!chef.job&&this.orders.length){chef.job=this.orders.shift();chef.job.state='cooking';chef.timer=7/chef.speed;}
      if(chef.job){chef.timer-=dt;if(chef.timer<=0){chef.job.state='ready';this.ready.push(chef.job);chef.job=null;}}
    }
    for(const w of this.waiters){
      if(!w.job&&this.ready.length){w.job=this.ready.shift();w.phase='pickup';w.path=[{x:w.x,y:43},{x:70,y:43}];}
      if(w.phase==='pickup'&&this.move(w,dt,w.speed)){w.phase='delivery';w.job.state='delivery';w.path=[{x:26,y:43},{x:26,y:w.job.seat.y+10},{x:w.job.seat.x,y:w.job.seat.y+10}];}
      else if(w.phase==='delivery'&&this.move(w,dt,w.speed)){w.job.state='eating';w.job.timer=10;w.job=null;w.phase='return';w.path=[{x:26,y:w.y},{x:26,y:43},{x:70,y:43}];}
      else if(w.phase==='return'&&this.move(w,dt,w.speed))w.phase='idle';
    }
  }
}

const names=['岩炉','绯菈','伊岚','糖铃','青禾','赤影'];
const labels={queue:'等位',walking:'入座',ordered:'等餐',cooking:'烹饪中',ready:'待送餐',delivery:'送餐中',eating:'用餐',leaving:'离店'};
export function mountRestaurant(root,state,existing) {
  const signature=JSON.stringify([2,state.level,state.assigned,state.staff]);
  const model=existing?.signature===signature?existing:new Restaurant(state);model.signature=signature;
  root.innerHTML=`<div class="service-zone kitchen-zone"><span>厨房</span></div><div class="pass-counter">取餐台 <b class="ready-count">0</b></div><div class="queue-zone">等候区</div><div class="entrance">入口 / 出口</div><div class="dining-tables"></div><div class="restaurant-actors"></div><div class="service-status" role="status"></div>`;
  const tables=root.querySelector('.dining-tables'),actors=root.querySelector('.restaurant-actors');
  model.tables.forEach((t,i)=>{const el=document.createElement('div');el.className='dining-table';el.style.left=t.x+'%';el.style.top=t.y+'%';el.style.zIndex=String(Math.round((t.y+5)*2));el.innerHTML=`<i class="chair left"></i><i class="chair right"></i><span>${i+1}</span><b></b>`;tables.append(el);});
  const nodes=new Map();let raf,last=0,drawClock=0,stopped=false;
  function actor(key,person,role,label,carrying=false) {
    const seated=role==='guest'&&isSeated(person),kind=role+(role==='guest'?' '+person.state:'')+(seated?' seated':'');
    let el=nodes.get(key);
    if(!el){el=document.createElement('div');el.className='service-actor '+kind;el.innerHTML='<div class="actor-art"></div><span class="actor-label"></span><b class="carried-dish">🍲</b>';actors.append(el);nodes.set(key,el);}
    el.className='service-actor '+kind;
    el.style.left=person.x+'%';el.style.top=person.y+'%';el.style.zIndex=String(Math.round(person.y*2));
    const frame=restaurantFrame(person,role,model.time),art=el.querySelector('.actor-art'),guest=role==='guest';
    art.style.backgroundPosition=`${frame*100/(guest?5:4)}% ${(guest?person.look:person.id)*100/(guest?7:5)}%`;
    art.style.transform=`scaleX(${person.face||1})`;
    el.querySelector('.actor-label').textContent=label;el.querySelector('.carried-dish').hidden=!carrying;
    el.title=label;el.setAttribute('aria-label',label);el.dataset.state=kind;el.dataset.frame=String(frame);el.dataset.look=String(guest?person.look:person.id);el.dataset.role=role;
  }
  function render(){
    const live=new Set();
    model.chefs.forEach(c=>{let key='c'+c.id;live.add(key);actor(key,c,'chef',names[c.id]+(c.job?' · 做菜':' · 待单'));});
    model.waiters.forEach(w=>{let key='w'+w.id;live.add(key);actor(key,w,'waiter',w.phase==='delivery'?'送餐':w.phase==='pickup'?'取餐':names[w.id],w.phase==='delivery');});
    model.customers.forEach(g=>{let key='g'+g.id;live.add(key);actor(key,g,'guest',g.race+' · '+labels[g.state]);});
    for(const [key,node] of nodes)if(!live.has(key)){node.remove();nodes.delete(key);}
    [...tables.children].forEach((el,i)=>{let seated=model.seats.filter(s=>s.table===i&&s.guest);el.querySelector('b').textContent=seated.some(s=>s.guest.state==='eating')?'🍲':'';el.classList.toggle('occupied',seated.length>0);});
    root.querySelector('.ready-count').textContent=model.ready.length;
    root.querySelector('.service-status').textContent=`座位 ${model.seats.filter(s=>s.guest).length}/${model.seats.length} · 排队 ${model.queue.length} · 已接待 ${model.completed}`;
  }
  function tick(t){if(stopped||!root.isConnected)return;const dt=last?Math.min(.1,(t-last)/1000):0;last=t;if(!document.hidden){model.step(dt);drawClock+=dt;if(drawClock>=1/24){render();drawClock%=1/24;}}raf=requestAnimationFrame(tick);}
  render();raf=requestAnimationFrame(tick);
  return {model,stop(){stopped=true;cancelAnimationFrame(raf);}};
}

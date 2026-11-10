// Lightweight, bounded visual service simulation. Currency remains server-authoritative.
export class Restaurant {
  constructor(state) {
    this.time=0;this.nextArrival=0;this.serial=0;this.completed=0;
    this.customers=[];this.queue=[];this.orders=[];this.ready=[];
    this.configure(state);
  }
  configure(state) {
    this.level=state.level;
    this.tables=Array.from({length:Math.min(8,state.level+1)},(_,i)=>({x:37+(i%4)*16,y:51+Math.floor(i/4)*25}));
    this.seats=this.tables.flatMap((t,i)=>[-1,1].map(side=>({x:t.x+side*5,y:t.y+3,table:i,guest:null})));
    this.chefs=state.assigned.filter(i=>[0,1,4].includes(i)).map((id,i)=>({id,x:36+i*20,y:29,job:null,timer:0,speed:1+.12*(state.staff[id]-1)}));
    this.waiters=state.assigned.filter(i=>[2,3,5].includes(i)).map((id,i)=>({id,x:30+i*6,y:35,job:null,phase:'idle',speed:12*(1+.12*(state.staff[id]-1)),path:[]}));
  }
  arrival() {
    if(this.queue.length>=6)return;
    const g={id:++this.serial,art:[0,1,4,5,6,7,2,3][this.serial%8],x:6,y:94,state:'queue',seat:null,timer:0,path:[]};
    this.customers.push(g);this.queue.push(g);
  }
  move(actor,dt,speed) {
    const p=actor.path[0];if(!p)return true;
    const dx=p.x-actor.x,dy=p.y-actor.y,d=Math.hypot(dx,dy);
    if(d<=speed*dt){actor.x=p.x;actor.y=p.y;actor.path.shift();}else{actor.x+=dx/d*speed*dt;actor.y+=dy/d*speed*dt;}
    return actor.path.length===0;
  }
  step(dt) {
    this.time+=dt;this.nextArrival-=dt;
    if(this.nextArrival<=0){this.arrival();this.nextArrival=Math.max(1.8,3.5-this.level*.12);}
    // A chair is reserved before walking to it: two guests can never claim one seat.
    for(const seat of this.seats)if(!seat.guest&&this.queue.length){
      const g=this.queue.shift();seat.guest=g;g.seat=seat;g.state='walking';
      g.path=[{x:23,y:g.y},{x:23,y:seat.y+8},{x:seat.x,y:seat.y+8},{x:seat.x,y:seat.y}];
    }
    this.queue.forEach((g,i)=>{g.path=[{x:12,y:48+i*7}];this.move(g,dt,16);});
    for(const g of this.customers){
      if(g.state==='walking'&&this.move(g,dt,18)){g.state='ordered';this.orders.push(g);}
      if(g.state==='eating'){g.timer-=dt;if(g.timer<=0){g.state='leaving';g.path=[{x:g.x,y:g.y+8},{x:23,y:g.y+8},{x:23,y:94},{x:5,y:94}];}}
      if(g.state==='leaving'&&this.move(g,dt,17)){g.state='gone';g.seat.guest=null;this.completed++;}
    }
    this.customers=this.customers.filter(g=>g.state!=='gone');
    for(const chef of this.chefs){
      if(!chef.job&&this.orders.length){chef.job=this.orders.shift();chef.job.state='cooking';chef.timer=7/chef.speed;}
      if(chef.job){chef.timer-=dt;if(chef.timer<=0){chef.job.state='ready';this.ready.push(chef.job);chef.job=null;}}
    }
    for(const w of this.waiters){
      if(!w.job&&this.ready.length){w.job=this.ready.shift();w.phase='pickup';w.path=[{x:w.x,y:35},{x:70,y:35}];}
      if(w.phase==='pickup'&&this.move(w,dt,w.speed)){w.phase='delivery';w.job.state='delivery';w.path=[{x:26,y:35},{x:26,y:w.job.seat.y-10},{x:w.job.seat.x,y:w.job.seat.y-10}];}
      else if(w.phase==='delivery'&&this.move(w,dt,w.speed)){w.job.state='eating';w.job.timer=10;w.job=null;w.phase='return';w.path=[{x:26,y:w.y},{x:26,y:35},{x:70,y:35}];}
      else if(w.phase==='return'&&this.move(w,dt,w.speed))w.phase='idle';
    }
  }
}

const artIndex=[4,5,6,7,6,3];
const names=['岩炉','绯菈','伊岚','糖铃','青禾','赤影'];
const labels={queue:'等位',walking:'入座',ordered:'等餐',cooking:'烹饪中',ready:'待送餐',delivery:'送餐中',eating:'用餐',leaving:'离店'};
export function mountRestaurant(root,state,existing) {
  const signature=JSON.stringify([state.level,state.assigned,state.staff]);
  const model=existing?.signature===signature?existing:new Restaurant(state);model.signature=signature;
  root.innerHTML=`<div class="service-zone kitchen-zone"><span>固定厨房 · 烹饪区</span></div><div class="pass-counter">取餐台 <b class="ready-count">0</b></div><div class="queue-zone">等候区</div><div class="entrance">入口 / 出口</div><div class="dining-tables"></div><div class="restaurant-actors"></div><div class="service-status" role="status"></div>`;
  const tables=root.querySelector('.dining-tables'),actors=root.querySelector('.restaurant-actors');
  model.tables.forEach((t,i)=>{const el=document.createElement('div');el.className='dining-table';el.style.left=t.x+'%';el.style.top=t.y+'%';el.innerHTML=`<i class="chair left"></i><i class="chair right"></i><span>${i+1}</span><b></b>`;tables.append(el);});
  const nodes=new Map();let raf,last=0,drawClock=0,stopped=false;
  function actor(key,art,x,y,label,kind,carrying=false) {
    let el=nodes.get(key);
    if(!el){el=document.createElement('div');el.className='service-actor '+kind;el.innerHTML='<div class="actor-art"></div><span class="actor-label"></span><b class="carried-dish">🍲</b>';actors.append(el);nodes.set(key,el);}
    el.className='service-actor '+kind;
    el.style.left=x+'%';el.style.top=y+'%';el.style.zIndex=String(Math.round(y*2));
    el.querySelector('.actor-art').style.backgroundPosition=`${art%4*100/3}% ${art<4?0:100}%`;
    el.querySelector('.actor-label').textContent=label;el.querySelector('.carried-dish').hidden=!carrying;
    el.dataset.state=kind;
  }
  function render(){
    const live=new Set();
    model.chefs.forEach(c=>{let key='c'+c.id;live.add(key);actor(key,artIndex[c.id],c.x,c.y,names[c.id]+(c.job?' · 做菜':' · 待单'),'chef',!!c.job);});
    model.waiters.forEach(w=>{let key='w'+w.id;live.add(key);actor(key,artIndex[w.id],w.x,w.y,w.phase==='delivery'?'送餐':w.phase==='pickup'?'取餐':names[w.id],'waiter',w.phase==='delivery');});
    model.customers.forEach(g=>{let key='g'+g.id;live.add(key);actor(key,g.art,g.x,g.y,labels[g.state],'guest '+(['ordered','cooking','ready','delivery','eating'].includes(g.state)?'seated ':'')+g.state);});
    for(const [key,node] of nodes)if(!live.has(key)){node.remove();nodes.delete(key);}
    [...tables.children].forEach((el,i)=>{let seated=model.seats.filter(s=>s.table===i&&s.guest);el.querySelector('b').textContent=seated.some(s=>s.guest.state==='eating')?'🍲':'';el.classList.toggle('occupied',seated.length>0);});
    root.querySelector('.ready-count').textContent=model.ready.length;
    root.querySelector('.service-status').textContent=`座位 ${model.seats.filter(s=>s.guest).length}/${model.seats.length} · 排队 ${model.queue.length} · 已接待 ${model.completed}`;
  }
  function tick(t){if(stopped||!root.isConnected)return;const dt=last?Math.min(.1,(t-last)/1000):0;last=t;if(!document.hidden){model.step(dt);drawClock+=dt;if(drawClock>=1/24){render();drawClock=0;}}raf=requestAnimationFrame(tick);}
  render();raf=requestAnimationFrame(tick);
  return {model,stop(){stopped=true;cancelAnimationFrame(raf);}};
}

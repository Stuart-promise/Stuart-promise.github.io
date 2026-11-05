"use strict";

class AnimalDrop {
  static radii=[16,22,28,34,41,48,56,64,73,84,98];
  constructor() {
    this.engine=Matter.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});
    this.engine.gravity.y=1.15;
    const walls=[
      Matter.Bodies.rectangle(0,340,20,760,{isStatic:true}),
      Matter.Bodies.rectangle(440,340,20,760,{isStatic:true}),
      Matter.Bodies.rectangle(220,665,460,40,{isStatic:true})
    ];
    Matter.Composite.add(this.engine.world,walls);
    this.balls=[];this.contacts=[];this.time=0;this.readyAt=0;this.score=0;
    this.over=false;this.won=false;this.highest=0;
    this.current=this.randomLevel();this.next=this.randomLevel();
    Matter.Events.on(this.engine,"collisionStart collisionActive",event=>{
      for(const pair of event.pairs){
        const a=pair.bodyA,b=pair.bodyB;
        if(a.petLevel!==undefined && a.petLevel===b.petLevel && a.petLevel<10)this.contacts.push([a,b]);
      }
    });
  }
  randomLevel(){return Math.floor(Math.random()*4);}
  addBall(level,x,y) {
    const radius=AnimalDrop.radii[level];
    const body=Matter.Bodies.circle(Math.max(radius+12,Math.min(428-radius,x)),Math.min(644-radius,y),radius,{
      restitution:.22,friction:.35,frictionStatic:.5,frictionAir:.012,density:.002,slop:.02
    },32);
    body.petLevel=level;body.born=this.time;body.dangerSince=null;
    Matter.Composite.add(this.engine.world,body);
    this.balls.push(body);
    this.highest=Math.max(this.highest,level);
    return body;
  }
  get canDrop(){return !this.over && this.time>=this.readyAt;}
  drop(x) {
    if(!this.canDrop||!Number.isFinite(x))return false;
    this.addBall(this.current,x,58);
    this.current=this.next;this.next=this.randomLevel();
    this.readyAt=this.time+650;
    return true;
  }
  step(delta=1000/60) {
    if(this.over)return;
    this.time+=delta;
    this.contacts=[];
    Matter.Engine.update(this.engine,delta);
    const used=new Set();
    for(const [a,b] of this.contacts){
      if(used.has(a.id)||used.has(b.id)||!this.balls.includes(a)||!this.balls.includes(b))continue;
      used.add(a.id);used.add(b.id);
      const level=a.petLevel+1,x=(a.position.x+b.position.x)/2,y=(a.position.y+b.position.y)/2;
      Matter.Composite.remove(this.engine.world,[a,b]);
      this.balls=this.balls.filter(ball=>ball!==a && ball!==b);
      const merged=this.addBall(level,x,y);
      Matter.Body.setVelocity(merged,{x:(a.velocity.x+b.velocity.x)/2,y:Math.max(-2,(a.velocity.y+b.velocity.y)/2)});
      this.score+=2**(level+1);this.highest=Math.max(this.highest,level);
      if(level===10)this.won=true;
    }
    for(const ball of this.balls){
      const above=ball.position.y-AnimalDrop.radii[ball.petLevel]<120 && this.time-ball.born>2000;
      if(above){
        if(ball.dangerSince===null)ball.dangerSince=this.time;
        if(this.time-ball.dangerSince>=1800)this.over=true;
      }else ball.dangerSince=null;
    }
  }
  get warning(){return this.balls.some(ball=>ball.dangerSince!==null);}
  destroy(){Matter.Events.off(this.engine);Matter.Composite.clear(this.engine.world,false);Matter.Engine.clear(this.engine);}
}

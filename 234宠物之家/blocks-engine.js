"use strict";

class FallingBlocks {
  static shapes={
    I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    J:[[1,0,0],[1,1,1],[0,0,0]],
    L:[[0,0,1],[1,1,1],[0,0,0]],
    O:[[1,1],[1,1]],
    S:[[0,1,1],[1,1,0],[0,0,0]],
    T:[[0,1,0],[1,1,1],[0,0,0]],
    Z:[[1,1,0],[0,1,1],[0,0,0]]
  };
  constructor(){
    this.board=Array.from({length:22},()=>Array(10).fill(null));
    this.queue=[];this.score=0;this.lines=0;this.status="ready";
    this.held=null;this.holdUsed=false;this.gravity=0;this.lockTime=0;this.lockResets=0;
    this.message="点击开始，用方向键或下方按钮移动方块。";
    this.fillQueue();this.spawn();
  }
  fillQueue(){
    if(this.queue.length>=5)return;
    const bag=Object.keys(FallingBlocks.shapes);
    for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
    this.queue.push(...bag);
  }
  spawn(type){
    if(!type){type=this.queue.shift();this.fillQueue();}
    const matrix=FallingBlocks.shapes[type].map(row=>row.slice());
    this.piece={type,matrix,x:Math.floor((10-matrix.length)/2),y:1};
    this.gravity=0;this.lockTime=0;this.lockResets=0;
    if(this.collides(this.piece))this.finish();
  }
  get level(){return 1+Math.floor(this.lines/10);}
  get interval(){return Math.max(65,850*Math.pow(.82,this.level-1));}
  collides(piece){
    return piece.matrix.some((row,r)=>row.some((value,c)=>{
      if(!value)return false;
      const x=piece.x+c,y=piece.y+r;
      return x<0||x>=10||y<0||y>=22||this.board[y][x]!==null;
    }));
  }
  get grounded(){return this.collides({...this.piece,y:this.piece.y+1});}
  move(dx,dy=0){
    if(this.status!=="playing")return false;
    const next={...this.piece,x:this.piece.x+dx,y:this.piece.y+dy};
    if(this.collides(next))return false;
    const onGround=this.grounded;
    this.piece=next;
    if(onGround&&this.lockResets<15){this.lockTime=0;this.lockResets++;}
    if(dy>0)this.lockTime=0;
    return true;
  }
  rotate(clockwise=true){
    if(this.status!=="playing"||this.piece.type==="O")return false;
    const old=this.piece.matrix,n=old.length;
    const matrix=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>clockwise?old[n-1-c][r]:old[c][n-1-r]));
    const onGround=this.grounded;
    for(const [dx,dy] of [[0,0],[-1,0],[1,0],[-2,0],[2,0],[0,-1],[-1,-1],[1,-1],[0,-2]]){
      const next={...this.piece,matrix,x:this.piece.x+dx,y:this.piece.y+dy};
      if(this.collides(next))continue;
      this.piece=next;
      if(onGround&&this.lockResets<15){this.lockTime=0;this.lockResets++;}
      return true;
    }
    return false;
  }
  softDrop(){
    if(this.move(0,1)){this.score++;this.gravity=0;return true;}
    return false;
  }
  hardDrop(){
    if(this.status!=="playing")return false;
    let distance=0;
    while(!this.collides({...this.piece,y:this.piece.y+1})){this.piece.y++;distance++;}
    this.score+=distance*2;this.lock();
    return true;
  }
  hold(){
    if(this.status!=="playing"||this.holdUsed)return false;
    const type=this.piece.type,previous=this.held;
    this.held=type;this.spawn(previous);this.holdUsed=true;
    return true;
  }
  lock(){
    if(this.status!=="playing")return;
    const {matrix,x,y,type}=this.piece;
    matrix.forEach((row,r)=>row.forEach((value,c)=>{if(value)this.board[y+r][x+c]=type;}));
    const remaining=this.board.filter(row=>row.some(cell=>cell===null));
    const cleared=22-remaining.length;
    while(remaining.length<22)remaining.unshift(Array(10).fill(null));
    this.board=remaining;
    const points=[0,100,300,500,800][cleared]*this.level;
    this.score+=points;this.lines+=cleared;
    this.message=cleared?"消除 "+cleared+" 行，获得 "+points+" 分！":"继续堆叠，填满一行即可消除。";
    this.holdUsed=false;
    if(this.board.slice(0,2).some(row=>row.some(Boolean)))this.finish();
    else this.spawn();
  }
  finish(){this.status="over";this.message="方块已堆到顶部，本局结束。";}
  tick(delta){
    if(this.status!=="playing")return;
    this.gravity+=delta;
    while(this.gravity>=this.interval){
      this.gravity-=this.interval;
      if(!this.move(0,1))break;
    }
    if(this.grounded){
      this.lockTime+=delta;
      if(this.lockTime>=500)this.lock();
    }else this.lockTime=0;
  }
  ghost(){
    const piece={...this.piece};
    while(!this.collides({...piece,y:piece.y+1}))piece.y++;
    return piece;
  }
}

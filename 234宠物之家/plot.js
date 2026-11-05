"use strict";
const $ = id => document.getElementById(id);
const colors = ["#23644e","#b54a32","#514d9a","#ac650a","#2b6e9c","#934566"];
const presets = {
  explicit:[["正弦与余弦","sin(x)\ncos(x)"],["双曲线","1/x"],["根式","sqrt(x)"],["分段函数","x < 0 ? -x : x^2"],["特殊函数","gamma(x)\nerf(x)"],["复数的实部与虚部","re(exp(i*x))\nim(exp(i*x))"]],
  implicit:[["圆","x^2+y^2=9"],["双曲线","x^2-y^2=4"],["心形","(x^2+y^2-1)^3=x^2*y^3"]],
  param:[["椭圆","3*cos(t); 2*sin(t)"],["利萨如曲线","3*sin(3*t); 3*sin(2*t)"],["摆线","t-sin(t); 1-cos(t)"]],
  polar:[["玫瑰线","4*cos(3*theta)"],["心形线","2*(1-cos(theta))"],["螺线","theta/2"]],
  sequence:[["交错数列","(-1)^n"],["平方数","n^2"],["阶乘","n!"]],
  surface:[["波纹曲面","cos(sqrt(x^2+y^2))"],["马鞍面","x^2-y^2"],["半球","sqrt(16-x^2-y^2)"]]
};
const hints = {
  explicit:"使用 x，每行一条函数，最多六条。",
  implicit:"例如 x^2+y^2=9，也可直接输入等于零的表达式。",
  param:"使用 t，每行写 x(t); y(t)，例如 cos(t); sin(t)。",
  polar:"使用 theta 或 θ，每行输入一个半径表达式。",
  sequence:"使用整数 n，按实际取值绘点，每行一条数列。",
  surface:"使用 x 和 y，输入一个高度公式。拖动图形可以旋转。"
};
const defaults = {explicit:"sin(x)",implicit:"x^2+y^2=9",param:"3*cos(t); 2*sin(t)",polar:"4*cos(3*theta)",surface:"cos(sqrt(x^2+y^2))",sequence:"(-1)^n"};
let active = "explicit", worker, timer, result, requestId=0, drag;
const drafts = new Map();
function message(text,error=false){
  $("status").textContent=text;
  $("status").classList.toggle("error",error);
}
function updateMode() {
  drafts.set(active,$("formula").value);
  active=$("mode").value;
  $("formula").value=drafts.get(active) ?? defaults[active];
  $("param-fields").hidden=!(active==="param" || active==="polar");
  $("angle-field").hidden=active!=="surface";
  $("view-title").textContent=active==="surface"?"曲面视图":"坐标平面";
  $("hint").textContent=hints[active];
  const select=$("presets");
  select.replaceChildren(new Option("选择示例…",""));
  presets[active].forEach(([name],i)=>select.add(new Option(name,i)));
  draw();
}
function node(name,attrs,text){
  const el=document.createElementNS("http://www.w3.org/2000/svg",name);
  for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);
  if(text!==undefined)el.textContent=text;
  return el;
}
function grid(svg,box){
  const [xmin,xmax,ymin,ymax]=box;
  const px=x=>600*(x-xmin)/(xmax-xmin),py=y=>600*(ymax-y)/(ymax-ymin);
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const tx=clamp(px(0)+4,4,550),ty=clamp(py(0)+16,16,595);
  function ticks(low,high) {
    const unit=(high-low)/8;
    const scale=10**Math.floor(Math.log10(unit));
    const step=([1,2,5,10].find(num=>num>=unit/scale)??10)*scale;
    const start=Math.ceil(low/step);
    return Array.from({length:14},(_,i)=>(start+i)*step).filter(x=>x>=low && x<=high);
  }
  const label=(x,y,text,anchor="start")=>svg.append(node("text",{x,y,fill:"#637568","font-size":13,"text-anchor":anchor},text));
  const line=(x1,y1,x2,y2,axis)=>svg.append(node("line",{x1,y1,x2,y2,stroke:axis?"#687e6d":"#dfe5db","stroke-width":axis?1.6:1}));
  ticks(xmin,xmax).forEach(x=>{line(px(x),0,px(x),600,x===0);if(x!==0 && px(x)>15 && px(x)<575)label(px(x),ty,Number(x.toPrecision(5)),"middle");});
  ticks(ymin,ymax).forEach(y=>{line(0,py(y),600,py(y),y===0);if(y!==0 && py(y)>23 && py(y)<591)label(tx,py(y)-3,Number(y.toPrecision(5)));});
  if(xmin<=0 && xmax>=0 && ymin<=0 && ymax>=0)label(tx,ty,"0");
  label(584,clamp(ty-22,16,593),"x");
  label(clamp(tx+3,4,584),15,"y");
}
function orientation(svg){
  const a=Number($("angle").value)*Math.PI/180;
  for(const [letter,dx,dy] of [["x",38*Math.cos(a),18*Math.sin(a)],["y",-38*Math.sin(a),18*Math.cos(a)],["z",0,-42]]){
    svg.append(node("line",{x1:60,y1:558,x2:60+dx,y2:558+dy,stroke:"#698071"}));
    svg.append(node("text",{x:60+dx+2,y:558+dy-2,fill:"#475d4f","font-size":14},letter));
  }
}
function show(data){
  const svg=$("graph");
  svg.replaceChildren();
  $("legend").replaceChildren();
  if(data.error){result=null;message(data.error,true);return;}
  result=data;
  if(active==="surface")orientation(svg);else grid(svg,data.box);
  let visible=0;
  const notes=[];
  data.graphs.forEach(({path,points,whole,note},i)=>{
    const color=colors[i];
    if(whole){
      svg.append(node("rect",{width:600,height:600,fill:color,opacity:0.16}));
      notes.push("当前网格的所有采样点均满足此方程。");
    }
    if(path)svg.append(node("path",{d:path,fill:"none",stroke:color,"stroke-width":active==="surface"?1.1:2.4,"stroke-linecap":"round","stroke-linejoin":"round"}));
    for(const [cx,cy] of points)svg.append(node("circle",{cx,cy,r:3.5,fill:color}));
    const item=document.createElement("li");
    item.style.borderColor=color;
    item.textContent=data.lines[i]+(!path && !points.length && !whole?" · 视野内未采到图形":"");
    $("legend").append(item);
    if(path||points.length||whole)visible++;
    if(note)notes.push(note);
  });
  if(!visible)message("当前范围未采到可见的实数图形。请检查定义域或调整范围。");
  else message(notes.join(" ") || "已绘制。拖动可平移，使用 ＋ / − 调整视野。");
}
function draw(){
  const id=++requestId;
  clearTimeout(timer);
  if(worker){worker.terminate();worker=null;}
  if(active==="surface" && $("formula").value.split("\n").filter(s=>s.trim()).length!==1){
    show({error:"曲面视图每次绘制一个高度公式。"});return;
  }
  message("正在绘制…");
  const current=new Worker("./plot-worker.js?v=1");
  worker=current;
  function finish(data){
    if(id!==requestId)return;
    clearTimeout(timer);current.terminate();worker=null;
    show(data);
  }
  current.onmessage=event=>finish(event.data);
  current.onerror=()=>finish({error:"绘图组件加载失败，请刷新后重试。"});
  timer=setTimeout(()=>finish({error:"绘制超时，请简化表达式或缩小范围。"}),15000);
  current.postMessage({mode:active,formulas:$("formula").value,definitions:$("defs").value,
    interval:[$("pmin").value,$("pmax").value],bounds:["xmin","xmax","ymin","ymax"].map(k=>$(k).value),angle:Number($("angle").value)});
}
function setBox(box){
  ["xmin","xmax","ymin","ymax"].forEach((k,i)=>$(k).value=String(Number(box[i].toPrecision(12))));
  draw();
}
function zoom(factor){
  if(!result)return;
  const [x0,x1,y0,y1]=result.box;
  const dx=(x1-x0)*(factor-1)/2,dy=(y1-y0)*(factor-1)/2;
  setBox([x0-dx,x1+dx,y0-dy,y1+dy]);
}
$("controls").onsubmit=event=>{event.preventDefault();draw();};
$("mode").onchange=updateMode;
$("presets").onchange=()=>{
  if($("presets").value==="")return;
  $("formula").value=presets[active][Number($("presets").value)][1];
  draw();
};
$("formula").oninput=()=>$("presets").value="";
$("angle").onchange=draw;
$("zoom-in").onclick=()=>zoom(0.65);
$("zoom-out").onclick=()=>zoom(1.5);
$("reset").onclick=()=>{$("angle").value=35;setBox([-6,6,-6,6]);};
const graph=$("graph");
graph.onpointerdown=e=>{
  if(!result || e.button!==0)return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,box:result.box,angle:Number($("angle").value)};
  graph.setPointerCapture(e.pointerId);
};
graph.onpointercancel=()=>drag=null;
graph.onpointerup=e=>{
  if(!drag || e.pointerId!==drag.id)return;
  const state=drag;drag=null;
  const dx=e.clientX-state.x,dy=e.clientY-state.y;
  if(Math.hypot(dx,dy)<3)return;
  if(active==="surface"){
    $("angle").value=((state.angle+dx+540)%360)-180;
    draw();return;
  }
  const [x0,x1,y0,y1]=state.box;
  const sx=dx/graph.clientWidth*(x1-x0),sy=dy/graph.clientHeight*(y1-y0);
  setBox([x0-sx,x1-sx,y0+sy,y1+sy]);
};
updateMode();

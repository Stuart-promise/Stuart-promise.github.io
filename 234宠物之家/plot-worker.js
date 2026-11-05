"use strict";
importScripts("./vendor/mathjs/math.js");

const names = new Set(("abs sign floor ceil round fix mod min max hypot sqrt cbrt nthRoot exp expm1 log log1p log2 log10 pow " +
  "sin cos tan sec csc cot asin acos atan atan2 asec acsc acot sinh cosh tanh sech csch coth asinh acosh atanh asech acsch acoth " +
  "gamma lgamma erf factorial combinations permutations gcd lcm re im arg conj complex").split(" ").filter(name => typeof math[name] === "function"));
const constants = new Set(["pi","e","i","tau","phi","Infinity","NaN","true","false"]);
const aliases = new Map([["ln",math.log],["sinc",x=>x===0?1:Math.sin(x)/x]]);
const nodeTypes = new Set(["ConstantNode","ParenthesisNode","OperatorNode","SymbolNode","FunctionNode","ConditionalNode","RelationalNode"]);
const size = 600;

function normalize(text) {
  return text.trim().replace(/π/g,"pi").replace(/θ/g,"theta").replace(/−/g,"-")
    .replace(/×/g,"*").replace(/÷/g,"/").replace(/≤/g,"<=").replace(/≥/g,">=").replace(/²/g,"^2").replace(/³/g,"^3");
}
function compile(text, variables, functions) {
  if (!text || text.length > 600) throw Error("每条表达式需要 1 至 600 个字符。");
  const ast = math.parse(text);
  ast.traverse((node, path, parent) => {
    if (!nodeTypes.has(node.type)) throw Error("不支持这种语法：" + node.type);
    if (node.isConstantNode && typeof node.value !== "number") throw Error("只能使用数值常量。");
    if (node.isFunctionNode && !functions.has(node.name)) throw Error("不支持函数 " + node.name + "，可以在「自定义」中给出它的公式。");
    if (node.isSymbolNode && !(parent?.isFunctionNode && path === "fn") && !variables.has(node.name) && !constants.has(node.name)) {
      throw Error("未定义变量 " + node.name + "。请检查当前模式的变量或添加自定义参数。");
    }
  });
  return ast.compile();
}
function environment(source) {
  const functions = new Set([...names,...aliases.keys()]);
  const scope = new Map(aliases);
  const variables = new Set();
  for (const raw of source.split("\n").filter(s=>s.trim())) {
    const line = normalize(raw);
    const m = /^([A-Za-z]\w*)(?:\(([^()]*)\))?\s*=(?!=)(.+)$/.exec(line);
    if (!m) throw Error("自定义格式示例：a=2 或 f(u)=u^2。");
    const [,name,params,body] = m;
    if (functions.has(name) || variables.has(name) || constants.has(name) || ["x","y","t","theta"].includes(name)) throw Error("名称重复或已保留：" + name);
    const args = params === undefined ? [] : params.split(",").map(s=>s.trim());
    if (args.some(p=>!(/^[a-zA-Z]\w*$/.test(p))) || new Set(args).size!==args.length) throw Error("函数参数应为不同的变量名。");
    const compiled = compile(body,new Set([...variables,...args]),functions);
    if (params === undefined) {
      const value = compiled.evaluate(scope);
      if (typeof value !== "number" || !Number.isFinite(value)) throw Error("自定义常量须为有限实数：" + name);
      scope.set(name,value);
      variables.add(name);
    } else {
      const outer = new Map(scope);
      scope.set(name,(...values)=>{
        if (values.length!==args.length) throw Error(name+" 需要 "+args.length+" 个参数。");
        const local = new Map(outer);
        args.forEach((p,i)=>local.set(p,values[i]));
        return compiled.evaluate(local);
      });
      functions.add(name);
    }
  }
  return {scope,functions,variables};
}
function real(value) {
  if (typeof value==="number") return Number.isFinite(value) ? value : NaN;
  return value?.isComplex && value.im===0 && Number.isFinite(value.re) ? value.re : NaN;
}
function rangeValue(text, env) {
  const n=real(compile(normalize(text),env.variables,env.functions).evaluate(env.scope));
  if (!Number.isFinite(n)) throw Error("范围端点必须是有限实数。");
  return n;
}
function compilePlot(text, mode, env) {
  let parts;
  const params = {explicit:["x"],implicit:["x","y"],param:["t"],polar:["theta"],surface:["x","y"],sequence:["n"]}[mode];
  const strip = (s,re)=>s.trim().replace(re,"").trim();
  if (mode==="implicit") {
    const eq = text.split(/(?<![<>=!])=(?!=)/);
    if (eq.length>2 || eq.some(p=>!p.trim())) throw Error("隐式方程示例：x^2+y^2=9。");
    parts=[eq.length===2 ? "("+eq[0]+")-("+eq[1]+")" : eq[0]];
  } else if (mode==="param") {
    parts=text.split(";");
    if (parts.length!==2) throw Error("参数曲线请用分号分开 x(t) 和 y(t) 两个表达式。");
    parts=[strip(parts[0],/^x\s*=/),strip(parts[1],/^y\s*=/)];
  } else {
    const prefix={explicit:/^y\s*=/,polar:/^r\s*=/,surface:/^z\s*=/,sequence:/^a\(n\)\s*=/}[mode];
    parts=[strip(text,prefix)];
  }
  return parts.map(p=>{
    const expression=compile(p,new Set([...env.variables,...params]),env.functions);
    const scope=new Map(env.scope);
    let succeeded=false, evaluationError="";
    const sample=(...values)=>{
      params.forEach((k,i)=>scope.set(k,values[i]));
      try {
        const value=real(expression.evaluate(scope));
        succeeded=true;
        return value;
      } catch(error) {
        evaluationError=error.message;
        return NaN;
      }
    };
    sample.error=()=>succeeded ? "" : evaluationError;
    return sample;
  });
}
// Clip each line to the viewport before converting it to an SVG path.
function pathBuilder() {
  const pieces=[];
  let last="";
  function line(a,b) {
    if (![...a,...b].every(Number.isFinite)) return;
    const dx=b[0]-a[0],dy=b[1]-a[1];
    let low=0,high=1;
    for(const [p,q] of [[-dx,a[0]],[dx,size-a[0]],[-dy,a[1]],[dy,size-a[1]]]){
      if(p===0){if(q<0)return;continue;}
      if(p<0)low=Math.max(low,q/p);else high=Math.min(high,q/p);
      if(low>high)return;
    }
    const point=t=>(a[0]+dx*t).toFixed(2)+","+(a[1]+dy*t).toFixed(2);
    const start=point(low),end=point(high);
    if(start!==last)pieces.push("M"+start);
    pieces.push("L"+end);
    last=end;
  }
  return {line,finish:()=>pieces.join("")};
}
function curve(point, start, end, path) {
  // Refine curved intervals and stop drawing across poles or jumps.
  function segment(t0,p0,t1,p1,depth) {
    const tm=(t0+t1)/2, mid=point(tm);
    const finite=p=>Number.isFinite(p[0]) && Number.isFinite(p[1]);
    if(!finite(p0) && !finite(mid) && !finite(p1))return;
    const error=Math.hypot(mid[0]-(p0[0]+p1[0])/2,mid[1]-(p0[1]+p1[1])/2);
    if(error<=0.55){path.line(p0,p1);return;}
    if(depth>=6)return;
    segment(t0,p0,tm,mid,depth+1);
    segment(tm,mid,t1,p1,depth+1);
  }
  let t=start,p=point(t);
  for(let i=1;i<=480;i++){
    const next=start+(end-start)*i/480, q=point(next);
    segment(t,p,next,q,0); t=next;p=q;
  }
}
function contour(f,box,path) {
  const n=112, step=size/n;
  const [x0,x1,y0,y1]=box;
  const value=([u,v])=>f(x0+u*(x1-x0)/size,y1-v*(y1-y0)/size);
  const grid=Array.from({length:n+1},(_,j)=>Array.from({length:n+1},(_,i)=>value([i*step,j*step])));
  if(grid.every(row=>row.every(v=>v===0)))return "whole";
  function crossing(a,b,fa,fb){
    const scale=Math.min(Math.abs(fa),Math.abs(fb));
    for(let k=0;k<13;k++){
      const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],fm=value(m);
      if(!Number.isFinite(fm))return null;
      if(fm===0 || Math.abs(fm)<scale*0.001)return m;
      if((fm>0)===(fa>0)){a=m;fa=fm;}else{b=m;fb=fm;}
    }
    // A sign change at a pole or a finite jump is not a zero.
    if(Math.min(Math.abs(fa),Math.abs(fb))>=scale)return null;
    return Math.abs(fa)<Math.abs(fb)?a:b;
  }
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const x=i*step,y=j*step;
    const pts=[[x,y],[x+step,y],[x+step,y+step],[x,y+step]];
    const vals=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]];
    if(!vals.every(Number.isFinite))continue;
    const hits=[];
    for(let k=0;k<4;k++){
      const h=(k+1)%4,a=vals[k],b=vals[h];
      if(a===0 && b===0){path.line(pts[k],pts[h]);continue;}
      if((a>=0)===(b>=0))continue;
      const hit=a===0?pts[k]:b===0?pts[h]:crossing(pts[k],pts[h],a,b);
      if(hit)hits.push(hit);
    }
    if(hits.length===2)path.line(hits[0],hits[1]);
    if(hits.length===4){
      if((value([x+step/2,y+step/2])>=0)!==(vals[0]>=0))hits.push(hits.shift());
      path.line(hits[0],hits[1]);path.line(hits[2],hits[3]);
    }
  }
}
function surface(f,box,path,angle){
  const n=36,[xmin,xmax,ymin,ymax]=box;
  const rows=Array.from({length:n+1},(_,j)=>Array.from({length:n+1},(_,i)=>{
    const x=i/n,y=j/n;
    return f(xmin+x*(xmax-xmin),ymin+y*(ymax-ymin));
  }));
  const values=rows.flat().filter(Number.isFinite);
  if(!values.length)return "";
  const zmin=Math.min(...values),zmax=Math.max(...values);
  const a=angle*Math.PI/180;
  function project(i,j,z){
    const x=2*i/n-1,y=2*j/n-1;
    const height=zmax===zmin ? 0 : (z-zmin)/(zmax-zmin)-0.5;
    return [300+170*(x*Math.cos(a)-y*Math.sin(a)),300+78*(x*Math.sin(a)+y*Math.cos(a))-250*height];
  }
  for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
    const z=rows[j][i];
    if(!Number.isFinite(z))continue;
    const p=project(i,j,z);
    if(i<n)path.line(p,project(i+1,j,rows[j][i+1]));
    if(j<n)path.line(p,project(i,j+1,rows[j+1][i]));
  }
  return "曲面采样高度 z ∈ ["+Number(zmin.toPrecision(5))+", "+Number(zmax.toPrecision(5))+"]";
}

self.onmessage=({data})=>{
  try {
    const {mode,formulas,definitions,angle}=data;
    const env=environment(definitions);
    const box=data.bounds.map(s=>rangeValue(s,env));
    if(!(box[0]<box[1] && box[2]<box[3]) || !Number.isFinite(box[1]-box[0]+(box[3]-box[2])))throw Error("每条坐标轴的上限必须大于下限，且范围有限。");
    const lines=formulas.split("\n").map(normalize).filter(Boolean);
    if(!lines.length || lines.length>6)throw Error("请输入 1 至 6 行公式，每行绘制一条图形。");
    const paramRange=["param","polar"].includes(mode)?data.interval.map(s=>rangeValue(s,env)):null;
    if(paramRange && !(paramRange[0]<paramRange[1]))throw Error("参数上限必须大于下限。");
    const [x0,x1,y0,y1]=box;
    const project=(x,y)=>[size*(x-x0)/(x1-x0),size*(y1-y)/(y1-y0)];
    const graphs=lines.map((line,index)=>{
      try {
        const [f,g]=compilePlot(line,mode,env);
        const path=pathBuilder();
        let note="",whole=false;
        const points=[];
        if(mode==="implicit")whole=contour(f,box,path)==="whole";
        else if(mode==="sequence"){
          const first=Math.ceil(x0),last=Math.floor(x1);
          if(last-first>3000 || !Number.isSafeInteger(first) || !Number.isSafeInteger(last))throw Error("请缩小 x 范围，以便逐个绘制整数点（最多 3001 点）。");
          for(let n=first;n<=last;n++){
            const y=f(n);
            if(y>=y0 && y<=y1)points.push(project(n,y));
          }
        }
        else if(mode==="surface")note=surface(f,box,path,angle);
        else {
          const point=mode==="explicit"?x=>project(x,f(x)):
            mode==="param"?t=>project(f(t),g(t)):t=>{const r=f(t);return project(r*Math.cos(t),r*Math.sin(t));};
          curve(point,...(paramRange||[x0,x1]),path);
        }
        const error=f.error() || g?.error();
        if(error)throw Error(error);
        return {path:path.finish(),points,whole,note};
      } catch(error){throw Error("第 "+(index+1)+" 行："+error.message);}
    });
    self.postMessage({graphs,box,lines});
  } catch(error){self.postMessage({error:error.message});}
};

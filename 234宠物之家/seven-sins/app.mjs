import {VERSION,DIMENSIONS,QUESTIONS,OPTIONS,scoreAnswers,validateProgress} from './model.mjs?v=1';

const $=id=>document.getElementById(id);
const byId=new Map(DIMENSIONS.map(d=>[d.id,d]));
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const namespace='pet234:seven-sins:v'+VERSION+':';
const accountScope=()=>String(window.PetAccount?.session?.user?.id||'guest');
let scope=accountScope(),answers={},index=0,view='welcome',result=null,storageAvailable=true,exporting=false;
const notice=message=>{$('notice').textContent=message;};
const el=(tag,className,content)=>{const node=document.createElement(tag);if(className)node.className=className;if(content!==undefined)node.textContent=content;return node;};
const count=()=>Object.keys(answers).length;
function save(){
  try{localStorage.setItem(namespace+scope,JSON.stringify({version:VERSION,answers,index}));storageAvailable=true;}
  catch{storageAvailable=false;notice('浏览器暂时无法保存进度，你仍可继续答题；关闭页面后这次进度可能丢失。');}
}
function restore(){
  answers={};index=0;result=null;
  try{
    const text=localStorage.getItem(namespace+scope);
    if(text){const saved=validateProgress(JSON.parse(text));if(saved){answers=saved.answers;index=saved.index;}else notice('旧答题记录无法读取，请开始一次新的测试。');}
  }catch{storageAvailable=false;notice('本机进度暂时无法读取，可以直接开始测试。');}
}
function checkScope(){
  const next=accountScope();
  if(next===scope)return true;
  scope=next;hideFallback();restore();show('welcome');notice('账号状态已变化，已切换到对应的本机答题记录。');return false;
}
function focusOn(id){requestAnimationFrame(()=>{const node=$(id);if(!node)return;node.focus({preventScroll:true});if(id==='question-text'&&view==='quiz')node.scrollIntoView({block:'nearest',behavior:'instant'});});}
function show(next){
  view=next;
  $('welcome').hidden=next!=='welcome';$('quiz').hidden=next!=='quiz';$('result-section').hidden=next!=='result';
  if(next==='welcome')renderWelcome();
  if(next==='quiz'){renderQuestion();focusOn('question-text');}
  if(next==='result'){renderResult();$('result-title').tabIndex=-1;focusOn('result-title');}
  window.scrollTo({top:0,behavior:'instant'});
}
function renderWelcome(){
  const total=count();
  $('start-test').hidden=total>0;
  $('continue-test').hidden=!total;$('clear-progress').hidden=!total;
  $('continue-test').textContent=total===QUESTIONS.length?'查看上次结果 ↗':'继续测试 · 已答 '+total+' / '+QUESTIONS.length;
  $('saved-progress').textContent=total?(storageAvailable?'本机已保存':'本次已作答')+' '+total+' / '+QUESTIONS.length+' 题。'+(total===QUESTIONS.length?'也可以回看并修改答案。':'随时回来，接着了解自己。'):'答案仅保存在当前浏览器，不上传到服务器。';
}
function renderProgress(){
  const total=count();
  $('question-number').textContent=String(index+1).padStart(2,'0')+' / '+QUESTIONS.length;
  $('answered-count').textContent='已答 '+total+' / '+QUESTIONS.length;
  $('progress-fill').style.width=total/QUESTIONS.length*100+'%';
  $('previous-question').disabled=index===0;
  $('next-question').hidden=index===QUESTIONS.length-1;
  $('next-question').disabled=!own(answers,QUESTIONS[index].id);
  $('show-result').hidden=index!==QUESTIONS.length-1&&total!==QUESTIONS.length;
  $('show-result').disabled=total!==QUESTIONS.length;
  $('show-result').textContent=total===QUESTIONS.length?'展开我的七面图谱 ↗':'完成全部题目后查看结果';
  $('question-nav').replaceChildren(...QUESTIONS.map((question,i)=>{
    const button=el('button','question-dot'+(own(answers,question.id)?' answered':'')+(i===index?' current':''),i+1);
    button.type='button';button.setAttribute('aria-label','第 '+(i+1)+' 题，'+(own(answers,question.id)?'已回答':'未回答'));
    if(i===index)button.setAttribute('aria-current','step');
    button.onclick=()=>{if(!checkScope())return;index=i;save();renderQuestion();focusOn('question-text');};
    return button;
  }));
}
function renderQuestion(){
  const question=QUESTIONS[index];
  $('question-text').textContent=question.text;
  $('answer-options').replaceChildren(...OPTIONS.map(option=>{
    const label=el('label','answer-option'+(answers[question.id]===option.value?' selected':''));
    const input=document.createElement('input');input.type='radio';input.name='answer';input.value=option.value;
    input.checked=own(answers,question.id)&&answers[question.id]===option.value;
    const mark=el('span','option-mark');mark.setAttribute('aria-hidden','true');
    const copy=el('span','option-copy',option.label);
    input.onchange=()=>{
      if(!checkScope())return;
      answers[question.id]=option.value;result=null;save();
      for(const item of $('answer-options').children)item.classList.toggle('selected',item.querySelector('input').checked);
      renderProgress();
    };
    label.append(input,mark,copy);return label;
  }));
  renderProgress();
}

function svgNode(tag,attributes={},text){
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  if(text!==undefined)node.textContent=text;
  return node;
}
function renderRadar(){
  const svg=$('radar-svg'),cx=200,cy=185,r=121;
  const point=(i,size)=>{const angle=-Math.PI/2+i*2*Math.PI/7;return [cx+Math.cos(angle)*size,cy+Math.sin(angle)*size];};
  const polygon=size=>DIMENSIONS.map((_,i)=>point(i,size).join(',')).join(' ');
  svg.replaceChildren(svgNode('title',{},'本次七宗罪倾向图谱'),svgNode('desc',{},result.scores.map(s=>s.name+' '+s.score+' / 100').join('，')));
  svg.setAttribute('role','img');
  for(let n=1;n<=5;n++)svg.append(svgNode('polygon',{points:polygon(r*n/5),fill:'none',stroke:'#a79cae','stroke-opacity':.18,'stroke-width':1}));
  DIMENSIONS.forEach((dimension,i)=>{
    const [x,y]=point(i,r),[lx,ly]=point(i,r+30);
    svg.append(svgNode('line',{x1:cx,y1:cy,x2:x,y2:y,stroke:'#a79cae','stroke-opacity':.18}));
    svg.append(svgNode('text',{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'middle',fill:dimension.color,'font-size':14,'font-family':'system-ui,sans-serif'},dimension.name));
  });
  for(const n of [20,60,100])svg.append(svgNode('text',{x:cx+7,y:cy-r*n/100+4,fill:'#b3a9bd','font-size':10},n));
  svg.append(svgNode('polygon',{points:result.scores.map((s,i)=>point(i,r*s.score/100).join(',')).join(' '),fill:'#b39bd5','fill-opacity':.24,stroke:'#d2b9ef','stroke-width':2.5,'stroke-linejoin':'round'}));
  result.scores.forEach((s,i)=>{const [x,y]=point(i,r*s.score/100);svg.append(svgNode('circle',{cx:x,cy:y,r:4,fill:byId.get(s.id).color,stroke:'#231b30','stroke-width':1.5}));});
}
function resultHeading(){
  const names=result.leaders.map(id=>byId.get(id).name);
  if(result.balanced)return {badge:'七项同分',title:'这一次，七面同频',subtitle:'七项均为 '+result.scores[0].score+' / 100',summary:'这组回答没有出现单一突出项。同分只表示本次计分一致，不代表七项都很低，也不意味着某种固定人格。你可以回看每一面的具体情境。'};
  if(names.length>1)return {badge:'并列倾向',title:names.join(' · '),subtitle:names.length+' 项并列最高',summary:'这些方面在本次回答中得分相同，我们保留全部并列结果。它们是此刻值得留意的反应线索，可以结合下面的具体题意理解。'};
  const leading=byId.get(result.leaders[0]);
  return {badge:'本次较突出的一面',title:leading.name,subtitle:leading.en+' · '+leading.tagline,summary:'在你近一个月的自我描述里，这一组情境相对更符合你的感受。'+(result.spread<=13?'七项差距不大，其他得分相近的方面也值得一起看。':'它只是本次回答中相对突出的一项，不会概括完整的你。')};
}
function renderResult(){
  hideFallback();
  result=scoreAnswers(answers);
  const heading=resultHeading();
  $('dominant-badge').textContent=heading.badge;$('result-title').textContent=heading.title;
  $('result-subtitle').textContent=heading.subtitle;$('result-summary').textContent=heading.summary;
  renderRadar();
  const ranked=[...result.scores].sort((a,b)=>b.raw-a.raw);
  $('score-list').replaceChildren(...ranked.map(score=>{
    const d=byId.get(score.id),row=el('div','score-row');row.style.setProperty('--accent',d.color);
    const label=el('span','score-label',d.name),value=el('span','score-value',score.score+' / 100');
    const track=el('div','score-track'),fill=el('div','score-fill');fill.style.width=score.score+'%';track.append(fill);
    row.append(label,value,track);return row;
  }));
  $('insight-list').replaceChildren(...ranked.map(score=>{
    const d=byId.get(score.id),card=el('article','insight-card');card.style.setProperty('--accent',d.color);
    const header=el('div','insight-card-heading');header.append(el('h3','insight-title',d.name+' / '+d.en),el('span','insight-score',score.score+' / 100'));
    const reflection=el('p','reflection','可以想一想：'+d.reflection),action=el('p','action','小小尝试：'+d.action);
    card.append(header,el('p','',d.description),reflection,action);return card;
  }));
}
function shareText(){
  const heading=resultHeading();
  return ['我的七宗罪倾向图谱',heading.badge+'：'+heading.title,...result.scores.map(s=>s.name+' '+s.score+'/100'),'28道原创情境题 · 趣味自我观察，非诊断或人群排名',new URL('./',location.href).href].join('\n');
}
function showCopyFallback(value){
  let box=$('share-fallback');
  if(!box){box=el('textarea','share-fallback');box.id='share-fallback';box.readOnly=true;box.setAttribute('aria-label','可复制的测试结果');$('copy-result').parentElement.after(box);}
  box.hidden=false;box.value=value;box.focus();box.select();notice('自动复制不可用，可以长按或选中这段结果进行复制。');
}
function hideFallback(){const box=$('share-fallback');if(box){box.hidden=true;box.value='';}}
async function copyResult(){
  if(!checkScope()||!result)return;
  const current=scope,value=shareText();
  try{await navigator.clipboard.writeText(value);if(scope===current){hideFallback();notice('结果已复制，你可以自行发给好友。');}}
  catch{if(scope===current)showCopyFallback(value);}
}
async function downloadResult(){
  if(!checkScope()||!result||exporting)return;
  exporting=true;$('download-result').disabled=true;
  const current=scope,heading=resultHeading(),snapshot=result;
  try{
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1460;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('canvas unavailable');
    ctx.fillStyle='#17131f';ctx.fillRect(0,0,1080,1460);
    const glow=ctx.createRadialGradient(890,80,0,890,80,620);glow.addColorStop(0,'#46334f');glow.addColorStop(1,'#17131f');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,680);
    ctx.strokeStyle='#5d4b65';ctx.lineWidth=2;ctx.strokeRect(36,36,1008,1388);
    ctx.textAlign='left';ctx.fillStyle='#c7b28d';ctx.font='24px system-ui,sans-serif';ctx.fillText('234 宠物之家  /  SEVEN SINS',86,104);
    ctx.fillStyle='#f3e9d7';ctx.font='bold 58px system-ui,sans-serif';ctx.fillText('我的七面倾向图谱',86,200);
    ctx.fillStyle='#b8a3c9';ctx.font='26px system-ui,sans-serif';ctx.fillText(heading.badge,86,266);
    ctx.fillStyle='#efdcad';ctx.font='bold '+(heading.title.length>12?32:44)+'px system-ui,sans-serif';ctx.fillText(heading.title,86,330,900);
    const cx=540,cy=600,r=180,pt=(i,size)=>{const a=-Math.PI/2+i*2*Math.PI/7;return [cx+Math.cos(a)*size,cy+Math.sin(a)*size];};
    const poly=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();};
    ctx.lineWidth=1.5;ctx.strokeStyle='#504459';
    for(let n=1;n<=5;n++){poly(DIMENSIONS.map((_,i)=>pt(i,r*n/5)));ctx.stroke();}
    ctx.font='24px system-ui,sans-serif';ctx.textAlign='center';
    DIMENSIONS.forEach((d,i)=>{const [x,y]=pt(i,r+36);ctx.fillStyle=d.color;ctx.fillText(d.name,x,y+8);});
    poly(snapshot.scores.map((s,i)=>pt(i,r*s.score/100)));ctx.fillStyle='#b39bd544';ctx.fill();ctx.strokeStyle='#ceb4ee';ctx.lineWidth=3;ctx.stroke();
    ctx.textAlign='left';snapshot.scores.forEach((s,i)=>{
      const y=875+i*54,d=byId.get(s.id);ctx.fillStyle=d.color;ctx.font='26px system-ui,sans-serif';ctx.fillText(s.name,86,y);
      ctx.fillStyle='#332b3c';ctx.fillRect(204,y-20,620,14);ctx.fillStyle=d.color;ctx.fillRect(204,y-20,620*s.score/100,14);
      ctx.fillStyle='#eee3d4';ctx.font='24px system-ui,sans-serif';ctx.fillText(s.score+' / 100',865,y);
    });
    ctx.fillStyle='#bcafc5';ctx.font='23px system-ui,sans-serif';ctx.fillText('28 道原创情境题 · 近一个月的自我描述',86,1310);
    ctx.font='20px system-ui,sans-serif';ctx.fillText('趣味自我观察，非心理诊断。分数不代表人群排名。',86,1354);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw Error('image unavailable');
    if(scope!==current)return;
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='我的七宗罪倾向图谱.png';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),60000);notice('结果图已生成。若手机在新页面显示图片，可以长按保存。');
  }catch{notice('这个浏览器暂时无法导出图片，可以使用「复制结果」或截图保存。');}
  finally{exporting=false;$('download-result').disabled=false;}
}
function reset(){
  if(!checkScope())return;
  if(count()&&!window.confirm('重新测试会清除当前浏览器中这一次的答案。确定重新开始吗？'))return;
  answers={};index=0;result=null;hideFallback();notice('');save();show('quiz');
}
$('start-test').onclick=()=>{if(checkScope()){notice('');show('quiz');}};
$('continue-test').onclick=()=>{if(checkScope()){notice('');show(count()===QUESTIONS.length?'result':'quiz');}};
$('clear-progress').onclick=reset;$('retake-test').onclick=reset;
$('previous-question').onclick=()=>{if(checkScope()&&index>0){index--;save();renderQuestion();focusOn('question-text');}};
$('next-question').onclick=()=>{if(checkScope()&&own(answers,QUESTIONS[index].id)&&index<QUESTIONS.length-1){index++;save();renderQuestion();focusOn('question-text');}};
$('back-intro').onclick=()=>{if(checkScope())show('welcome');};
$('show-result').onclick=()=>{if(!checkScope())return;try{scoreAnswers(answers);notice('');show('result');}catch(error){notice(error.message);}};
$('review-answers').onclick=()=>{if(checkScope()){index=0;hideFallback();notice('');save();show('quiz');}};
$('copy-result').onclick=copyResult;$('download-result').onclick=downloadResult;
const sources=[
  ['蝴蝶测试 · 七项日常情境与完整结果展示','https://www.butterflytest.com/personality/seven-deadly-sins-test'],
  ['Psychology.com · 七项倾向与反思建议的组织方式','https://psychology.com/tests/seven-deadly-sins'],
  ['FermatMind · 罪与美德测试的透明计分、并列结果展示','https://fermatmind.com/zh/tests/explore/seven-sins-virtues-test']
];
$('source-links').replaceChildren(...sources.map(([title,href])=>{const item=el('li'),link=el('a','',title);link.href=href;link.target='_blank';link.rel='noopener noreferrer';item.append(link);return item;}));
window.addEventListener('pet-account-session',checkScope);
window.addEventListener('pageshow',event=>{if(event.persisted)checkScope();});
window.PetAccount?.ready.then(checkScope).catch(()=>{});
restore();renderWelcome();

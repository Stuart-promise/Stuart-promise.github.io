import {INTERVALS,dayKey,dayNumber,afterDays,parseRecord,dayStats,dailyTarget,scheduled,normalizeAnswer,makeSession,streak} from './vocabulary-core.mjs?v=hundred1';
const $=id=>document.getElementById(id),book=new URLSearchParams(location.search).get('book')==='cet6'?'cet6':'cet4';
const title=book==='cet6'?'大学六级':'大学四级',prefix=`pet234:vocab:v1:${book}:`;
const store=await PetAccount.open('vocab-'+book),records=new Map(),favorites=new Set();
let rows=[],byWord=new Map(),examples={},plan=null,session=null,sessionRaw=null,busy=false,screen='dashboard',filter='all',listLimit=40,nowDay='',roundSummary='';
let snapshot=null;
const refreshSnapshot=()=>{snapshot=PetAccount.session?{...PetAccount.read('vocab-'+book).data}:null;};
const get=k=>snapshot?snapshot[prefix+k]??null:store.getItem(prefix+k);
const put=(k,v)=>{const raw=typeof v==='string'?v:JSON.stringify(v);store.setItem(prefix+k,raw);if(snapshot)snapshot[prefix+k]=raw;};
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)??fallback;}catch{return fallback;}};
const sayWarning=e=>{$('warning').textContent=e?.message||String(e);};
function load(){
 refreshSnapshot();
 records.clear();favorites.clear();for(const [word]of rows){const r=parseRecord(get('word:'+word));if(r)records.set(word,r);if(get('favorite:'+word)==='true')favorites.add(word);}
 plan=parse(get('hundred-plan'));if(!plan||!Number.isFinite(dayNumber(plan.start||'')))plan=null;
 sessionRaw=get('session-v2');const saved=parse(sessionRaw);
 session=saved?.v===2&&Array.isArray(saved.items)&&saved.items.length<=20&&saved.items.length>0&&saved.items.every(i=>byWord.has(i.word))&&Array.isArray(saved.queue)&&Array.isArray(saved.done)&&['recall','spell'].includes(saved.phase)?saved:null;
 const size=Number(get('batch-size'));$('batch-size').value=[5,10,20].includes(size)?size:10;
 $('accent').value=get('accent')==='en-GB'?'en-GB':'en-US';
}
function saveSession(){put('session-v2',session);sessionRaw=get('session-v2');}
function daily(stats=dayStats(rows,records)){
 const today=dayKey(),key='day:'+today;let d=parse(get(key));
 if(!d||!Number.isFinite(d.target)){d={target:dailyTarget(stats,plan),complete:false};if(plan)put(key,d);}
 return d;
}
function renderDashboard(){
 const now=new Date(),today=dayKey(now),stats=dayStats(rows,records,now),d=daily(stats);
 if(plan&&!d.complete&&stats.learned>=d.target&&stats.due.length===0&&stats.learned+stats.reviewed>0){d.complete=true;put('day:'+today,d);}
 const completed=[];
 if(plan){for(let i=0;i<=Math.min(3650,dayNumber(today)-dayNumber(plan.start));i++){const date=new Date(afterDays(new Date(...plan.start.split('-').map((n,j)=>Number(n)-(j===1?1:0))),i));const key=dayKey(date);if(parse(get('day:'+key))?.complete)completed.push(key);}}
 const elapsed=plan?Math.max(1,dayNumber(today)-dayNumber(plan.start)+1):0;
 $('plan-label').textContent=plan?`${title} · 第 ${elapsed} 天${elapsed>100?' / 持续巩固':''}`:'给自己一百天';
 $('journey-title').textContent=d.complete?'今天的计划，完成了。':plan?'每天一点，把单词留住。':'从今天的第一组开始。';
 $('book-summary').textContent=`${title} · ${rows.length.toLocaleString('zh-CN')} 词 · ${plan?'今日':'预计每日'} ${d.target} 个新词`;
 $('check-count').replaceChildren(document.createTextNode(String(completed.length)),Object.assign(document.createElement('span'),{textContent:' / 100'}));
 $('streak').textContent=`连续完成 ${streak(completed,today)} 天`;
 $('due').textContent=stats.due.length;$('remaining').textContent=Math.min(stats.fresh.length,Math.max(0,d.target-stats.learned));$('finished').textContent=stats.completed;
 $('date').textContent=now.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
 $('daily-note').textContent=d.complete?'今日已打卡。想再练一会儿，可以打开薄弱词或生词本。':`新词 ${stats.learned} / ${d.target} · 已复习 ${stats.reviewed} 词。${stats.due.length?'先处理到期复习，再学新词。':'每组拼写完成后记录进度。'}`;
 $('start').disabled=false;$('start').textContent=session?'继续未完成的小组':plan?(stats.due.length||stats.learned<d.target?'开始今日学习':'今日计划已完成'):'开始我的 100 天';
 if(plan&&!session&&!stats.due.length&&stats.learned>=d.target)$('start').disabled=true;
 $('review-only').disabled=!!session||!stats.due.length;$('weak').disabled=!!session||!stats.weak.length;
 $('book-title').textContent=title;$('progress').textContent=`已学 ${records.size} / ${rows.length} 词 · 生词本 ${favorites.size} 词`;
 $('book-progress').max=rows.length;$('book-progress').value=records.size;
 const cells=[];for(let i=0;i<100;i++){const cell=document.createElement('span');cell.textContent=i+1;const start=plan?new Date(...plan.start.split('-').map((n,j)=>Number(n)-(j===1?1:0))):now;const key=dayKey(new Date(afterDays(start,i)));cell.title=`第 ${i+1} 天${plan?' · '+key:''}`;
  if(plan&&completed.includes(key)){cell.classList.add('checked');cell.title+=' · 已完成';}if(plan&&i===elapsed-1)cell.classList.add('current');cells.push(cell);}$('calendar').replaceChildren(...cells);
 $('week').replaceChildren(...Array.from({length:7},(_,i)=>{const date=new Date(afterDays(now,i+1)),start=+date,end=afterDays(date,1),cell=document.createElement('span'),count=document.createElement('b');cell.textContent=date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});count.textContent=[...records.values()].filter(r=>r.due>=start&&r.due<end).length;cell.append(count);return cell;}));
 nowDay=today;
}
function speak(text){
 if(!('speechSynthesis'in window)){sayWarning('这个浏览器暂不支持朗读，可以根据音标练习。');return;}
 const voices=speechSynthesis.getVoices(),lang=$('accent').value,voice=voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>/^en[-_]/i.test(v.lang));
 if(voices.length&&!voice){sayWarning('设备没有可用的英语语音，请在系统语音设置中添加英语语音包。');return;}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.85;if(voice)u.voice=voice;u.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))sayWarning('朗读暂时不可用，请检查设备英语语音设置。');};speechSynthesis.speak(u);
}
function context(word,target){
 target.replaceChildren();const example=examples[word.toLowerCase()];
 if(!example){target.append(Object.assign(document.createElement('p'),{textContent:'这个词暂未收录例句。先掌握释义和拼写，也可以把它加入生词本。'}));return;}
 const en=document.createElement('p');en.className='english';en.lang='en';
 const parts=example.en.split(new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b)`,'gi'));
 for(const part of parts)en.append(part.toLowerCase()===word.toLowerCase()?Object.assign(document.createElement('mark'),{textContent:part}):document.createTextNode(part));
 const zh=Object.assign(document.createElement('p'),{textContent:example.zh}),play=Object.assign(document.createElement('button'),{type:'button',textContent:'♪ 读例句'});play.onclick=()=>speak(example.en);
 const credit=document.createElement('p');credit.className='credit';credit.append('Tatoeba · ');
 for(const [id,author]of [[example.enId,example.enAuthor],[example.zhId,example.zhAuthor]]){const link=document.createElement('a');link.href='https://tatoeba.org/en/sentences/show/'+id;link.target='_blank';link.rel='noopener';link.textContent=author;credit.append(link,' / ');}
 const license=document.createElement('a');license.href='https://creativecommons.org/licenses/by/2.0/fr/';license.textContent='CC BY 2.0 FR';license.target='_blank';license.rel='noopener';credit.append(license);
 target.append(en,zh,play,credit);
}
function currentItem(){return session?.phase==='recall'?session.items[session.index]:session?.items.find(i=>i.word===session.queue[0]);}
function renderPractice(){
 if(!session){show('dashboard');return;}
 const item=currentItem();if(!item){finishRound();return;}const [word,phonetic,meaning]=byWord.get(item.word),spell=session.phase==='spell',feedback=session.feedback;
 $('phase-label').textContent=spell?`02 / 拼写巩固 · 已通过 ${session.done.length} / ${session.items.length}`:`01 / 回忆与理解 · ${session.index+1} / ${session.items.length}`;
 $('round-progress').max=session.items.length*2;$('round-progress').value=spell?session.items.length+session.done.length:session.index;
 $('kind').textContent=item.kind+(item.misses?' · 再练一次':'');$('favorite').textContent=favorites.has(word)?'★ 已加入生词本':'☆ 加入生词本';$('favorite').setAttribute('aria-pressed',String(favorites.has(word)));
 $('word').textContent=spell?(feedback?word:'拼出这个词'):word;$('phonetic').textContent=!spell&&phonetic?'/'+phonetic+'/':'';
 $('meaning').textContent=(spell||session.revealed)?meaning:'';$('meaning').hidden=!spell&&!session.revealed;
 $('cue').textContent=spell?'回忆英文拼写；答错的词会在本组再次出现。':session.revealed?'核对词义，听一听，也在例句里理解它。':'先想中文意思，再诚实选择自己的熟悉程度。';
 $('recall-actions').hidden=spell||session.revealed;$('spell-form').hidden=!spell||!!feedback;
 $('context').hidden=spell?!feedback:!session.revealed;if(!$('context').hidden)context(word,$('context'));else $('context').replaceChildren();
 $('next').hidden=spell?!feedback:!session.revealed;$('next').textContent=spell?(feedback?.correct?'下一个':'记住了，再练一次'):session.index===session.items.length-1?'开始本组拼写':'下一个词';
 $('feedback').textContent=feedback?(feedback.correct?`拼写正确 · ${INTERVALS[records.get(word)?.stage||0]} 天后复习`:`还差一点，正确拼写是 ${word}。看一遍，再不看答案拼一次。`):'';
 $('spelling').value='';if(spell&&!feedback)$('spelling').focus({preventScroll:true});
}
function show(next){screen=next;$('dashboard').hidden=next!=='dashboard';$('practice').hidden=next!=='practice';$('round-done').hidden=next!=='done';renderDashboard();if(next==='practice')renderPractice();}
async function act(fn){
 if(busy||!rows.length)return;busy=true;document.querySelector('main').setAttribute('aria-busy','true');
 try{await PetAccount.locked('vocab-ui-'+book,()=>{
  PetAccount.assertOwner();refreshSnapshot();if(get('session-v2')!==sessionRaw){load();show(session?'practice':'dashboard');sayWarning('已读取另一个页面的最新学习进度，请继续。');return;}
  // A changed word record may also come from the earlier version of this page.
  for(const [word]of rows){const r=parseRecord(get('word:'+word));if(r)records.set(word,r);else records.delete(word);}
  fn();
 });}catch(e){sayWarning(e);try{load();show(session?'practice':'dashboard');}catch{}}finally{busy=false;document.querySelector('main').setAttribute('aria-busy','false');}
}
function begin(mode='mixed'){
 if(session){show('practice');return;}
 if(!plan){plan={start:dayKey(),v:1};put('hundred-plan',plan);}
 const stats=dayStats(rows,records),d=daily(stats);session=makeSession(rows,records,stats,d.target,Number($('batch-size').value),mode,[...favorites]);
 if(!session){sayWarning(mode==='weak'?'暂时没有薄弱词。':'当前没有待学习的词。');show('dashboard');return;}
 saveSession();show('practice');$('practice').scrollIntoView({block:'start',behavior:'smooth'});
}
function finishRound(){
 const misses=session.items.filter(i=>i.misses>0).length;roundSummary=`${session.items.length} 个词都已完成拼写。${misses?`${misses} 个词经过重练，已安排短间隔复习。`:'继续按计划复习，记忆会更稳。'}`;
 session=null;saveSession();$('round-summary').textContent=roundSummary;show('done');
}
$('start').onclick=()=>act(()=>begin());$('review-only').onclick=()=>act(()=>begin('review'));$('weak').onclick=()=>act(()=>begin('weak'));
$('another').onclick=()=>act(()=>{show('dashboard');begin();});$('back-dashboard').onclick=()=>show('dashboard');$('pause').onclick=()=>{window.speechSynthesis?.cancel();show('dashboard');};
for(const button of document.querySelectorAll('[data-quality]'))button.onclick=()=>act(()=>{if(!session||session.phase!=='recall'||session.revealed)return;currentItem().quality=Number(button.dataset.quality);session.revealed=true;saveSession();renderPractice();});
$('next').onclick=()=>act(()=>{
 if(!session)return;
 if(session.phase==='recall'){if(!session.revealed)return;session.index++;session.revealed=false;if(session.index===session.items.length){session.phase='spell';session.index=0;}}
 else{if(!session.feedback)return;const word=session.queue.shift();if(!session.feedback.correct)session.queue.push(word);session.feedback=null;if(!session.queue.length){finishRound();return;}}
 saveSession();renderPractice();
});
$('spell-form').onsubmit=e=>{e.preventDefault();const answer=$('spelling').value;act(()=>{
 if(!session||session.phase!=='spell'||session.feedback)return;if(!answer.trim()){sayWarning('先输入你的拼写，再检验答案。');return;}
 const item=currentItem(),correct=normalizeAnswer(answer)===normalizeAnswer(item.word);session.feedback={correct};
 if(correct){const next=scheduled(records.get(item.word),item.quality,item.word,session.id);put('word:'+item.word,next);records.set(item.word,next);if(!session.done.includes(item.word))session.done.push(item.word);}
 else{item.quality=0;item.misses++;}saveSession();renderDashboard();renderPractice();
});};
$('hint').onclick=()=>act(()=>{const item=currentItem();if(!item||session.phase!=='spell')return;item.quality=Math.min(1,item.quality);saveSession();$('feedback').textContent=`首字母 ${item.word[0]} · 共 ${item.word.length} 个字符（含空格和连字符）`;$('spelling').focus();});
$('speak').onclick=()=>{const item=currentItem();if(item)speak(item.word);};
function toggleFavorite(word){const selected=!favorites.has(word);put('favorite:'+word,String(selected));selected?favorites.add(word):favorites.delete(word);$('practice-favorites').disabled=!!session||!favorites.size;}
$('favorite').onclick=()=>act(()=>{const word=currentItem()?.word;if(!word)return;toggleFavorite(word);$('favorite').textContent=favorites.has(word)?'★ 已加入生词本':'☆ 加入生词本';$('favorite').setAttribute('aria-pressed',String(favorites.has(word)));});
$('batch-size').onchange=()=>act(()=>put('batch-size',$('batch-size').value));$('accent').onchange=()=>act(()=>put('accent',$('accent').value));
function renderList(){
 $('practice-favorites').disabled=!!session||!favorites.size;
 const weakWords=new Set(dayStats(rows,records).weak.map(r=>r[0]));
 const q=$('search').value.trim().toLowerCase();const found=rows.filter(r=>(!q||r[0].toLowerCase().includes(q)||r[2].includes(q))&&(filter!=='favorites'||favorites.has(r[0]))&&(filter!=='weak'||weakWords.has(r[0])));
 $('list-count').textContent=`找到 ${found.length} 个词${found.length>listLimit?' · 先显示 '+listLimit+' 个':''}`;$('more').hidden=found.length<=listLimit;
 $('word-list').replaceChildren(...found.slice(0,listLimit).map(([word,phonetic,meaning])=>{
  const row=document.createElement('details');row.className='word-row';const summary=document.createElement('summary'),strong=Object.assign(document.createElement('strong'),{textContent:word}),small=Object.assign(document.createElement('small'),{textContent:favorites.has(word)?'★ 生词本':records.has(word)?'已学':'未学'});summary.append(strong,small);
  const def=Object.assign(document.createElement('p'),{textContent:(phonetic?'/'+phonetic+'/\n':'')+meaning}),tools=document.createElement('div');tools.className='row-tools';
  const save=Object.assign(document.createElement('button'),{type:'button',textContent:favorites.has(word)?'移出生词本':'加入生词本'});save.onclick=()=>act(()=>{toggleFavorite(word);save.textContent=favorites.has(word)?'移出生词本':'加入生词本';small.textContent=favorites.has(word)?'★ 生词本':records.has(word)?'已学':'未学';renderDashboard();});
  const audio=Object.assign(document.createElement('button'),{type:'button',textContent:'♪ 朗读'});audio.onclick=()=>speak(word);tools.append(audio,save);
  const block=document.createElement('div');block.className='context';row.addEventListener('toggle',()=>{if(row.open&&!block.childNodes.length)context(word,block);});row.append(summary,def,tools,block);return row;
 }));
}
$('browse').onclick=()=>{if(!rows.length)return;renderList();$('word-dialog').showModal();$('search').focus();};$('close-dialog').onclick=()=>$('word-dialog').close();$('search').oninput=()=>{listLimit=40;renderList();};$('more').onclick=()=>{listLimit+=40;renderList();};
$('practice-favorites').onclick=()=>act(()=>{$('word-dialog').close();begin('favorites');});
for(const button of document.querySelectorAll('[data-filter]'))button.onclick=()=>{filter=button.dataset.filter;listLimit=40;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderList();};
function externalUpdate(){try{const old=sessionRaw;load();renderDashboard();if(old!==sessionRaw&&screen==='practice')show(session?'practice':'dashboard');if($('word-dialog').open)renderList();}catch(e){sayWarning(e);}}
window.addEventListener('pet-account-data',externalUpdate);window.addEventListener('storage',e=>{if(!e.key||e.key.startsWith(prefix))externalUpdate();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&rows.length){externalUpdate();renderDashboard();}else window.speechSynthesis?.cancel();});
setInterval(()=>{if(rows.length&&!document.hidden){try{renderDashboard();}catch(e){sayWarning(e);}}},60000);
document.querySelector(`[data-book="${book}"]`).setAttribute('aria-current','page');
try{
 const response=await fetch(`./${book}.json?v=1`);if(!response.ok)throw Error('词书加载失败，请检查网络后刷新。');rows=await response.json();byWord=new Map(rows.map(r=>[r[0],r]));
 load();show('dashboard');
 fetch('./vocabulary-examples.json?v=hundred1').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{examples=data;if(screen==='practice'&&!$('context').hidden)context(currentItem().word,$('context'));}).catch(()=>sayWarning('例句暂未加载成功；释义、拼写和进度保存仍可使用。刷新后可重试。'));
}catch(e){sayWarning(e);$('book-summary').textContent='词书暂时不可用';$('start').textContent='请刷新重试';}

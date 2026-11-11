import {playAudio,stopAudio,audioReady} from './vocabulary-audio.mjs?v=modules2';
import {INTERVALS,dayKey,dayNumber,afterDays,parseRecord,dayStats,dailyTarget,scheduled,normalizeAnswer,makeSession,streak,makeModuleSession,meaningChoices,completeRecall} from './vocabulary-core.mjs?v=modules2';
const $=id=>document.getElementById(id),book=new URLSearchParams(location.search).get('book')==='cet6'?'cet6':'cet4';
const title=book==='cet6'?'大学六级':'大学四级',prefix=`pet234:vocab:v1:${book}:`;
const store=await PetAccount.open('vocab-'+book),records=new Map(),favorites=new Set();
let rows=[],byWord=new Map(),examples={},plan=null,session=null,sessionRaw=null,busy=false,screen='dashboard',filter='all',listLimit=40,nowDay='',roundSummary='';
let snapshot=null, sessionKey='session-v3:new', lastMode='new';
const refreshSnapshot=()=>{snapshot=PetAccount.session?{...PetAccount.read('vocab-'+book).data}:null;};
const get=k=>snapshot?snapshot[prefix+k]??null:store.getItem(prefix+k);
const put=(k,v)=>{const raw=typeof v==='string'?v:JSON.stringify(v);store.setItem(prefix+k,raw);if(snapshot)snapshot[prefix+k]=raw;};
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)??fallback;}catch{return fallback;}};
const sayWarning=e=>{$('warning').textContent=e?.message||String(e);};
function load(){
 refreshSnapshot();
 records.clear();favorites.clear();for(const [word]of rows){const r=parseRecord(get('word:'+word));if(r)records.set(word,r);if(get('favorite:'+word)==='true')favorites.add(word);}
 plan=parse(get('hundred-plan'));if(!plan||!Number.isFinite(dayNumber(plan.start||'')))plan=null;
 sessionRaw=get(sessionKey);const saved=parse(sessionRaw);
 session=saved?.v===3&&Array.isArray(saved.items)&&saved.items.length>0&&saved.items.length<=20&&saved.items.every(i=>byWord.has(i.word))&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<saved.items.length&&['question','feedback','detail'].includes(saved.phase)?saved:saved?.v===2&&Array.isArray(saved.items)&&saved.items.length<=20&&saved.items.length>0&&saved.items.every(i=>byWord.has(i.word))&&Array.isArray(saved.queue)&&Array.isArray(saved.done)&&['recall','spell'].includes(saved.phase)?saved:null;
 const size=Number(get('batch-size'));$('batch-size').value=[5,10,20].includes(size)?size:10;
 $('accent').value='en-US';
}
function saveSession(){put(sessionKey,session);sessionRaw=get(sessionKey);}
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
 $('daily-note').textContent=d.complete?'今日已打卡。想再练一会儿，可以打开薄弱词或生词本。':`新词 ${stats.learned} / ${d.target} · 已复习 ${stats.reviewed} 词。${stats.due.length?'先处理到期复习，再学新词。':'新学与复习独立进行，核对讲解后记录进度。'}`;
 const pendingNew=parse(get('session-v3:new')),pendingReview=parse(get('session-v3:review'));
 $('start').disabled=!pendingNew&&(!stats.fresh.length||stats.learned>=d.target);$('start').textContent=pendingNew?'继续新学 →':'开始新学 →';
 $('review-only').disabled=!pendingReview&&!stats.due.length;$('review-only').textContent=pendingReview?'继续复习 →':'开始复习 →';
 $('weak').disabled=!stats.weak.length;$('legacy-resume').hidden=!parse(get('session-v2'));
 $('book-title').textContent=title;$('progress').textContent=`已学 ${records.size} / ${rows.length} 词 · 生词本 ${favorites.size} 词`;
 $('book-progress').max=rows.length;$('book-progress').value=records.size;
 const cells=[];for(let i=0;i<100;i++){const cell=document.createElement('span');cell.textContent=i+1;const start=plan?new Date(...plan.start.split('-').map((n,j)=>Number(n)-(j===1?1:0))):now;const key=dayKey(new Date(afterDays(start,i)));cell.title=`第 ${i+1} 天${plan?' · '+key:''}`;
  if(plan&&completed.includes(key)){cell.classList.add('checked');cell.title+=' · 已完成';}if(plan&&i===elapsed-1)cell.classList.add('current');cells.push(cell);}$('calendar').replaceChildren(...cells);
 $('week').replaceChildren(...Array.from({length:7},(_,i)=>{const date=new Date(afterDays(now,i+1)),start=+date,end=afterDays(date,1),cell=document.createElement('span'),count=document.createElement('b');cell.textContent=date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});count.textContent=[...records.values()].filter(r=>r.due>=start&&r.due<end).length;cell.append(count);return cell;}));
 nowDay=today;
}
function speak(text){playAudio(text,message=>{$('audio-status').textContent=message;if($('word-dialog').open)$('list-audio-status').textContent=message;});}
const families=[['space','spacious','spatial'],['strain','restrain','restraint'],['benefit','beneficial','beneficiary'],['act','action','active','activity','actor'],['create','creation','creative','creativity','creator'],['educate','education','educational','educator'],['inform','information','informative'],['decide','decision','decisive'],['develop','development','developer'],['differ','different','difference'],['protect','protection','protective'],['produce','product','production','productive'],['nation','national','international','nationality'],['nature','natural','naturally'],['science','scientific','scientist'],['succeed','success','successful','successfully'],['employ','employee','employer','employment','unemployment'],['care','careful','careless','carefully'],['comfort','comfortable','uncomfortable'],['economy','economic','economical','economist'],['depend','dependent','independent','independence'],['improve','improvement'],['agree','agreement','disagree','disagreement'],['organize','organization','organizational'],['communicate','communication'],['compete','competition','competitive','competitor'],['relate','relation','related','relationship'],['imagine','imagination','imaginative'],['strong','strength','strengthen'],['long','length','lengthen'],['deep','depth','deepen'],['wide','width','widen']];
function addFamily(word,target){
 const family=families.find(group=>group.includes(word.toLowerCase()))?.filter(w=>byWord.has(w));if(!family||family.length<2)return;
 const box=document.createElement('section');box.className='family';box.append(Object.assign(document.createElement('h3'),{textContent:'相关词形 · 当前词书'}));
 for(const w of family){const line=document.createElement('p'),strong=Object.assign(document.createElement('strong'),{textContent:w}),audio=Object.assign(document.createElement('button'),{type:'button',textContent:'♪',ariaLabel:'朗读 '+w});audio.onclick=()=>speak(w);line.append(audio,strong,document.createTextNode(byWord.get(w)[2]));box.append(line);}target.append(box);
}
function context(word,target){
 target.replaceChildren();const example=examples[word.toLowerCase()];
 if(!example){target.append(Object.assign(document.createElement('p'),{textContent:'这个词暂未收录例句。先掌握释义，也可以把它加入生词本。'}));addFamily(word,target);return;}
 const en=document.createElement('p');en.className='english';en.lang='en';
 const parts=example.en.split(new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b)`,'gi'));
 for(const part of parts)en.append(part.toLowerCase()===word.toLowerCase()?Object.assign(document.createElement('mark'),{textContent:part}):document.createTextNode(part));
 const zh=Object.assign(document.createElement('p'),{textContent:example.zh}),play=Object.assign(document.createElement('button'),{type:'button',textContent:'♪ 读例句'});play.onclick=()=>speak(example.en);
 const credit=document.createElement('p');credit.className='credit';credit.append('Tatoeba · ');
 for(const [id,author]of [[example.enId,example.enAuthor],[example.zhId,example.zhAuthor]]){const link=document.createElement('a');link.href='https://tatoeba.org/en/sentences/show/'+id;link.target='_blank';link.rel='noopener';link.textContent=author;credit.append(link,' / ');}
 const license=document.createElement('a');license.href='https://creativecommons.org/licenses/by/2.0/fr/';license.textContent='CC BY 2.0 FR';license.target='_blank';license.rel='noopener';credit.append(license);
 target.append(en,zh,play,credit);addFamily(word,target);
}
function currentItem(){return session?.v===3?session.items[session.index]:session?.phase==='recall'?session.items[session.index]:session?.items.find(i=>i.word===session.queue[0]);}
function renderPractice(){
 stopAudio();$('audio-status').textContent='';
 if(session?.v===3){renderModulePractice();return;}
 $('choice-area').hidden=true;
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
function show(next){stopAudio();$('audio-status').textContent='';screen=next;document.body.classList.toggle('learning',next==='practice');$('dashboard').hidden=next!=='dashboard';$('practice').hidden=next!=='practice';$('round-done').hidden=next!=='done';renderDashboard();if(next==='practice')renderPractice();}
async function act(fn){
 if(busy||!rows.length)return;busy=true;document.querySelector('main').setAttribute('aria-busy','true');
 try{await PetAccount.locked('vocab-ui-'+book,()=>{
  PetAccount.assertOwner();refreshSnapshot();if(get(sessionKey)!==sessionRaw){load();show(session?'practice':'dashboard');sayWarning('已读取另一个页面的最新学习进度，请继续。');return;}
  // A changed word record may also come from the earlier version of this page.
  for(const [word]of rows){const r=parseRecord(get('word:'+word));if(r)records.set(word,r);else records.delete(word);}
  fn();
 });}catch(e){sayWarning(e);try{load();show(session?'practice':'dashboard');}catch{}}finally{busy=false;document.querySelector('main').setAttribute('aria-busy','false');}
}
function begin(mode='new'){
 lastMode=mode;sessionKey='session-v3:'+mode;load();
 if(session){show('practice');return;}
 if(!plan){plan={start:dayKey(),v:1};put('hundred-plan',plan);}
 const stats=dayStats(rows,records),d=daily(stats);session=makeModuleSession(rows,records,stats,d.target,Number($('batch-size').value),mode,[...favorites]);
 if(!session){sayWarning('当前没有待学习的词。');show('dashboard');return;}
 prepareChoices();saveSession();show('practice');window.scrollTo(0,0);
}
function prepareChoices(){if(session?.v===3){session.choices=currentItem().kind==='新词'?meaningChoices(byWord.get(currentItem().word),rows):null;session.selected=null;}}
function renderModulePractice(){
 const item=currentItem(),[word,phonetic,meaning]=byWord.get(item.word),detail=session.phase==='detail',question=session.phase==='question',isNew=item.kind==='新词';
 $('phase-label').textContent=`${session.mode==='new'?'新学':session.mode==='review'?'复习':'加练'} · ${session.index+1} / ${session.items.length}`;
 $('round-progress').max=session.items.length;$('round-progress').value=session.index;
 $('kind').textContent=isNew?'先回想，再选择':'先回想，再核对';
 $('favorite').textContent=favorites.has(word)?'★ 已收藏':'☆ 收藏';$('favorite').setAttribute('aria-pressed',String(favorites.has(word)));
 $('word').textContent=word;$('phonetic').textContent=phonetic?'/'+phonetic+'/':'';
 $('meaning').textContent=detail?meaning:'';$('meaning').hidden=!detail;
 $('cue').textContent=detail?'结合例句理解，再进入下一词。':isNew?'先回想词义再选择，想不起来可以看答案。':'瞬间想起选「认识」，思考后想起选「模糊」。';
 $('spell-form').hidden=true;$('recall-actions').hidden=isNew||!question;
 $('choice-area').hidden=!isNew||detail;$('choices').replaceChildren();
 if(isNew&&!detail){for(const choice of session.choices||[]){const row=byWord.get(choice);if(!row)continue;const button=document.createElement('button');button.type='button';button.className='meaning-choice';button.dataset.word=choice;button.disabled=!question;
  if(!question&&(choice===word||choice===session.selected)){button.classList.add(choice===word?'correct':'incorrect');button.append(Object.assign(document.createElement('strong'),{textContent:choice}));}
  button.append(Object.assign(document.createElement('span'),{textContent:row[2]}));
  if(!question&&choice===word)button.append(Object.assign(document.createElement('small'),{textContent:'✓ 正确答案'}));
  else if(!question&&choice===session.selected)button.append(Object.assign(document.createElement('small'),{textContent:'× 本次选择'}));
  button.onclick=()=>act(()=>chooseMeaning(choice));$('choices').append(button);
 }}
 $('reveal-answer').hidden=!question;
 $('context').hidden=!detail;if(detail)context(word,$('context'));else $('context').replaceChildren();
 $('feedback').textContent=session.phase==='feedback'?(item.quality===2?'选对了！继续查看词义和用法。':'记住正确词义，稍后可以到薄弱词再次巩固。'):'';
 $('next').hidden=question;$('next').textContent=detail?(session.index===session.items.length-1?'完成这一组':'下一词'):'继续';
}
function chooseMeaning(choice){if(session?.v!==3||session.phase!=='question'||currentItem().kind!=='新词')return;
 session.selected=choice;const item=currentItem();item.quality=choice===item.word?2:0;item.misses=item.quality===0?1:0;session.phase='feedback';saveSession();renderPractice();}
$('reveal-answer').onclick=()=>act(()=>chooseMeaning(null));
$('legacy-resume').onclick=()=>act(()=>{sessionKey='session-v2';load();show(session?'practice':'dashboard');});
function finishRound(){
 const modern=session.v===3;const misses=session.items.filter(i=>i.misses>0).length;roundSummary=`${session.items.length} 个词已完成${modern?'学习与核对':'拼写'}。${misses?`${misses} 个词需要巩固，已安排短间隔复习。`:'继续按计划复习，记忆会更稳。'}`;
 session=null;saveSession();$('round-summary').textContent=roundSummary;show('done');
}
$('start').onclick=()=>act(()=>begin());$('review-only').onclick=()=>act(()=>begin('review'));$('weak').onclick=()=>act(()=>begin('weak'));
$('another').onclick=()=>act(()=>{show('dashboard');begin(lastMode);});$('back-dashboard').onclick=()=>show('dashboard');$('pause').onclick=()=>{stopAudio();show('dashboard');};
for(const button of document.querySelectorAll('[data-quality]'))button.onclick=()=>act(()=>{if(session?.v===3){if(session.phase!=='question'||currentItem().kind==='新词')return;currentItem().quality=Number(button.dataset.quality);currentItem().misses=currentItem().quality===0?1:0;session.phase='detail';saveSession();renderPractice();return;}if(!session||session.phase!=='recall'||session.revealed)return;currentItem().quality=Number(button.dataset.quality);session.revealed=true;saveSession();renderPractice();});
$('next').onclick=()=>act(()=>{
 if(!session)return;
 stopAudio();$('audio-status').textContent='';
 if(session.v===3){
  if(session.phase==='feedback'){session.phase='detail';saveSession();renderPractice();return;}
  if(session.phase!=='detail')return;
  const item=currentItem(),record=completeRecall(records.get(item.word),item.quality,item.word,session.id);
  put('word:'+item.word,record);records.set(item.word,record);
  if(session.index===session.items.length-1){finishRound();return;}
  session.index++;session.phase='question';prepareChoices();saveSession();renderDashboard();renderPractice();document.querySelector('#practice').scrollTop=0;return;
 }
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
function toggleFavorite(word){const selected=!favorites.has(word);put('favorite:'+word,String(selected));selected?favorites.add(word):favorites.delete(word);$('practice-favorites').disabled=!favorites.size;}
$('favorite').onclick=()=>act(()=>{const word=currentItem()?.word;if(!word)return;toggleFavorite(word);$('favorite').textContent=favorites.has(word)?'★ 已加入生词本':'☆ 加入生词本';$('favorite').setAttribute('aria-pressed',String(favorites.has(word)));});
$('batch-size').onchange=()=>act(()=>put('batch-size',$('batch-size').value));$('accent').onchange=()=>act(()=>put('accent',$('accent').value));
function renderList(){
 $('practice-favorites').disabled=!favorites.size;
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
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&rows.length){externalUpdate();renderDashboard();}else stopAudio();});
setInterval(()=>{if(rows.length&&!document.hidden){try{renderDashboard();}catch(e){sayWarning(e);}}},60000);
document.querySelector(`[data-book="${book}"]`).setAttribute('aria-current','page');
try{
 const response=await fetch(`./${book}.json?v=1`);if(!response.ok)throw Error('词书加载失败，请检查网络后刷新。');rows=await response.json();byWord=new Map(rows.map(r=>[r[0],r]));
 load();show('dashboard');
 fetch('./vocabulary-examples.json?v=hundred1').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{examples=data;if(screen==='practice'&&!$('context').hidden)context(currentItem().word,$('context'));}).catch(()=>sayWarning('例句暂未加载成功；释义、拼写和进度保存仍可使用。刷新后可重试。'));
}catch(e){sayWarning(e);$('book-summary').textContent='词书暂时不可用';$('start').textContent='请刷新重试';}

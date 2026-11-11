import {playAudio,stopAudio,audioReady} from './vocabulary-audio.mjs?v=calendar3';
import {INTERVALS,dayKey,dayNumber,afterDays,parseRecord,dayStats,scheduled,normalizeAnswer,streak,makeModuleSession,meaningChoices,completeRecall} from './vocabulary-core.mjs?v=calendar3';
const $=id=>document.getElementById(id),requestedBook=new URLSearchParams(location.search).get('book'),book=['cet4','cet6','zhongkao','gaokao'].includes(requestedBook)?requestedBook:'cet4';
const title=({cet4:'大学四级',cet6:'大学六级',zhongkao:'长沙中考基础词汇',gaokao:'高考英语词汇'})[book],prefix=`pet234:vocab:v1:${book}:`;
const store=await PetAccount.open('vocab-'+book),records=new Map(),favorites=new Set();
let rows=[],byWord=new Map(),examples={},session=null,sessionRaw=null,busy=false,screen='dashboard',filter='all',listLimit=40,nowDay='',roundSummary='';
let calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),calendarData=null,calendarRequest=0,rewardBusy=false;
const tickets=new Map();
let snapshot=null, sessionKey='session-v3:new', lastMode='new';
const refreshSnapshot=()=>{snapshot=PetAccount.session?{...PetAccount.read('vocab-'+book).data}:null;};
const get=k=>snapshot?snapshot[prefix+k]??null:store.getItem(prefix+k);
const put=(k,v)=>{const raw=typeof v==='string'?v:JSON.stringify(v);store.setItem(prefix+k,raw);if(snapshot)snapshot[prefix+k]=raw;};
const parse=(raw,fallback=null)=>{try{return JSON.parse(raw)??fallback;}catch{return fallback;}};
const sayWarning=e=>{$('warning').textContent=e?.message||String(e);};
function load(){
 refreshSnapshot();
 records.clear();favorites.clear();for(const [word]of rows){const r=parseRecord(get('word:'+word));if(r)records.set(word,r);if(get('favorite:'+word)==='true')favorites.add(word);}
 sessionRaw=get(sessionKey);const saved=parse(sessionRaw);
 session=saved?.v===3&&Array.isArray(saved.items)&&saved.items.length>0&&saved.items.length<=20&&saved.items.every(i=>byWord.has(i.word))&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<saved.items.length&&['question','feedback','detail'].includes(saved.phase)?saved:saved?.v===2&&Array.isArray(saved.items)&&saved.items.length<=20&&saved.items.length>0&&saved.items.every(i=>byWord.has(i.word))&&Array.isArray(saved.queue)&&Array.isArray(saved.done)&&['recall','spell'].includes(saved.phase)?saved:null;
 const size=Number(get('batch-size'));$('batch-size').value=[5,10,20].includes(size)?size:10;
 $('accent').value=get('accent')==='en-GB'?'en-GB':'en-US';
}
function saveSession(){put(sessionKey,session);sessionRaw=get(sessionKey);}
function daily(stats=dayStats(rows,records)){
 const saved=Number(get('daily-goal')),target=get('daily-goal')!==null&&Number.isInteger(saved)&&saved>=0?Math.min(saved,rows.length):50;
 return {target,complete:stats.learned>=target&&stats.due.length===0&&stats.completed>0};
}
function monthKey(){return `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}`;}
function isoKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function localActivity(){const result={};for(const day of parse(get('activity-days'),[])){result[day]=new Set(parse(get('activity:'+day),[]));}for(const [word,r]of records){for(const key of [r.first,r.lastReview].filter(Boolean)){(result[key]??=new Set()).add(word);}}return result;}
function renderCalendar(){
 const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth(),cloud=calendarData?.month===monthKey()?calendarData:null;
 $('calendar-month').textContent=`${year} 年 ${month+1} 月`;
 $('calendar-scope').textContent=PetAccount.session?'账号全部词书 · 北京时间 · ≥50 词达标':'当前词书 · 游客本地记录，登录后可获取积分';
 const cells=[],first=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate(),known=localActivity();
 for(let i=0;i<first;i++){const blank=document.createElement('span');blank.className='calendar-blank';blank.setAttribute('aria-hidden','true');cells.push(blank);}
 for(let i=1;i<=days;i++){const date=new Date(year,month,i),key=dayKey(date),iso=isoKey(date),old=parse(get('day:'+key)),saved=parse(get('activity:'+key),[]),count=Math.max(cloud?.days[iso]?.count||0,saved.length,known[key]?.size||0),reward=cloud?.days[iso]?.reward||0;
 const cell=document.createElement('button');cell.type='button';cell.className='calendar-day';cell.append(Object.assign(document.createElement('b'),{textContent:i}),Object.assign(document.createElement('small'),{textContent:count?`${count} 词`:old?.complete?'已学':'—'}));
 if(count||old?.complete)cell.classList.add('studied');if(reward){cell.classList.add('rewarded');cell.append(Object.assign(document.createElement('em'),{textContent:'+'+reward}));}
 if(iso===(calendarData?.serverDate||isoKey(new Date()))){cell.classList.add('current');cell.setAttribute('aria-current','date');}
 cell.setAttribute('aria-label',`${iso}，${count} 个单词${reward?'，奖励 '+reward+' 积分':''}`);
 cell.onclick=()=>{$('calendar-detail').textContent=`${iso} · ${count?`完成 ${count} 个不同单词`:old?.complete?'旧版学习打卡已保留':'暂无学习记录'}${reward?` · 获得 ${reward} 积分`:''}`;};cells.push(cell);
 }$('calendar').replaceChildren(...cells);
 $('calendar-prev').disabled=year<=2000&&month===0;$('calendar-next').disabled=year>=2099&&month===11;
}
async function fetchCalendar(){if(!PetAccount.session){renderCalendar();return;}const sequence=++calendarRequest;
 try{const data=await PetAccount.request('/v1/vocabulary/calendar?month='+monthKey());if(sequence!==calendarRequest)return;calendarData=data;renderDashboard();}
 catch{if(sequence===calendarRequest)$('study-reward-status').textContent='暂未连接积分服务。学习记录仍会保存；恢复网络后可重试同步。';}
}
function prepareReward(word){if(!PetAccount.session)return Promise.resolve(null);const key=word;
 if(!tickets.has(key)){const request=PetAccount.request('/v1/vocabulary/start',{method:'POST',body:JSON.stringify({book,word})}).catch(()=>{tickets.delete(key);return null;});tickets.set(key,request);}return tickets.get(key);
}
function queueReward(item){if(!PetAccount.session)return;const word=item.word,quality=item.quality;
 prepareReward(word).then(ticket=>{if(!ticket){$('reward-toast').textContent='本词学习已保存；未连接积分服务，本次暂不计入奖励。';return;}if(ticket.completed)return;
 refreshSnapshot();const pending=parse(get('reward-pending'),[]);if(!pending.some(p=>p.ticket===ticket.ticket)){pending.push({ticket:ticket.ticket,quality});put('reward-pending',pending.slice(-500));}flushRewards();});
}
async function flushRewards(){if(rewardBusy||!PetAccount.session)return;rewardBusy=true;
 try{refreshSnapshot();let pending=parse(get('reward-pending'),[]);while(pending.length){const event=pending[0];try{
 const result=await PetAccount.request('/v1/vocabulary/complete',{method:'POST',body:JSON.stringify(event)});
 PetAccount.updateProfile(result.profile);if(result.calendar.month===monthKey())calendarData=result.calendar;else fetchCalendar();
 if(result.reward.awarded){$('reward-toast').textContent=`今日学习达标，+${result.reward.amount} 积分！连续达标 ${result.calendar.streak} 天`;PetAccount.notify($('reward-toast').textContent);}
 refreshSnapshot();pending=parse(get('reward-pending'),[]).filter(p=>p.ticket!==event.ticket);put('reward-pending',pending);renderDashboard();
 }catch(e){if(/过期/.test(e.message)){refreshSnapshot();pending=parse(get('reward-pending'),[]).filter(p=>p.ticket!==event.ticket);put('reward-pending',pending);tickets.clear();$('reward-toast').textContent='跨天或过期记录不补发积分；学习进度已保留。';continue;}
 $('study-reward-status').textContent='学习记录已保存，积分核验待同步。';setTimeout(()=>flushRewards(),e.status===409?3000:30000);break;}}
 }finally{rewardBusy=false;}
}
function recordActivity(word){const key='activity:'+dayKey(),seen=new Set(parse(get(key),[]));seen.add(word);put(key,[...seen]);const days=new Set(parse(get('activity-days'),[]));days.add(dayKey());put('activity-days',[...days]);}
$('calendar-prev').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderCalendar();fetchCalendar();};
$('calendar-next').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderCalendar();fetchCalendar();};
$('calendar-today').onclick=()=>{calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);renderCalendar();fetchCalendar();};
$('retry-study-sync').onclick=()=>{tickets.clear();fetchCalendar();flushRewards();};
$('goal-form').onsubmit=e=>{e.preventDefault();const n=Number($('daily-goal').value);act(()=>{if(!Number.isInteger(n)||n<0||n>rows.length){sayWarning(`请输入 0 到 ${rows.length} 之间的整数，0 表示今天只复习。`);return;}put('daily-goal',String(n));renderDashboard();$('goal-saved').textContent='已保存，可随时调整。';});};
window.addEventListener('online',()=>{tickets.clear();fetchCalendar();flushRewards();});
function renderDashboard(){
 const now=new Date(),today=dayKey(now),stats=dayStats(rows,records,now),d=daily(stats);
 const days=Object.keys(localActivity());
 $('plan-label').textContent=title+' · 自由学习';
 $('journey-title').textContent=d.complete?'今天的目标，完成了。':'按自己的节奏，每天记一点。';
 $('book-summary').textContent=`${title} · ${rows.length.toLocaleString('zh-CN')} 词 · 今日新学目标 ${d.target} 词`;
 $('check-count').textContent=Math.max(calendarData?.studyDays||0,days.length);
 $('streak').textContent=PetAccount.session?`连续达标 ${calendarData?.streak??0} 天`:'登录后可领取学习积分';
 $('due').textContent=stats.due.length;$('remaining').textContent=Math.min(stats.fresh.length,Math.max(0,d.target-stats.learned));$('finished').textContent=stats.completed;
 if(document.activeElement!==$('daily-goal'))$('daily-goal').value=d.target;$('daily-goal').max=rows.length;
 $('study-reward-status').textContent=PetAccount.session?(calendarData?(calendarData.awarded?`今日已奖励 ${calendarData.todayReward} 积分 · 完成 ${calendarData.todayCount} 个不同单词`:`今日 ${calendarData.todayCount} / 50 词 · 达标可得 ${calendarData.requiredReward} 积分`):'正在读取学习积分…'):'游客可学习并保存本地进度；账号积分需登录后在线学习。';
 $('date').textContent=now.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
 $('daily-note').textContent=d.complete?'今日目标已完成。想再练一会儿，可以打开薄弱词或生词本。':`新词 ${stats.learned} / ${d.target} · 已复习 ${stats.reviewed} 词。${stats.due.length?'先处理到期复习，再学新词。':'新学与复习独立进行，核对讲解后记录进度。'}`;
 const pendingNew=parse(get('session-v3:new')),pendingReview=parse(get('session-v3:review'));
 $('start').disabled=!pendingNew&&(!stats.fresh.length||stats.learned>=d.target);$('start').textContent=pendingNew?'继续新学 →':'开始新学 →';
 $('review-only').disabled=!pendingReview&&!stats.due.length;$('review-only').textContent=pendingReview?'继续复习 →':'开始复习 →';
 $('weak').disabled=!stats.weak.length;$('legacy-resume').hidden=!parse(get('session-v2'));
 $('book-title').textContent=title;$('progress').textContent=`已学 ${records.size} / ${rows.length} 词 · 生词本 ${favorites.size} 词`;
 $('book-progress').max=rows.length;$('book-progress').value=records.size;
 renderCalendar();
 $('week').replaceChildren(...Array.from({length:7},(_,i)=>{const date=new Date(afterDays(now,i+1)),start=+date,end=afterDays(date,1),cell=document.createElement('span'),count=document.createElement('b');cell.textContent=date.toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'});count.textContent=[...records.values()].filter(r=>r.due>=start&&r.due<end).length;cell.append(count);return cell;}));
 if(nowDay&&nowDay!==today){tickets.clear();fetchCalendar();}nowDay=today;
}
function speak(text){playAudio(text,$('accent').value,message=>{$('audio-status').textContent=message;if($('word-dialog').open)$('list-audio-status').textContent=message;});}
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
 const item=currentItem();if(item)prepareReward(item.word);if(!item){finishRound();return;}const [word,phonetic,meaning]=byWord.get(item.word),spell=session.phase==='spell',feedback=session.feedback;
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
 const stats=dayStats(rows,records),d=daily(stats);session=makeModuleSession(rows,records,stats,d.target,Number($('batch-size').value),mode,[...favorites]);
 if(!session){sayWarning('当前没有待学习的词。');show('dashboard');return;}
 prepareChoices();saveSession();show('practice');window.scrollTo(0,0);
}
function prepareChoices(){if(session?.v===3){session.choices=currentItem().kind==='新词'?meaningChoices(byWord.get(currentItem().word),rows):null;session.selected=null;}}
function renderModulePractice(){
 const item=currentItem(),[word,phonetic,meaning]=byWord.get(item.word),detail=session.phase==='detail',question=session.phase==='question',isNew=item.kind==='新词';
 prepareReward(word);
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
  put('word:'+item.word,record);records.set(item.word,record);recordActivity(item.word);queueReward(item);
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
 if(correct){const next=scheduled(records.get(item.word),item.quality,item.word,session.id);put('word:'+item.word,next);records.set(item.word,next);recordActivity(item.word);queueReward(item);if(!session.done.includes(item.word))session.done.push(item.word);}
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
 load();show('dashboard');fetchCalendar();flushRewards();
 fetch('./vocabulary-examples.json?v=hundred1').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{examples=data;if(screen==='practice'&&!$('context').hidden)context(currentItem().word,$('context'));}).catch(()=>sayWarning('例句暂未加载成功；释义、拼写和进度保存仍可使用。刷新后可重试。'));
}catch(e){sayWarning(e);$('book-summary').textContent='词书暂时不可用';$('start').textContent='请刷新重试';}

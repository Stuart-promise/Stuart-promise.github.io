(function spanishWorkbook(){
  'use strict';
  const weeks = window.VamosWeeks, books = window.SpanishWeeks;
  const root = document.querySelector('#content');
  const notice = document.querySelector('#notice');
  const store = window.PetSpanish;
  const phases = [
    [1, 4, '发音与初次交流'], [5, 12, '说出日常生活'],
    [13, 20, '讲经历，谈观点'], [21, 26, '把对话进行下去']
  ];
  // Each entry pairs a main-course week with a thematically related beginner workbook.
  const pairings = [1,7,3,6,2,5,4,4,5,10,11,11,3,11,7,5,9,8,10,9,8,9,11,12,12,10];
  const cardBank = new Map();
  let progress, review, settings, current, activeCard, ready = false;
  let reviewTimer;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const pad = value => String(value).padStart(2, '0');
  const link = (href, text, cls='text-link') => `<a class="${cls}" href="${esc(href)}">${esc(text)}</a>`;
  const button = (action, text, cls='quiet') => `<button type="button" class="${cls}" data-action="${action}">${esc(text)}</button>`;
  const normalize = value => String(value).normalize('NFC').trim().toLocaleLowerCase('es').replace(/\s+/g,' ').replace(/[.!?¡¿]+$/g,'');
  const read = name => JSON.parse(store.getItem(name) || '{}');
  const speakButton = (text,label) => `<button type="button" class="listen" data-say="${esc(text)}" aria-label="${esc(label||'朗读 '+text)}">▷ <span>朗读</span></button>`;
  const lessonId = (type,id) => `${type}/${id}`;
  function load() {
    progress = read('progress');
    progress.lessons ||= {};
    review = read('review');
    settings = read('settings');
  }
  function write(name,data) {
    try { store.setItem(name, JSON.stringify(data)); return true; }
    catch (error) { load(); announce(error.message); return false; }
  }
  function announce(text) { notice.textContent = text; }
  function rec(key) { return progress.lessons[key] || {}; }
  function complete(type,id) { return Boolean(rec(lessonId(type,id)).done); }
  function resumeWeek() {
    if (weeks.some(w=>w.id===progress.last) && !complete('week',progress.last)) return progress.last;
    return (weeks.find(w => !complete('week',w.id)) || weeks[0]).id;
  }
  function lessonList(items,type) {
    return `<ul class="lesson-list">${items.map(item => `<li><a href="#${type}/${item.id}">
      <span class="number">${pad(item.id)}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.goal)}</small></span>
      <span class="arrow" aria-label="${complete(type,item.id)?'已完成':'打开'}">${complete(type,item.id)?'✓':'↗'}</span></a></li>`).join('')}</ul>`;
  }
  function path() {
    const resume = resumeWeek();
    const count=weeks.filter(w=>complete('week',w.id)).length;
    return `<section class="hero"><div class="hero-text"><p class="source-name">¡Vamos! × Spanish Courses</p><h1>西语学习手册</h1>
      <p>从第一声 <i lang="es">hola</i>，到用西语讲自己的故事。沿着 26 周路线学，在配套练习册里开口、动笔。</p>
      ${link('#week/'+resume,`${progress.last?'继续':'开始'}第 ${resume} 周　→`,'primary')}</div>
      <img src="./granada.webp" alt="从格拉纳达的屋顶遥望阿尔罕布拉宫" width="960" height="640" fetchpriority="high"></section>
      <section class="chapter"><div class="section-title"><h2>26 周学习路线</h2><span>已完成 ${count} / 26 周</span></div>
      <progress value="${count}" max="26" aria-label="主课完成进度"></progress>
      ${phases.map(([start,end,title])=>`<details class="phase" ${resume>=start&&resume<=end?'open':''}><summary><span class="range">第 ${start}–${end} 周</span><strong>${title}</strong><span class="fold" aria-hidden="true"></span></summary>${lessonList(weeks.filter(w=>w.id>=start&&w.id<=end),'week')}</details>`).join('')}</section>`;
  }
  function workbooks() {
    const count=books.filter(b=>complete('workbook',b.id)).length;
    return `<section class="intro"><p class="source-name">Spanish Courses</p><h1>配套练习册</h1><p>12 个初级主题，每册都可以独立学习，也可以从主课跳到对应主题。</p></section>
      <div class="section-title"><h2>全部练习册</h2><span>已完成 ${count} / 12 册</span></div>${lessonList(books,'workbook')}`;
  }
  function questionForm(q,index,record) {
    const answer=record.answers?.[index] ?? '';
    const good=normalize(answer)===normalize(q.answer);
    const show=answer!=='';
    const fields=q.choices ? q.choices.map(value=>`<label class="option"><input required type="radio" name="answer" value="${esc(value)}" ${answer===value?'checked':''}> <span>${esc(value)}</span></label>`).join('') :
      `<input name="answer" class="answer-text" type="text" value="${esc(answer)}" aria-label="第 ${index+1} 题答案" autocomplete="off" spellcheck="false" required>`;
    return `<form class="question" data-question="${index}"><fieldset><legend>${index+1}. ${esc(q.prompt)}</legend>${fields}</fieldset>
      <button class="quiet" type="submit">检查答案</button><p class="feedback ${good?'correct':''}" role="status">${show?esc((good?'答对了。':'再试一次。')+q.why):''}</p></form>`;
  }
  function renderLesson(type,item) {
    const isMain=type==='week', key=lessonId(type,item.id), record=rec(key);
    const companion=books.find(b=>b.id===pairings[item.id-1]);
    const mainMatch=weeks.find(w=>pairings[w.id-1]===item.id);
    const pair=isMain?companion:mainMatch;
    const kind=isMain?'¡Vamos!':'Spanish Courses';
    const section=isMain?`第 ${item.id} 周`:`练习册 ${pad(item.id)}`;
    const currentList=isMain?weeks:books;
    const next=currentList.find(entry=>entry.id===item.id+1);
    const allCards=item.words.every((w,i)=>review[key+':'+i]);
    const allCorrect=item.questions.every((q,i)=>normalize(record.answers?.[i]||'')===normalize(q.answer));
    const paragraphs=Array.isArray(item.lesson)?item.lesson:[item.lesson];
    return `<article class="lesson"><div class="intro"><p class="source-name">${kind} <span> / </span> ${section}</p><h1>${esc(item.title)}</h1><p>${esc(item.goal)}</p></div>
      <div class="lesson-layout"><div class="lesson-body">
      <section class="paper"><h2>本课讲解</h2>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}
      <h3>听例句，跟着读</h3>${item.examples.map(([es,zh])=>`<div class="example"><div><strong lang="es">${esc(es)}</strong><p>${esc(zh)}</p></div>${speakButton(es)}</div>`).join('')}
      <label class="speed">朗读速度 <select id="speed"><option value="1">正常</option><option value="0.75" ${settings.speed===0.75?'selected':''}>慢速</option></select></label><p class="audio-message" role="status"></p></section>
      <section class="paper"><h2>随堂练习</h2>${item.questions.map((q,i)=>questionForm(q,i,record)).join('')}</section>
      <section class="paper"><h2>用自己的话说</h2><p>${esc(item.task)}</p><details class="model"><summary>查看参考表达</summary><p lang="es">${esc(item.model)} ${speakButton(item.model)}</p></details>
      <form id="draft"><label for="expression">我的表达</label><textarea id="expression" maxlength="2500" rows="3" placeholder="用西语写下你想说的话…">${esc(record.draft||'')}</textarea>
      <button class="quiet" type="submit">保存我的表达</button> <small id="draft-status" role="status"></small></form></section>
      <section class="finish"><button type="button" class="primary" data-action="finish" ${allCorrect&&!record.done?'':'disabled'}>${record.done?'✓ 已完成':`完成本${isMain?'周':'册'}`}</button>
      <span id="finish-hint">${record.done?'':allCorrect?'随堂练习已全部答对。':'答对全部随堂练习后可以完成本课。'}</span>
      ${next?link('#'+type+'/'+next.id,`下一${isMain?'周':'册'} →`):link(isMain?'#path':'#workbooks','返回目录 →')}</section></div>
      <aside><section class="paper side"><h2>本课词卡</h2><ul class="words">${item.words.map(([es,zh])=>`<li><div><strong lang="es">${esc(es)}</strong><small>${esc(zh)}</small></div>${speakButton(es)}</li>`).join('')}</ul>
      <button class="quiet" data-action="add-cards" ${allCards?'disabled':''}>${allCards?'✓ 已加入复习':'加入单词复习'}</button></section>
      ${pair?`<section class="paper side partner"><h2>${isMain?'配套练习册':'搭配主课'}</h2><p>${esc(pair.title)}</p>${link('#'+(isMain?'workbook/':'week/')+pair.id,isMain?'打开练习册 →':'打开主课 →')}</section>`:''}
      <section class="paper side"><h2>原项目资料</h2><ul class="sources">${item.resources.map(r=>`<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.label)} ↗</a></li>`).join('')}</ul></section></aside></div></article>`;
  }
  function dueCards() {
    const now=Date.now();
    return Object.keys(review).filter(id=>cardBank.has(id)&&review[id].due<=now).sort((a,b)=>review[a].due-review[b].due);
  }
  function reviewPage() {
    const due=dueCards(), total=Object.keys(review).filter(id=>cardBank.has(id)).length;
    activeCard=due[0];
    const heading=`<div class="intro"><p class="source-name">Repaso</p><h1>单词复习</h1><p>已收录 ${total} 张词卡，当前有 ${due.length} 张可以复习。</p></div>`;
    if (!activeCard) {
      const next=Math.min(...Object.keys(review).filter(id=>cardBank.has(id)).map(id=>review[id].due));
      if(Number.isFinite(next)) reviewTimer=setTimeout(()=>{if(location.hash==='#review') render();},Math.min(2147483000,Math.max(250,next-Date.now()+100)));
      return heading+`<section class="paper review-card"><h2>${total?'本轮复习完成':'从本课词卡开始'}</h2><p>${total?'下次复习时间：'+esc(new Date(next).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})):'打开任意一课，点「加入单词复习」，就能在这里练习。'}</p>${link('#week/'+resumeWeek(),'返回学习 →')}</section>`;
    }
    const {es,zh,key}=cardBank.get(activeCard);
    return heading+`<section class="paper review-card"><p class="source-name">西语 → 中文</p><h2 lang="es">${esc(es)}</h2>${speakButton(es)}<p class="audio-message" role="status"></p>
      <div id="card-action">${button('flip','查看释义','primary')}</div><div id="card-answer" hidden><p>${esc(zh)}</p>${button('again','还不熟 · 10 分钟后')}${button('known','记住了','primary')}</div></section>${link('#'+key,'回到这张词卡所在的课 →')}`;
  }
  function render(rememberWeek = false) {
    if(!ready) return;
    clearTimeout(reviewTimer);
    const route=location.hash.slice(1)||'path';
    const match=/^(week|workbook)\/([1-9]\d?)$/.exec(route);
    const item=match&&(match[1]==='week'?weeks:books).find(w=>w.id===Number(match[2]));
    current=item?{type:match[1],item,key:lessonId(match[1],item.id)}:null;
    let tab=route==='workbooks'?'workbooks':route==='review'?'review':'path';
    if(current) {
      tab=current.type==='week'?'path':'workbooks';
      if(rememberWeek && current.type==='week' && progress.last!==item.id) {
        progress.last=item.id; write('progress',progress);
      }
      root.innerHTML=renderLesson(current.type,item);
    } else if(route==='workbooks') root.innerHTML=workbooks();
    else if(route==='review') root.innerHTML=reviewPage();
    else root.innerHTML=path();
    document.title=`${item?item.title:tab==='review'?'单词复习':tab==='workbooks'?'配套练习册':'西语学习手册'} · ¡Vamos!`;
    document.querySelectorAll('[data-tab]').forEach(a=>{
      if(a.dataset.tab===tab) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }
  function updateRecord(values) {
    progress.lessons[current.key]={...rec(current.key),...values};
    return write('progress',progress);
  }
  function say(text,source) {
    const feedback=source.closest('section')?.querySelector('.audio-message') || notice;
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) {feedback.textContent='当前浏览器不支持朗读。可以对照西语原文练习。'; return;}
    const synth=window.speechSynthesis, utterance=new SpeechSynthesisUtterance(text);
    utterance.lang='es-ES'; utterance.rate=settings.speed===0.75?0.75:1;
    const voice=synth.getVoices().find(v=>/^es[-_]/i.test(v.lang));
    if(voice) {utterance.voice=voice;utterance.lang=voice.lang;}
    feedback.textContent='';
    utterance.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))feedback.textContent='此设备未能播放西语，请检查系统语音和音量。';};
    synth.cancel(); synth.speak(utterance);
  }
  root.addEventListener('change',event=>{
    if(event.target.id==='speed'){settings.speed=Number(event.target.value);write('settings',settings);}
  });
  root.addEventListener('submit',event=>{
    event.preventDefault();
    if(!current) return;
    const form=event.target;
    if(form.id==='draft') {
      if(updateRecord({draft:form.querySelector('textarea').value})) form.querySelector('#draft-status').textContent='已保存';
      return;
    }
    if(!form.matches('[data-question]')) return;
    const index=Number(form.dataset.question), q=current.item.questions[index];
    const answer=String(new FormData(form).get('answer')||'').trim().slice(0,500);
    const existing=rec(current.key);
    if(!updateRecord({answers:{...existing.answers,[index]:answer}})) return;
    const good=normalize(answer)===normalize(q.answer), message=form.querySelector('.feedback');
    message.classList.toggle('correct',good);
    message.textContent=(good?'答对了。':'再试一次。')+q.why;
    const done=rec(current.key);
    const all=current.item.questions.every((x,i)=>normalize(done.answers[i]||'')===normalize(x.answer));
    root.querySelector('[data-action=finish]').disabled=done.done||!all;
    root.querySelector('#finish-hint').textContent=done.done?'':all?'随堂练习已全部答对。':'答对全部随堂练习后可以完成本课。';
  });
  root.addEventListener('click',event=>{
    const b=event.target.closest('button'); if(!b) return;
    if(b.dataset.say) {say(b.dataset.say,b); return;}
    switch(b.dataset.action) {
      case 'add-cards':
        current.item.words.forEach((w,i)=>{review[current.key+':'+i] ||= {due:Date.now(),level:0};});
        if(write('review',review)){b.disabled=true;b.textContent='✓ 已加入复习';}
        break;
      case 'finish':
        if(updateRecord({done:true,draft:root.querySelector('#expression').value})){
          b.disabled=true; b.textContent='✓ 已完成'; root.querySelector('#finish-hint').textContent='';
        }
        break;
      case 'flip':
        document.querySelector('#card-action').hidden=true;document.querySelector('#card-answer').hidden=false;
        document.querySelector('[data-action=again]').focus();break;
      case 'again':
      case 'known': {
        const again=b.dataset.action==='again', old=review[activeCard];
        if(!old) return;
        const days=[1,3,7,14,30,60], level=again?0:Math.min(days.length,old.level+1);
        review[activeCard]={level,due:Date.now()+(again?600000:days[level-1]*86400000)};
        if(write('review',review)) render();
        break;
      }
    }
  });
  window.addEventListener('hashchange',()=>{window.speechSynthesis?.cancel();announce('');render(true);window.scrollTo(0,0);});
  window.addEventListener('spanish-progress-changed',()=>{
    if(!ready) return;
    // Preserve work in the open form while accepting other tabs' saved changes.
    const pending=[];
    if(current) {
      const saved=rec(current.key);
      const draft=root.querySelector('#expression').value;
      if(draft!==(saved.draft||'')) pending.push(['#expression',draft]);
      root.querySelectorAll('form[data-question]').forEach(form=>{
        const index=form.dataset.question;
        const input=form.querySelector('input:checked, input[type=text]');
        if(input && input.value!==(saved.answers?.[index]||'')) {
          const selector='form[data-question="'+index+'"] input';
          pending.push([input.type==='radio'?selector+'[value="'+CSS.escape(input.value)+'"]':selector,input.value]);
        }
      });
    }
    const focused=document.activeElement;
    const activeId=focused?.id;
    const activeQuestion=focused?.closest('form[data-question]')?.dataset.question;
    load(); render();
    for(const [selector,value] of pending) {
      const field=root.querySelector(selector);
      if(field?.type==='radio') field.checked=true;
      else if(field) field.value=value;
    }
    if(activeId) document.getElementById(activeId)?.focus({preventScroll:true});
    else if(activeQuestion!==undefined) root.querySelector('form[data-question="'+activeQuestion+'"] input:checked, form[data-question="'+activeQuestion+'"] input[type=text]')?.focus({preventScroll:true});
  });
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration(new URL('course/',location.href)).then(reg=>{
      if(reg?.scope===new URL('course/',location.href).href) return reg.update();
    }).catch(()=>{});
  }
  (async()=>{
    if(!Array.isArray(weeks)||weeks.length!==26||!Array.isArray(books)||books.length!==12) throw Error('课程资料未能完整加载，请刷新重试。');
    for(const [type,items] of [['week',weeks],['workbook',books]]) {
      for(const item of items) item.words.forEach(([es,zh],i)=>{
        const key=lessonId(type,item.id);
        cardBank.set(key+':'+i,{es,zh,key});
      });
    }
    await store.ready; load(); ready=true;
    root.setAttribute('aria-busy','false');render(true);
  })().catch(error=>{root.setAttribute('aria-busy','false');root.textContent=error.message;});
})();

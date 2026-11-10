(() => {
  'use strict';
  const A=window.PetAccount, $=id=>document.getElementById(id), species=window.PetSpecies;
  const names={land:'地上走的',sky:'天上飞的',water:'水里游的'}, ages={baby:'幼年期',young:'青年期',adult:'成年期'}, attrs={strength:'力',speed:'速',intelligence:'智'};
  const art=(id,stage)=>'./assets/pets/'+id+'-'+stage+'.webp';
  const find=id=>species.find(s=>s.id===id);
  const study=$('study-pet');
  if(study){
    let studyLoading=false;
    const refreshStudy=async()=>{await A.ready;if(!A.session||studyLoading)return;studyLoading=true;
      try{A.assertOwner();const data=await A.request('/v1/pets/me');if(data.pet){const p=data.pet,s=find(p.species);if(!s)return;
        $('study-pet-image').src=art(s.id,p.stage);$('study-pet-image').alt=ages[p.stage]+s.name;
        $('study-pet-name').textContent=s.name+' · Lv.'+p.level;$('study-pet-note').textContent=ages[p.stage]+' · 休息一下，来陪陪我吧';$('study-pet-cta').textContent='去宠物小屋 →';
        study.setAttribute('aria-label','进入宠物小屋，'+s.name+'，宠物等级 '+p.level);
      }else{$('study-pet-note').textContent='第一只宠物免费领养，等你带回家。';}
      }catch{$('study-pet-note').textContent='点击进入小屋，连接服务器查看宠物。';}finally{studyLoading=false;}
    };
    refreshStudy();
    window.addEventListener('pageshow',e=>{if(e.persisted)refreshStudy();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshStudy();});
    return;
  }
  if(!$('pet-character'))return;
  let state=null,catalog=null,busy=false,category='land',preview='baby',selected=null,confirmAction=null,reactionTimer;
  const pendingKey='pet234:pet-pending:v1:'+A.owner;
  let pending=null;try{pending=JSON.parse(sessionStorage.getItem(pendingKey));}catch{}
  function notice(message,error=false){$('pet-notice').textContent=message;$('pet-notice').dataset.error=String(error);}
  function savePending(value){pending=value;try{if(value)sessionStorage.setItem(pendingKey,JSON.stringify(value));else sessionStorage.removeItem(pendingKey);}catch{}}
  function draw(){
    const p=state?.pet, s=find(p?.species), locked=busy||!!pending||!state;
    $('pet-balance').textContent=state?.profile.balance??'—';
    $('pet-retry').hidden=!pending;$('pet-retry').disabled=busy;
    $('pet-refresh').disabled=busy;
    $('pet-adopt').disabled=busy||!!pending||!!A.session&&!state;
    $('pet-adopt').textContent=!A.session?'登录并免费领养':p?'更换宠物 · 500 积分':'免费领养第一只宠物';
    $('pet-adopt-note').textContent=p?'更换种类保留全部培养进度。':'30 种动物，等你带回家。';
    if(p&&s){
      $('pet-category').textContent=names[s.category];$('pet-age').textContent=ages[p.stage];$('pet-scene').dataset.habitat=s.category;
      const src=art(s.id,p.stage);if(!$('pet-image').getAttribute('src').endsWith(src.slice(2)))$('pet-image').src=src;
      $('pet-image').alt=ages[p.stage]+s.name;$('pet-name').textContent=s.name;$('pet-level').textContent='宠物 Lv.'+p.level;
      $('pet-character').setAttribute('aria-label','摸摸'+s.name);
      $('pet-xp-level').textContent='宠物 Lv.'+p.level;$('pet-xp-text').textContent=p.level===100?'已满级 · 陪伴继续':p.xp+' / '+p.nextXp+' 经验';
      $('pet-xp').max=p.nextXp||1;$('pet-xp').value=p.level===100?1:p.xp;
    }
    document.querySelectorAll('.pet-milestones [data-stage]').forEach(el=>el.classList.toggle('active',el.dataset.stage===p?.stage));
    for(const key of Object.keys(attrs)){$('stat-'+key).textContent=p?.[key]??10;const input=$('pet-allocation').elements[key];input.max=p?.unspent||0;input.disabled=locked||!p?.unspent;}
    $('pet-unspent').textContent=p?.unspent??0;$('pet-allocate').disabled=locked||!p?.unspent;
    document.querySelectorAll('[data-food]').forEach(b=>{const f=catalog?.foods.find(x=>x.id===b.dataset.food);b.disabled=locked||!p||p.level>=100||state.profile.balance<f.price;b.textContent=p?.level>=100?'已满级':!p?'领养后喂食':state.profile.balance<f.price?'积分不足':'购买并喂食';});
    updateSelection();
  }
  async function loadState(){
    if(!A.session){notice('登录账号，免费领养你的第一只宠物。');draw();return;}
    A.assertOwner();state=await A.request('/v1/pets/me');A.updateProfile(state.profile);draw();
  }
  function foodList(){
    $('pet-foods').replaceChildren();
    for(const f of catalog.foods){const card=document.createElement('article');card.className='pet-food-card';
      // Only the fixed server catalog is rendered; never account-provided markup.
      const icon=document.createElement('div');icon.className='pet-food-icon';icon.textContent=f.icon;
      const title=document.createElement('h3');title.textContent=f.name;
      const xp=document.createElement('span');xp.className='food-xp';xp.textContent='+'+f.xp+' 经验 · '+f.tier;
      const gains=document.createElement('div');gains.className='pet-food-gains';for(const k of Object.keys(attrs)){if(f[k]){const t=document.createElement('span');t.textContent=attrs[k]+' +'+f[k];gains.append(t);}}
      const bottom=document.createElement('div');bottom.className='pet-food-bottom';const price=document.createElement('strong');price.textContent=f.price+' ';const unit=document.createElement('small');unit.textContent='积分';price.append(unit);
      const b=document.createElement('button');b.type='button';b.className='pet-secondary';b.dataset.food=f.id;b.textContent='购买并喂食';b.disabled=true;b.onclick=()=>confirmFeed(f);bottom.append(price,b);card.append(icon,title,xp,gains,bottom);$('pet-foods').append(card);
    }draw();
  }
  function openConfirm(title,text,extra,action){$('pet-confirm-title').textContent=title;$('pet-confirm-text').textContent=text;$('pet-confirm-extra').textContent=extra;confirmAction=action;$('pet-confirm-yes').disabled=false;$('pet-confirm').showModal();}
  function confirmFeed(f){
    if(!state?.pet||busy||pending)return;const p=state.pet;let xp=p.xp+f.xp,level=p.level;while(level<100&&xp>=40+(level-1)*10){xp-=40+(level-1)*10;level++;}
    const gains=Object.keys(attrs).filter(k=>f[k]).map(k=>attrs[k]+' +'+f[k]).join('、');
    openConfirm('喂一份'+f.name+'？','花费 '+f.price+' 积分，获得 '+f.xp+' 经验，'+gains+'。',
      (level>p.level?'将升至 Lv.'+level+'，获得 '+((level-p.level)*3)+' 个自由属性点。':'')+(level===100?'满级后停止喂食，多余经验不累计。':'')+'购买后剩余 '+(state.profile.balance-f.price)+' 积分。',()=>runAction({action:'feed',food:f.id}));
  }
  async function runAction(fields,retry=false){
    if(busy)return;
    A.assertOwner();if(!A.session||!state||(!retry&&pending))return;
    const body=retry?pending:{requestId:crypto.randomUUID(),revision:state.pet?.revision||0,...fields};
    if(!body)return;savePending(body);busy=true;draw();notice('正在保存，请稍等…');
    try{
      const oldLevel=state.pet?.level||1;const result=await A.request('/v1/pets/action',{method:'POST',body:JSON.stringify(body)});
      state=result;savePending(null);A.updateProfile(result.profile);$('pet-allocation').reset();
      const message=body.action==='adopt'?(result.cost?'已经换好新伙伴，培养进度全部保留。':'领养成功，欢迎小伙伴回家！'):body.action==='allocate'?'加点已保存。':result.pet.level>oldLevel?'升级啦！达到 Lv.'+result.pet.level+'，别忘了分配属性点。':'吃得很开心，成长已保存。';
      notice(result.replayed?'上次操作已确认，没有重复扣分。':message);touch(body.action==='feed'?'feed':'hug');
      if($('pet-history').open)loadHistory();
    }catch(e){
      if(e.status&&e.status<500){savePending(null);try{await loadState();}catch{}notice(e.message,true);}
      else notice('暂时无法确认操作结果，请点击“重试上次操作”。同一笔操作不会重复扣分。',true);
    }finally{busy=false;draw();}
  }
  function pickerGrid(){
    const root=$('pet-species-grid');root.replaceChildren();
    for(const s of species.filter(x=>x.category===category)){
      const b=document.createElement('button');b.type='button';b.className='pet-species';b.dataset.species=s.id;b.setAttribute('aria-pressed',String(s.id===selected));
      const img=document.createElement('img');img.src=art(s.id,preview);img.alt=ages[preview]+s.name;img.loading='lazy';img.decoding='async';
      const n=document.createElement('span');n.textContent=s.name+(state?.pet?.species===s.id?' · 当前':'');b.append(img,n);b.onclick=()=>{selected=s.id;root.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.species===selected)));updateSelection();};root.append(b);
    }
  }
  function updateSelection(){
    const s=find(selected),p=state?.pet,cost=p?500:0;
    $('pet-selection').textContent=s?s.name+' · '+(p?'保留当前培养进度':'初始力 / 速 / 智各 10'):'先挑一只喜欢的动物';
    $('pet-select-confirm').textContent=p?'500 积分更换':'免费领养';
    $('pet-select-confirm').disabled=!s||busy||!!pending||!state||s.id===p?.species||state.profile.balance<cost;
    if(s&&p&&state.profile.balance<cost)$('pet-selection').textContent='可用积分不足 500，可先欣赏伙伴立绘。';
  }
  $('pet-adopt').onclick=()=>{
    if(!A.session){location.href='./account.html';return;}
    selected=null;category=find(state?.pet?.species)?.category||'land';preview=state?.pet?.stage||'baby';
    $('pet-picker-note').textContent=state?.pet?'更换花费 500 积分，等级、属性、经验、未分配点数全部保留。':'第一次相遇，免费领养。所有动物初始属性相同。';
    syncTabs();pickerGrid();updateSelection();$('pet-picker').showModal();
  };
  function syncTabs(){document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));document.querySelectorAll('[data-preview]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preview===preview)));}
  $('pet-category-tabs').onclick=e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;syncTabs();pickerGrid();}};
  $('pet-stage-tabs').onclick=e=>{const b=e.target.closest('[data-preview]');if(b){preview=b.dataset.preview;syncTabs();pickerGrid();}};
  $('pet-select-confirm').onclick=()=>{
    const s=find(selected);if(!s)return;$('pet-picker').close();
    openConfirm(state.pet?'迎接新伙伴？':'把'+s.name+'带回家？',state.pet?'花费 500 积分，更换为'+s.name+'，完整保留培养进度。':'免费领养'+s.name+'。宠物 Lv.1，力、速、智各 10。',state.pet?'更换后剩余 '+(state.profile.balance-500)+' 积分。':'以后更换种类需要 500 积分。',()=>runAction({action:'adopt',species:s.id}));
  };
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  $('pet-confirm-yes').onclick=()=>{const action=confirmAction;confirmAction=null;$('pet-confirm-yes').disabled=true;$('pet-confirm').close();action?.();};
  $('pet-allocation').onsubmit=e=>{e.preventDefault();if(!state?.pet)return;const data={};for(const k of Object.keys(attrs))data[k]=Number(e.target.elements[k].value);const total=Object.values(data).reduce((a,b)=>a+b,0);if(Object.values(data).some(n=>!Number.isInteger(n)||n<0)||total<1||total>state.pet.unspent){notice('请填写有效的整数，且不要超过剩余属性点。',true);return;}openConfirm('确认分配属性点？',Object.keys(attrs).map(k=>attrs[k]+' +'+data[k]).join('，')+'。','分配后不可撤回，本次使用 '+total+' 点。',()=>runAction({action:'allocate',...data}));};
  $('pet-retry').onclick=()=>runAction({},true);
  $('pet-refresh').onclick=async()=>{try{await loadState();notice(pending?'有待确认的操作，请点击“重试上次操作”。':'已刷新最新成长记录。');if(!catalog){catalog=await A.request('/v1/pets/catalog');foodList();}}catch(e){notice(e.message,true);}};
  const responses={head:['轻轻蹭蹭你的手，好舒服～','眯起眼睛：还想再摸一下！','今天也在认真学习呀，我陪你。'],belly:['痒痒痒！忍不住扭了扭～','开心地晃晃身体！','和你在一起真放松。'],paw:['啪！今天也要一起加油！','给你一个元气满满的击掌！','约好了，学习完再来找我！'],hug:['慢慢靠近你，安静陪你一会儿。','被你惦记着，真好。','不着急，我们一起慢慢长大。'],feed:['啊呜～这一口好满足！','谢谢你准备的美味！','吃饱了，感觉更有精神了！']};
  let touchCount=0;
  function touch(kind){const list=responses[kind]||responses.head;$('pet-speech').textContent=list[touchCount++%list.length];const el=$('pet-character');clearTimeout(reactionTimer);delete el.dataset.reaction;void el.offsetWidth;el.dataset.reaction=kind;reactionTimer=setTimeout(()=>delete el.dataset.reaction,1100);
    const particle=document.createElement('span');particle.className='pet-particle';particle.textContent=kind==='feed'?'✦':'♡';particle.style.setProperty('--dx',(Math.random()*90-45)+'px');$('pet-particles').append(particle);setTimeout(()=>particle.remove(),1300);
  }
  document.querySelectorAll('[data-touch]').forEach(b=>b.onclick=()=>touch(b.dataset.touch));
  let press=null,suppressClick=false;
  $('pet-character').addEventListener('pointerdown',e=>{press={x:e.clientX,y:e.clientY,time:performance.now(),id:e.pointerId};});
  $('pet-character').addEventListener('pointercancel',()=>{press=null;});
  $('pet-character').addEventListener('pointerup',e=>{if(!press||press.id!==e.pointerId)return;const r=e.currentTarget.getBoundingClientRect(),distance=Math.hypot(e.clientX-press.x,e.clientY-press.y),duration=performance.now()-press.time;touch(duration>550?'hug':distance>18?'belly':(e.clientY-r.top)/r.height<.5?'head':(e.clientX-r.left)/r.width>.72?'paw':'belly');press=null;suppressClick=true;setTimeout(()=>suppressClick=false,400);});
  $('pet-character').onclick=e=>{if(!suppressClick&&e.detail===0)touch('head');};
  async function loadHistory(){if(!A.session)return;try{const data=await A.request('/v1/pets/history');$('pet-history-list').replaceChildren();if(!data.entries.length){$('pet-history-list').textContent='还没有培养记录。';return;}for(const row of data.entries){const line=document.createElement('div');line.className='pet-history-row';const label=document.createElement('span');const item=row.action==='adopt'?find(row.item)?.name:catalog?.foods.find(f=>f.id===row.item)?.name;label.textContent=(row.action==='adopt'?(row.cost?'更换':'领养')+item:row.action==='feed'?'喂食 · '+item:'分配属性点')+' · '+(row.cost?'-'+row.cost+' 积分':'免费');const date=document.createElement('time');date.textContent=new Date(row.created*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});line.append(label,date);$('pet-history-list').append(line);}}catch(e){$('pet-history-list').textContent=e.message;}}
  $('pet-history').addEventListener('toggle',()=>{if($('pet-history').open)loadHistory();});
  window.addEventListener('pet-account-profile',e=>{if(state){state.profile=e.detail;draw();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&A.session)loadState().catch(()=>{});});
  (async()=>{await A.ready;try{catalog=await A.request('/v1/pets/catalog');foodList();await loadState();if(A.session)notice(pending?'有一笔操作尚未确认，请点击“重试上次操作”，不会重复扣分。':state.pet?'成长已同步。休息一下，来摸摸小伙伴吧。':'欢迎来到宠物小屋，第一只宠物免费领养。');}catch(e){notice('暂时连接不到宠物服务器，请稍后点击“刷新状态”。',true);draw();}})();
})();

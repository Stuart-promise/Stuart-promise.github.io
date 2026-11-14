/* Shared account storage. Guest keys are never moved or deleted implicitly. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript?.src || new URL('./account.js',location.href));
  if(!document.querySelector('link[href*="account.css"]')) {
    const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('account.css?v=forum1',base);document.head.append(style);
  }
  const API = 'https://111.228.4.20';
  const SESSION = 'pet234:session:v1';
  const modules = {
    'chinese-changsha':'长沙中考古诗文', 'chinese-gaokao':'高考古诗文', python:'Python 闯关', 'vocab-cet4':'四级单词', 'vocab-cet6':'六级单词', 'vocab-zhongkao':'长沙中考单词', 'vocab-gaokao':'高考单词',
    fishing:'钓鱼模拟器', 'coin-tycoon':'金币大亨', animal2048:'动物 2048', blocks:'俄罗斯方块最高分', 'animal-drop':'动物合成最高分'
  };
  const prefixes = {'chinese-changsha':'pet234:chinese:v1:changsha:', 'chinese-gaokao':'pet234:chinese:v1:gaokao:',python:'pet234-python-v1:', 'vocab-cet4':'pet234:vocab:v1:cet4:', 'vocab-cet6':'pet234:vocab:v1:cet6:', 'vocab-zhongkao':'pet234:vocab:v1:zhongkao:', 'vocab-gaokao':'pet234:vocab:v1:gaokao:'};
  const singleKeys = {fishing:'pet234-fishing-v1','coin-tycoon':'pet234-coin-tycoon-v1',animal2048:'pet234-animal2048-v1',blocks:'pet234-blocks-best','animal-drop':'pet234-animal-drop-best'};
  let session = null, stale = false, message = '', timer, running;
  const loaded = new Set(), opening = new Map();
  const memory = new Map();
  try { session = JSON.parse(localStorage.getItem(SESSION)); } catch {}
  if (!session?.user?.id || !session?.token) session = null;
  const owner = session?.user?.id || 'guest';
  const profileKey='pet234:profile:v1:'+owner;
  let profile=null,checkInRunning,lastActivityCheck=0;
  try { if(session)profile=JSON.parse(localStorage.getItem(profileKey)); } catch {}
  function paintAccountLink(link) {
    if(!link)return;
    const level=Number(profile?.level);
    if(session&&Number.isInteger(level)&&level>=1&&level<=9) {
      link.dataset.level=String(level);
      link.textContent=(profile.nickname||session.user.username)+' · Lv.'+level;
    } else {
      delete link.dataset.level;
      link.textContent=session?'账号：'+session.user.username:'登录 / 注册';
    }
  }
  function updateProfile(value,persist=true) {
    if(!value)return;
    profile=value;
    if(persist)try{localStorage.setItem(profileKey,JSON.stringify(value));}catch{}
    const link=document.querySelector('.pet-account-link');
    paintAccountLink(link);
    window.dispatchEvent(new CustomEvent('pet-account-profile',{detail:profile}));
  }
  async function checkIn() {
    if(!session||stale||document.hidden)return;
    if(checkInRunning)return checkInRunning;
    lastActivityCheck=Date.now();
    checkInRunning=request('/v1/check-in',{method:'POST'}).then(result=>{
      updateProfile(result.profile);
      if(result.reward.awarded)notify('今日登录 +'+result.reward.amount+' 积分 · 连续 '+result.profile.streak+' 天');
      return result;
    }).finally(()=>{checkInRunning=null;});
    return checkInRunning;
  }
  const key = m => 'pet234:account:v1:'+owner+':'+m;
  function notify(text) {
    message = text;
    window.dispatchEvent(new CustomEvent('pet-account-status',{detail:text}));
    const badge=document.getElementById('pet-account-status');
    if (badge) badge.textContent=text;
  }
  function assertOwner() {
    let actual; try { actual=JSON.parse(localStorage.getItem(SESSION)); } catch {}
    if ((actual?.user?.id || 'guest') !== owner) {
      stale=true; throw Error('账号已在其他页面切换，请刷新后继续。');
    }
    if (stale) throw Error('请刷新页面后继续。');
  }
  function read(m) {
    let state;
    try { state=JSON.parse(localStorage.getItem(key(m))); } catch {}
    state ||= memory.get(m);
    if (!state || !Number.isInteger(state.version) || !state.data || typeof state.data !== 'object')
      state={version:0,data:{},dirty:false,revision:0};
    return state;
  }
  function write(m,state) {
    assertOwner(); memory.set(m,state);
    try { localStorage.setItem(key(m),JSON.stringify(state)); }
    catch { notify('设备存储空间不足，请导出备份；暂勿关闭本页。'); throw Error('无法保存到本机，请释放空间后再试'); }
  }
  async function request(path,options={}) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),['/v1/me','/v1/check-in'].includes(path)?8000:45000);
    let response;
    try {
      const keepalive=options.method==='PUT' && typeof options.body==='string' && new TextEncoder().encode(options.body).length<48000;
      response=await fetch(API+path,{...options,signal:controller.signal,cache:'no-store',keepalive,
        headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{}),...options.headers}});
      const data=await response.json();
      if (!response.ok) {
        const error=Error(typeof data.detail==='string'?data.detail:'请检查输入后重试');
        error.status=response.status; error.current=data.current; throw error;
      }
      return data;
    } catch (error) {
      if (!error.status) error.message='暂时连接不到账号服务器，记录保留在本机，联网后可重试。';
      throw error;
    } finally { clearTimeout(timeout); }
  }
  async function locked(name,fn) {
    return navigator.locks ? navigator.locks.request('pet234:'+owner+':'+name,fn) : fn();
  }
  async function pull(m) {
    if (!session) return;
    await locked(m,async()=>{
      const cloud=await request('/v1/data/'+m), state=read(m);
      if (state.dirty) {
        const same=Object.keys(state.data).length===Object.keys(cloud.data).length && Object.keys(state.data).every(k=>state.data[k]===cloud.data[k]);
        if (same) {
          write(m,{...cloud,dirty:false,revision:state.revision+1});
        } else if (state.version!==cloud.version) {
          state.conflict=cloud; write(m,state); notify('有不同设备的存档冲突，请到账号中心选择保留的版本。');
        }
      } else {
        write(m,{...cloud,dirty:false,revision:state.revision+1});
      }
    });
  }
  async function open(m) {
    await ready;
    if (!modules[m]) throw Error('未知记录类型');
    if (!loaded.has(m)) {
      if(!opening.has(m)) opening.set(m,pull(m).then(()=>loaded.add(m)).catch(error=>notify(error.message)).finally(()=>opening.delete(m)));
      await opening.get(m);
    }
    schedule();
    let cachedRaw, cachedData;
    return {
      getItem(k) {
        assertOwner();
        if(!session)return localStorage.getItem(k);
        // Reuse parsed data until the stored bytes change, including changes from other tabs.
        let raw;try{raw=localStorage.getItem(key(m));}catch{}
        if(raw!==cachedRaw||!cachedData){cachedRaw=raw;cachedData=read(m).data;}
        return cachedData[k]??null;
      },
      setItem(k,v) {
        assertOwner();
        if (!session) { localStorage.setItem(k,String(v)); return; }
        const state=read(m);if(state.data[k]===String(v))return;
        state.data[k]=String(v); state.dirty=true; state.revision++;
        write(m,state); notify('已存本机 · 等待云同步'); schedule();
      }
    };
  }
  function schedule() { clearTimeout(timer); if(session) timer=setTimeout(()=>flush().catch(()=>{}),1500); }
  async function flushModule(m) {
    return locked(m,async()=>{
      const state=read(m);
      if (!state.dirty || state.conflict) return;
      const revision=state.revision;
      try {
        const result=await request('/v1/data/'+m,{method:'PUT',body:JSON.stringify({baseVersion:state.version,data:state.data})});
        const latest=read(m);
        // Edits made during the upload stay dirty; the confirmed cloud version advances.
        latest.version=result.version; latest.updated=result.updated;
        if (latest.revision===revision) latest.dirty=false;
        write(m,latest);
      } catch (error) {
        if (error.status===409) { const latest=read(m); latest.conflict=error.current; write(m,latest); }
        throw error;
      }
    });
  }
  async function flush() {
    if (!session) return;
    if (running) return running;
    running=(async()=>{
      assertOwner();
      for(const m of Object.keys(modules)) await flushModule(m);
      const states=Object.keys(modules).map(read);
      notify(states.some(s=>s.conflict)?'存档有冲突 · 请到账号中心处理':states.some(s=>s.dirty)?'已存本机 · 等待云同步':'学习与小游戏记录已同步');
    })().catch(error=>{notify(error.message);throw error;}).finally(()=>{running=null;});
    return running;
  }
  async function ensureGameClosed() {
    const lease=JSON.parse(localStorage.getItem('pet234:unity-lease')||'null');
    if(lease&&Date.now()-lease.at<25000)throw Error('请先关闭 Probably Stolen 游戏页面再切换账号。');
    if (navigator.locks) {
      const locks=await navigator.locks.query();
      if (locks.held.some(l=>l.name==='pet234:unity-active')) throw Error('请先关闭 Probably Stolen 游戏页面，等待存档同步后再切换账号。');
    }
  }
  async function authenticate(mode,body) {
    await ensureGameClosed();
    if (session) throw Error('请先退出当前账号。');
    const result=await request('/v1/'+mode,{method:'POST',body:JSON.stringify(body)});
    // Persist before navigating. No new account is allowed to inherit a guest snapshot.
    localStorage.setItem(SESSION,JSON.stringify({token:result.token,user:result.user,expires:result.expires}));
    stale=true;
    return result;
  }
  async function logout() {
    await ensureGameClosed();
    try { await flush(); } catch {}
    const dirty=Object.keys(modules).some(m=>read(m).dirty);
    if (dirty && !confirm('还有记录未同步，仍会保留在此设备的当前账号下。确定退出吗？')) return false;
    try { await request('/v1/logout',{method:'POST'}); } catch(error) {
      if(error.status!==401) throw Error('未能连接服务器完成退出，请联网后重试。');
    }
    localStorage.removeItem(SESSION); stale=true; location.reload(); return true;
  }
  function guestData(m) {
    const data={};
    for(let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if ((prefixes[m]&&k.startsWith(prefixes[m])) || k===singleKeys[m]) data[k]=localStorage.getItem(k);
    }
    return data;
  }
  async function importGuest(m) {
    if(!session) throw Error('请先登录');
    await pull(m);
    const state=read(m);
    if(state.conflict) throw Error('请先处理此项的存档冲突');
    if(Object.keys(state.data).length) throw Error('此账号已经有这项记录。为避免覆盖，只能导入到空记录中。游客记录仍保留在本机。');
    const data=guestData(m);
    if(!Object.keys(data).length) throw Error('此设备没有这项游客记录');
    write(m,{...state,data,dirty:true,revision:state.revision+1}); await flush();
  }
  async function resolve(m,choice) {
    await locked(m,async()=>{
      const state=read(m);
      const current=await request('/v1/data/'+m);
      // A local backup is retained even when the user selects cloud.
      localStorage.setItem(key(m)+':before-conflict',JSON.stringify(state));
      if(choice==='cloud') write(m,{...current,dirty:false,revision:state.revision+1});
      else write(m,{version:current.version,data:state.data,dirty:true,revision:state.revision+1});
    });
    await flush();
  }
  const ready=(async()=>{
    if(session) {
      // Check-in also authenticates the session and returns the complete current profile.
      try { const result=await checkIn(); if(!result?.reward.awarded)notify('已登录 · '+(profile?.nickname||session.user.username)); }
      catch(error) { notify(error.message); }
    } else notify('游客模式 · 记录仅存本机');
  })();
  function mount() {
    const header=document.querySelector('header');
    if(!header)return;
    header.classList.add('pet-account-header');
    if(!header.querySelector('.pet-forum-nav')) {
      const forum=document.createElement('a');forum.className='pet-forum-nav';forum.href=new URL('forum.html',base).href;forum.textContent='论坛';
      if(location.pathname.endsWith('/forum.html'))forum.setAttribute('aria-current','page');
      header.append(forum);
    }
    const link=document.createElement('a'); link.className='pet-account-link'; link.href=new URL('account.html',base).href;
    paintAccountLink(link);
    header.append(link);
    const bar=document.createElement('div'); bar.className='pet-account-bar';
    const status=document.createElement('span'); status.id='pet-account-status'; status.setAttribute('role','status'); status.textContent=message;
    bar.append(status); header.after(bar);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();
  window.addEventListener('online',()=>flush().catch(()=>{}));
  setInterval(()=>{if(session&&!document.hidden)flush().catch(()=>{});},30000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)flush().catch(()=>{});});
  const onActivity=()=>{
    if(!session||document.hidden||Date.now()-lastActivityCheck<60000)return;
    lastActivityCheck=Date.now();
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(!profile?.checkedInToday||profile.serverDate!==today)checkIn().catch(()=>{});
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)onActivity();});
  window.addEventListener('online',onActivity);
  document.addEventListener('pointerdown',onActivity,{passive:true});
  document.addEventListener('keydown',onActivity);
  window.addEventListener('storage',e=>{
    if(e.key===SESSION) {
      stale=true;
      // Prevent the running game from writing under a new identity before reload.
      location.reload();
    } else if(e.key===profileKey&&e.newValue) {
      try{updateProfile(JSON.parse(e.newValue),false);}catch{}
    } else if(e.key?.startsWith('pet234:account:v1:'+owner+':')) {
      window.dispatchEvent(new CustomEvent('pet-account-data',{detail:e.key}));
    }
  });
  window.PetAccount={ready,open,flush,request,authenticate,logout,modules,read,resolve,guestData,importGuest,
    notify,locked,ensureGameClosed,assertOwner,session,owner,base,checkIn,updateProfile,get profile(){return profile;}};
})();

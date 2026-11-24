/* Shared account storage. Guest keys are never moved or deleted implicitly. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript?.src || new URL('./account.js',location.href));
  if(!document.querySelector('link[href*="account.css"]')) {
    const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('account.css?v=forum1',base);document.head.append(style);
  }
  const API = 'https://111.228.4.20';
  const SESSION = 'pet234:session:v1';
  const PENDING_LOGOUT = 'pet234:logout-pending:v1';
  const modules = {
    'chinese-changsha':'长沙中考古诗文', 'chinese-gaokao':'高考古诗文', python:'Python 闯关', 'vocab-cet4':'四级单词', 'vocab-cet6':'六级单词', 'vocab-zhongkao':'长沙中考单词', 'vocab-gaokao':'高考单词',
    fishing:'钓鱼模拟器', 'coin-tycoon':'金币大亨', 'zhaoyun-adou':'赵云与阿斗', animal2048:'动物 2048', blocks:'俄罗斯方块最高分', 'animal-drop':'动物合成最高分'
  };
  const prefixes = {'chinese-changsha':'pet234:chinese:v1:changsha:', 'chinese-gaokao':'pet234:chinese:v1:gaokao:',python:'pet234-python-v1:', 'vocab-cet4':'pet234:vocab:v1:cet4:', 'vocab-cet6':'pet234:vocab:v1:cet6:', 'vocab-zhongkao':'pet234:vocab:v1:zhongkao:', 'vocab-gaokao':'pet234:vocab:v1:gaokao:'};
  const singleKeys = {fishing:'pet234-fishing-v1','coin-tycoon':'pet234-coin-tycoon-v1',animal2048:'pet234-animal2048-v1',blocks:'pet234-blocks-best','animal-drop':'pet234-animal-drop-best'};
  const zhaoKeys = new Set(['zyad.learning.profile.v1','zyad.learning.profile.v1.backup','zyad.friend.history.v1']);
  let session = null, stale = false, message = '', timer, running, syncing, signingIn, signingOut, revoking;
  let connection = 'checking';
  const loaded = new Set(), opening = new Map();
  const controllers = new Set();
  const memory = new Map();
  function storedSession() {
    try { const value=JSON.parse(localStorage.getItem(SESSION)); return value?.user?.id&&typeof value.token==='string'&&value.token?value:null; } catch { return null; }
  }
  const identity = value => value ? String(value.user.id)+':'+value.token : 'guest';
  session=storedSession();
  const pageIdentity=identity(session);
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
    if(!value||!session||stale)return;
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
  function notify(text,force=false) {
    if(stale&&!force)return;
    message = text;
    window.dispatchEvent(new CustomEvent('pet-account-status',{detail:text}));
    const badge=document.getElementById('pet-account-status');
    if (badge) badge.textContent=text;
  }
  function assertOwner() {
    if (identity(storedSession()) !== pageIdentity) {
      stale=true; throw Error('账号已在其他页面切换，请刷新后继续。');
    }
    if (stale) throw Error('请刷新页面后继续。');
  }
  function stopRequests() { clearTimeout(timer); for(const controller of controllers)controller.abort(); }
  function endSession(text) {
    // A delayed response from this page must never remove a newer login.
    if(identity(storedSession())!==pageIdentity)return false;
    localStorage.removeItem(SESSION);
    stale=true;session=null;profile=null;connection='signed-out';loaded.clear();stopRequests();
    paintAccountLink(document.querySelector('.pet-account-link'));
    notify(text,true);
    window.dispatchEvent(new CustomEvent('pet-account-session',{detail:{signedIn:false,message:text}}));
    return true;
  }
  function sameData(a,b) {
    return Object.keys(a||{}).length===Object.keys(b||{}).length&&Object.keys(a||{}).every(k=>a[k]===b[k]);
  }
  function read(m) {
    let state;
    try { state=JSON.parse(localStorage.getItem(key(m))); } catch {}
    // Failed writes must remain visible to retry/export even if an older disk copy exists.
    state=memory.get(m)||state;
    if (!state || !Number.isInteger(state.version) || !state.data || typeof state.data !== 'object')
      state={version:0,data:{},dirty:false,revision:0};
    return state;
  }
  function write(m,state) {
    assertOwner();
    try { localStorage.setItem(key(m),JSON.stringify(state));memory.delete(m); }
    catch { memory.set(m,state);notify('设备存储空间不足，请导出备份；暂勿关闭本页。'); throw Error('无法保存到本机，请释放空间后再试'); }
  }
  async function request(path,options={}) {
    const {anonymous=false,timeoutMs,...fetchOptions}=options;
    if(!anonymous)assertOwner();
    const expected=identity(storedSession()), token=anonymous?null:session?.token;
    const controller=new AbortController();
    controllers.add(controller);
    const timeout=setTimeout(()=>controller.abort(),timeoutMs??(['/v1/me','/v1/check-in','/v1/login','/v1/register','/v1/recover'].includes(path)?8000:45000));
    let response;
    try {
      const keepalive=fetchOptions.method==='PUT' && typeof fetchOptions.body==='string' && new TextEncoder().encode(fetchOptions.body).length<48000;
      response=await fetch(API+path,{...fetchOptions,signal:controller.signal,cache:'no-store',keepalive,
        headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...fetchOptions.headers}});
      const data=await response.json();
      if(identity(storedSession())!==expected||(!anonymous&&stale))throw Object.assign(Error('账号已在其他页面切换，请刷新后继续。'),{identityChanged:true});
      if (!response.ok) {
        const error=Error(typeof data.detail==='string'?data.detail:'请检查输入后重试');
        error.status=response.status; error.current=data.current;
        if(token&&response.status>=500)connection='offline';
        // Hidden-space passcodes also use 401; those must not sign out the account.
        const accountExpired=data.detail==='请先登录'||(typeof data.detail==='string'&&data.detail.startsWith('登录已过期'))||['/v1/me','/v1/check-in'].includes(path)||path.startsWith('/v1/data/');
        if(response.status===401&&token&&accountExpired)endSession('登录已过期，请重新登录；未同步记录仍保留在原账号下。');
        throw error;
      }
      if(token)connection='online';
      return data;
    } catch (error) {
      if (!error.status&&!error.identityChanged&&!stale) {
        if(token)connection='offline';
        error.message='暂时连接不到账号服务器，记录保留在本机，联网后可重试。';
      }
      throw error;
    } finally { clearTimeout(timeout);controllers.delete(controller); }
  }
  async function locked(name,fn) {
    return navigator.locks ? navigator.locks.request('pet234:'+owner+':'+name,fn) : fn();
  }
  async function pull(m) {
    if (!session) return;
    await locked(m,async()=>{
      assertOwner();
      const cloud=await request('/v1/data/'+m), state=read(m);
      if (state.dirty) {
        const same=sameData(state.data,cloud.data);
        if (same) {
          write(m,{...cloud,dirty:false,revision:state.revision+1});
        } else if (state.version!==cloud.version) {
          state.conflict=cloud; write(m,state); notify('有不同设备的存档冲突，请到账号中心选择保留的版本。');
        }
      } else if(state.version!==cloud.version||!sameData(state.data,cloud.data)||state.conflict||(state.updated??null)!==(cloud.updated??null)) {
        write(m,{...cloud,dirty:false,revision:state.revision+1});
      }
      loaded.add(m);
    });
  }
  async function open(m) {
    await ready;
    assertOwner();
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
        if(memory.has(m)||raw!==cachedRaw||!cachedData){cachedRaw=raw;cachedData=read(m).data;}
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
  function schedule() { clearTimeout(timer); if(session&&!stale&&!signingOut) timer=setTimeout(()=>flush().catch(()=>{}),1500); }
  async function flushModule(m) {
    return locked(m,async()=>{
      assertOwner();
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
        loaded.add(m);
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
      for(const m of Object.keys(modules)) {
        try { await flushModule(m); } catch(error) { if(error.status!==409)throw error; }
      }
      const states=Object.keys(modules).map(read);
      notify(states.some(s=>s.conflict)?'存档有冲突 · 请到账号中心处理':states.some(s=>s.dirty)?'已存本机 · 等待云同步':connection==='online'&&loaded.size?'已打开的学习与小游戏记录已同步':'云端状态尚未确认 · 本机记录仍保留');
    })().catch(error=>{if(!stale)notify(error.message);throw error;}).finally(()=>{running=null;});
    return running;
  }
  async function sync() {
    if(syncing)return syncing;
    syncing=(async()=>{
      await ready;assertOwner();
      if(!session)throw Error('请先登录后再同步。');
      notify('正在读取云端并同步记录…');
      // Upload pending edits first; a version conflict preserves both copies.
      await flush();
      const names=Object.keys(modules);
      for(let i=0;i<names.length;i+=4) {
        const results=await Promise.allSettled(names.slice(i,i+4).map(pull));
        const failed=results.find(result=>result.status==='rejected');
        if(failed)throw failed.reason;
      }
      await flush();
      const conflict=names.some(m=>read(m).conflict),pending=names.some(m=>read(m).dirty);
      const text=conflict?'存档有冲突 · 请在下方选择保留的版本':pending?'新记录已存本机 · 正在等待下一次同步':'云端与本机记录已同步';
      notify(text);return {conflict,pending,message:text};
    })().catch(error=>{if(!stale)notify(error.message);throw error;}).finally(()=>{syncing=null;});
    return syncing;
  }
  function syncState(m) {
    if(stale)return 'expired';
    if(!session)return 'guest';
    const state=read(m);
    return state.conflict?'conflict':memory.has(m)?'storage-error':connection==='offline'?'offline':state.dirty?'pending':loaded.has(m)?'synced':'checking';
  }
  async function ensureGameClosed() {
    let lease;try{lease=JSON.parse(localStorage.getItem('pet234:unity-lease')||'null');}catch{}
    if(lease&&Date.now()-lease.at<25000)throw Error('请先关闭 Probably Stolen 游戏页面再切换账号。');
    if (navigator.locks) {
      const locks=await navigator.locks.query();
      if (locks.held.some(l=>l.name==='pet234:unity-active')) throw Error('请先关闭 Probably Stolen 游戏页面，等待存档同步后再切换账号。');
    }
  }
  async function authenticate(mode,body) {
    if(signingIn)throw Error('正在登录，请稍候。');
    if(!['login','register','recover'].includes(mode))throw Error('未知账号操作');
    signingIn=true;
    try {
      await ensureGameClosed();
      if (storedSession()) throw Error('请先退出当前账号。');
      const result=await request('/v1/'+mode,{method:'POST',body:JSON.stringify(body),anonymous:true});
      // request checks the identity again after receiving the response.
      if(storedSession())throw Error('账号已在其他页面登录，请刷新后继续。');
      localStorage.setItem(SESSION,JSON.stringify({token:result.token,user:result.user,expires:result.expires}));
      stale=true;stopRequests();
      return result;
    } finally { signingIn=false; }
  }
  function pendingLogouts() {
    try {const entries=JSON.parse(localStorage.getItem(PENDING_LOGOUT)||'[]');return Array.isArray(entries)?entries.filter(item=>typeof item.token==='string'&&Number.isFinite(item.expires)&&item.expires>Date.now()/1000):[];}catch{return [];}
  }
  function queueLogout(value) {
    try {
      const entries=pendingLogouts().filter(item=>item.token!==value.token);
      entries.push({token:value.token,expires:Number(value.expires)||Date.now()/1000+86400});
      localStorage.setItem(PENDING_LOGOUT,JSON.stringify(entries.slice(-8)));
    }catch{}
  }
  async function revokePending() {
    if(revoking)return revoking;
    revoking=(async()=>{
      const attempted=new Set();
      while(true) {
        // Revoke only the signed-out token, never a newer current session.
        const currentToken=storedSession()?.token;
        const item=pendingLogouts().find(value=>value.token!==currentToken&&!attempted.has(value.token));
        if(!item)break;
        attempted.add(item.token);
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),2500);
        try {
          const response=await fetch(API+'/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+item.token},cache:'no-store',keepalive:true,signal:controller.signal});
          if(response.ok||response.status===401) {
            const rest=pendingLogouts().filter(value=>value.token!==item.token);
            if(rest.length)localStorage.setItem(PENDING_LOGOUT,JSON.stringify(rest));else localStorage.removeItem(PENDING_LOGOUT);
          } else break;
        }catch{break;}finally{clearTimeout(timeout);}
      }
    })().finally(()=>{revoking=null;});
    return revoking;
  }
  async function logout() {
    if(signingOut)return signingOut;
    signingOut=(async()=>{
      await ensureGameClosed();
      if(!session)return true;
      assertOwner();
      const previous=session;
      notify('正在保存记录并退出…');clearTimeout(timer);
      let deadline;
      try { await Promise.race([flush(),new Promise(resolve=>{deadline=setTimeout(resolve,4000);})]); } catch {} finally {clearTimeout(deadline);}
      // Expiry may already have signed out this page while the upload was pending.
      if(!session)return true;
      assertOwner();
      const dirty=Object.keys(modules).some(m=>read(m).dirty);
      const unsaved=Array.from(memory.values()).some(state=>state.dirty);
      const question=unsaved?'设备空间不足，有记录仅保留在当前页面。请先取消并导出备份，否则刷新后可能丢失。仍然退出吗？':'还有记录未同步，仍会保留在此设备的当前账号下；下次登录同一账号可继续同步。确定退出吗？';
      if (dirty && !confirm(question)) return false;
      queueLogout(previous);
      endSession('已退出登录'+(unsaved?' · 请保留已导出的备份。':dirty?' · 未同步记录已保留在原账号下。':'。'));
      // Local logout must not depend on the server being reachable.
      revokePending().catch(()=>{});
      return true;
    })().finally(()=>{signingOut=null;if(session&&!stale)schedule();});
    return signingOut;
  }
  function guestData(m) {
    const data={};
    for(let i=0;i<localStorage.length;i++) {
      const k=localStorage.key(i);
      if ((prefixes[m]&&k.startsWith(prefixes[m])) || k===singleKeys[m] || (m==='zhaoyun-adou'&&zhaoKeys.has(k))) data[k]=localStorage.getItem(k);
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
      try { const result=await checkIn(); if(session&&!stale&&!result?.reward.awarded)notify('已登录 · '+(profile?.nickname||session.user.username)); }
      catch(error) { if(!stale)notify(error.message); }
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
  window.addEventListener('online',()=>{revokePending().catch(()=>{});if(!stale)flush().catch(()=>{});});
  setInterval(()=>{if(session&&!stale&&!signingOut&&!document.hidden)flush().catch(()=>{});},30000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!stale&&!signingOut)flush().catch(()=>{});});
  const onActivity=()=>{
    if(!session||stale||signingOut||document.hidden||Date.now()-lastActivityCheck<60000)return;
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
      if(identity(storedSession())===pageIdentity)return;
      stale=true;stopRequests();
      // Prevent the running game from writing under a new identity before reload.
      location.reload();
    } else if(e.key===profileKey&&e.newValue) {
      try{updateProfile(JSON.parse(e.newValue),false);}catch{}
    } else if(e.key?.startsWith('pet234:account:v1:'+owner+':')) {
      let before,after;try{before=JSON.parse(e.oldValue);after=JSON.parse(e.newValue);}catch{}
      // Acknowledging an upload must not interrupt a game in another tab.
      if(!sameData(before?.data,after?.data)||JSON.stringify(before?.conflict)!==JSON.stringify(after?.conflict))window.dispatchEvent(new CustomEvent('pet-account-data',{detail:e.key}));
      else window.dispatchEvent(new CustomEvent('pet-account-status',{detail:message}));
    }
  });
  window.addEventListener('pageshow',event=>{
    if(event.persisted&&identity(storedSession())!==pageIdentity){stale=true;stopRequests();location.reload();}
  });
  window.PetAccount={ready,open,flush,sync,syncState,request,authenticate,logout,modules,read,resolve,guestData,importGuest,
    notify,locked,ensureGameClosed,assertOwner,owner,base,checkIn,updateProfile,get session(){return session;},get profile(){return profile;},get status(){return message;}};
  revokePending().catch(()=>{});
})();

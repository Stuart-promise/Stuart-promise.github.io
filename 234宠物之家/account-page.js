const A=window.PetAccount,$=id=>document.getElementById(id);
let mode='login',recoveryResult;
let creativeRecords;
async function loadCreativeRecords(){
  try {creativeRecords=await A.request('/v1/creative');} catch {creativeRecords=null;}
}
const message=t=>{$('account-message').textContent=t;};
function download(name,data) {
  const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function action(label,fn) {
  const button=document.createElement('button');button.textContent=label;
  button.onclick=async()=>{button.disabled=true;try{await fn();render();}catch(e){message(e.message);}finally{button.disabled=false;}};
  return button;
}
function row(title,subtitle) {
  const node=document.createElement('div');node.className='pet-account-record';
  const label=document.createElement('div'),small=document.createElement('small');label.textContent=title;small.textContent=subtitle;label.append(small);node.append(label);return node;
}
function render() {
  if(!A.session)return;
  $('records').replaceChildren();$('guest-records').replaceChildren();
  for(const [m,title] of Object.entries(A.modules)) {
    const state=A.read(m);
    const status=A.syncState(m);
    const r=row(title,state.conflict?'有两个不同版本，需要选择':status==='too-large'?'存档过大，请先导出备份，缩减后可继续同步':status==='storage-error'?'本机空间不足 · 请先导出备份':state.dirty?'已保存在本机，尚未同步':['offline','checking'].includes(status)?'本机副本 · 等待确认云端状态':state.updated?'已同步 · '+new Date(state.updated*1000).toLocaleString():'暂时没有云端记录');
    if(state.conflict) {
      r.append(action('保留云端版本',async()=>{if(confirm('使用云端记录替换本机这项记录？本机旧版会保留备份。'))await A.resolve(m,'cloud');}),
        action('使用本机版本',async()=>{if(confirm('将本机这项记录上传为新版本？'))await A.resolve(m,'local');}));
    }
    $('records').append(r);
    const count=Object.keys(A.guestData(m)).length;
    if(count){const g=row(title,'此设备有 '+count+' 条游客数据');g.append(action('导入到我的账号',()=>A.importGuest(m)));$('guest-records').append(g);}
  }
  for(const [module,title] of Object.entries(CreativeSave.titles)) {
    const local=CreativeSave.metadata(A.owner,module), cloud=creativeRecords?.[module];
    const subtitle=local.conflict?'有不同设备的作品版本，请打开工具选择':local.dirty?'已保存在本机，等待云同步':cloud?'云端版本 '+cloud.version+' · '+new Date(cloud.updated*1000).toLocaleString():creativeRecords?'暂无云端作品':'等待确认云端作品';
    const entry=row(title,subtitle),open=document.createElement('a');
    open.href='./'+module+'/';open.textContent='打开作品';entry.append(open);$('records').append(entry);
    if(CreativeSave.metadata('guest',module).exists && !cloud && !local.exists) {
      const guest=row(title,'此设备有一份游客作品');
      const importLink=open.cloneNode();importLink.textContent='打开工具导入';guest.append(importLink);$('guest-records').append(guest);
    }
  }
  if(!$('guest-records').children.length)$('guest-records').textContent='此设备没有可导入的游客学习记录或小游戏记录。';
}
function renderIdentity() {
  $('auth-panel').hidden=!!A.session||!!recoveryResult;
  $('signed-panel').hidden=!A.session;
  if(!A.session){$('records').replaceChildren();$('guest-records').replaceChildren();}
  else render();
}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
  mode=button.dataset.mode;message('');
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-selected',String(b===button)));
  $('auth-submit').textContent={login:'登录',register:'创建账号',recover:'重置密码'}[mode];
  $('password-label').textContent=mode==='recover'?'新密码':'密码';
  $('password').autocomplete=mode==='login'?'current-password':'new-password';
  $('recovery-label').hidden=mode!=='recover';$('recovery').required=mode==='recover';
});
$('auth-form').onsubmit=async e=>{
  e.preventDefault();$('auth-submit').disabled=true;message('正在连接…');
  try {
    const result=await A.authenticate(mode,{username:$('username').value.trim(),password:$('password').value,...(mode==='recover'?{code:$('recovery').value.trim()}:{})});
    $('password').value='';$('recovery').value='';
    if(result.recoveryCode){recoveryResult=result;$('auth-panel').hidden=true;$('recovery-panel').hidden=false;$('new-recovery').textContent=result.recoveryCode;message('账号已准备好，请保存恢复码。');}
    else location.reload();
  }catch(error){message(error.message);}finally{$('auth-submit').disabled=false;}
};
$('download-recovery').onclick=()=>download('234宠物之家-账号恢复码.txt','用户名：'+recoveryResult.user.username+'\n恢复码：'+recoveryResult.recoveryCode+'\n请勿分享此文件。');
$('continue-account').onclick=()=>location.reload();
$('sync-now').onclick=async()=>{
  const button=$('sync-now');button.disabled=true;button.textContent='同步中…';
  try{
    const result=await A.sync();
    let pending=false;
    for(const module of Object.keys(CreativeSave.titles)){
      if(CreativeSave.metadata(A.owner,module).dirty){
        const saved=await (await CreativeSave.open(module)).flush();
        if(saved.state==='pending')pending=true;
      }
    }
    await loadCreativeRecords();message(pending?'作品已存本机，云同步待重试':result.message);
  }catch(e){if(A.session)message(e.message);}finally{button.disabled=false;button.textContent='立即同步';renderIdentity();}
};
$('logout').onclick=async()=>{
  const button=$('logout');button.disabled=true;button.textContent='正在退出…';
  try{await A.logout();}catch(e){message(e.message);}finally{button.disabled=false;button.textContent='退出登录';renderIdentity();}
};
$('export-account').onclick=async()=>{
  const backup={schema:1,user:A.session.user,local:{},cloud:null};
  for(const m of Object.keys(A.modules))backup.local[m]=A.read(m);
  try {Object.assign(backup.local,await CreativeSave.exportLocal());}catch(e){message('本机作品读取失败：'+e.message);}
  try{backup.cloud=await A.request('/v1/export');}catch{message('未能取得云端副本，本次导出此设备的学习与小游戏记录。Probably Stolen 请使用游戏内存档备份按钮。');}
  download('pet234-records-'+new Date().toISOString().slice(0,10)+'.json',backup);
};
window.addEventListener('pet-account-status',e=>{message(e.detail);render();});
window.addEventListener('pet-account-data',render);
window.addEventListener('pet-account-session',e=>{recoveryResult=null;$('recovery-panel').hidden=true;$('password').value='';$('recovery').value='';renderIdentity();message(e.detail.message);});
renderIdentity();message(A.status);
await A.ready;
renderIdentity();
if(A.session){
  $('auth-panel').hidden=true;$('signed-panel').hidden=false;$('welcome').textContent='学习与游戏存档';
  render();
  await Promise.all([loadCreativeRecords(),...Object.keys(A.modules).map(m=>A.open(m))]);render();
}

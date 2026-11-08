const A=window.PetAccount,$=id=>document.getElementById(id);
await A.ready;
let mode='login',recoveryResult;
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
    const r=row(title,state.conflict?'有两个不同版本，需要选择':state.dirty?'已保存在本机，尚未同步':state.updated?'已同步 · '+new Date(state.updated*1000).toLocaleString():'暂时没有云端记录');
    if(state.conflict) {
      r.append(action('保留云端版本',async()=>{if(confirm('使用云端记录替换本机这项记录？本机旧版会保留备份。'))await A.resolve(m,'cloud');}),
        action('使用本机版本',async()=>{if(confirm('将本机这项记录上传为新版本？'))await A.resolve(m,'local');}));
    }
    $('records').append(r);
    const count=Object.keys(A.guestData(m)).length;
    if(count){const g=row(title,'此设备有 '+count+' 条游客数据');g.append(action('导入到我的账号',()=>A.importGuest(m)));$('guest-records').append(g);}
  }
  if(!$('guest-records').children.length)$('guest-records').textContent='此设备没有可导入的游客学习记录或小游戏记录。';
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
$('sync-now').onclick=async()=>{try{await A.flush();message('同步检查完成。');render();}catch(e){message(e.message);render();}};
$('logout').onclick=()=>A.logout().catch(e=>message(e.message));
$('export-account').onclick=async()=>{
  const backup={schema:1,user:A.session.user,local:{},cloud:null};
  for(const m of Object.keys(A.modules))backup.local[m]=A.read(m);
  try{backup.cloud=await A.request('/v1/export');}catch{message('未能取得云端副本，本次导出此设备的学习与小游戏记录。Probably Stolen 请使用游戏内存档备份按钮。');}
  download('pet234-records-'+new Date().toISOString().slice(0,10)+'.json',backup);
};
window.addEventListener('pet-account-status',e=>message(e.detail));
window.addEventListener('pet-account-data',render);
if(A.session){
  $('auth-panel').hidden=true;$('signed-panel').hidden=false;$('welcome').textContent='学习与游戏存档';
  render();
  await Promise.all(Object.keys(A.modules).map(m=>A.open(m)));render();
}

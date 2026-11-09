const A=window.PetAccount,$=id=>document.getElementById(id),key='pet234:hidden-pass:v1';let pass=null,timer;
try{pass=JSON.parse(sessionStorage.getItem(key));}catch{}
function forget(message=''){pass=null;clearTimeout(timer);try{sessionStorage.removeItem(key);}catch{}$('hidden-content').hidden=true;$('hidden-title').textContent='';$('hidden-copy').textContent='';$('hidden-gate').hidden=false;$('hidden-message').textContent=message;}
async function content(){
 const data=await A.request('/v1/hidden/content',{headers:{'X-Hidden-Token':pass.token}});
 $('hidden-title').textContent=data.title;$('hidden-copy').textContent=data.message;$('hidden-content').hidden=false;$('hidden-gate').hidden=true;$('hidden-message').textContent='';
 clearTimeout(timer);timer=setTimeout(()=>forget('通行已过期，请重新输入密码。'),Math.max(0,pass.expires*1000-Date.now()));
}
$('hidden-unlock').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('hidden-message').textContent='正在验证…';try{pass=await A.request('/v1/hidden/unlock',{method:'POST',body:JSON.stringify({password:$('hidden-password').value})});$('hidden-password').value='';try{sessionStorage.setItem(key,JSON.stringify(pass));}catch{}await content();}catch(error){forget(error.message);}finally{button.disabled=false;}};
$('hidden-lock').onclick=async()=>{const token=pass?.token;forget('空间已锁定。');if(token)try{await A.request('/v1/hidden/lock',{method:'POST',headers:{'X-Hidden-Token':token}});}catch{}};
async function refresh(){if(!pass)return;try{await content();}catch(e){forget(e.message);}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},60000);
await A.ready;
try{const status=await A.request('/v1/hidden/status');$('hidden-status').textContent=status.enabled?'密码由站长统一设置，验证后本标签页可访问 4 小时。':'站长暂未设置访问密码，请稍后再来。';if(pass)await refresh();}catch(e){$('hidden-status').textContent=e.message;}

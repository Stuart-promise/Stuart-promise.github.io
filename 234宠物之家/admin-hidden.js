const A=window.PetAccount,$=id=>document.getElementById(id);let loaded=false;
async function setup(){
 const allowed=!!(A.session&&A.profile?.canManageTitles);$('hidden-admin').hidden=!allowed;if(!allowed){loaded=false;$('hidden-admin-form').reset();return;}if(loaded)return;loaded=true;
 try{const data=await A.request('/v1/admin/hidden');paint(data);}catch(e){$('hidden-admin-message').textContent=e.message;loaded=false;}
}
function paint(data){$('hidden-admin-status').textContent=data.enabled?'已设置密码 · 最近修改：'+new Date(data.updated*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'尚未设置密码，隐藏空间暂时不可进入。';}
$('hidden-admin-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');if($('hidden-new-password').value!==$('hidden-confirm-password').value){$('hidden-admin-message').textContent='两次密码不一致，请重新填写。';return;}button.disabled=true;$('hidden-admin-message').textContent='正在保存…';try{A.assertOwner();const data=await A.request('/v1/admin/hidden',{method:'PUT',body:JSON.stringify({password:$('hidden-new-password').value})});form.reset();paint(data);$('hidden-admin-message').textContent='访问密码已保存，原来的通行凭证已全部失效。';}catch(error){$('hidden-admin-message').textContent=error.message;}finally{button.disabled=false;}};
window.addEventListener('pet-account-profile',setup);await A.ready;await setup();

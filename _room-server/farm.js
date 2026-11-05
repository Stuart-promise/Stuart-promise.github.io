import {DurableObject} from "cloudflare:workers";
import {newFarm,applyFarmAction} from "../234宠物之家/farm-engine.mjs";

const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
const randomHex=length=>hex(crypto.getRandomValues(new Uint8Array(length)));
async function digest(text){return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)));}
async function passwordHash(password,salt,iterations=100000){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",salt:new TextEncoder().encode(salt),iterations,hash:"SHA-256"},key,256));
}
function same(a,b){
  return typeof a==="string"&&typeof b==="string"&&a.length===b.length&&
    crypto.subtle.timingSafeEqual(new TextEncoder().encode(a),new TextEncoder().encode(b));
}
function validPassword(value){return typeof value==="string"&&value.length>=8&&value.length<=128;}
function validCode(value){return typeof value==="string"&&/^[a-f0-9]{32}$/.test(value);}
function publicRecord(record,username){
  return {username,version:record.version,farm:record.farm,savedAt:record.savedAt};
}
function newSession(record){
  const token=randomHex(32);
  return digest(token).then(hash=>{
    record.sessions=(record.sessions||[]).filter(s=>s.expires>Date.now()).slice(-9);
    record.sessions.push({hash,expires:Date.now()+30*86400000});
    return token;
  });
}
export class FarmAccount extends DurableObject {
  async fetch(request) {
    const url=new URL(request.url),parts=url.pathname.split("/");
    const username=parts[3],route=parts[4];
    if(!/^[a-z0-9_]{3,24}$/.test(username||""))return json({error:"账号应为 3～24 位字母、数字或下划线。"},400);
    const allowedGet=route==="state"&&request.method==="GET";
    if(!allowedGet&&request.method!=="POST")return json({error:"请求方法不支持。"},405);
    let body={};
    if(request.method==="POST"){
      const text=await request.text();
      if(text.length>8192)return json({error:"请求过大。"},413);
      try{body=JSON.parse(text);}catch{return json({error:"请求格式无效。"},400);}
      if(!body||typeof body!=="object")return json({error:"请求格式无效。"},400);
    }
    return this.ctx.blockConcurrencyWhile(async()=>{
      let record=await this.ctx.storage.get("account");
      const authRoute=["register","login","reset"].includes(route);
      if(authRoute){
        const throttle=await this.ctx.storage.get("throttle")||{count:0,start:Date.now(),blocked:0};
        if(throttle.blocked>Date.now())return json({error:"尝试次数过多，请三分钟后再试。"},429);
        if(Date.now()-throttle.start>300000){throttle.count=0;throttle.start=Date.now();}
        async function rejected(storage){
          throttle.count++;
          if(throttle.count>=8)throttle.blocked=Date.now()+180000;
          await storage.put("throttle",throttle);
          return json({error:"账号、密码或恢复码不正确。"},401);
        }
        if(route==="register"){
          if(!validPassword(body.password)||!validCode(body.recovery)||typeof body.id!=="string"||body.id.length>80)return json({error:"密码需要 8～128 个字符，请重新填写。"},400);
          if(record){
            const retry=record.registrationId===body.id&&same(await passwordHash(body.password,record.salt,record.iterations),record.passwordHash)&&same(await digest(body.recovery),record.recoveryHash);
            if(!retry)return json({error:"账号已存在，请登录或换一个账号。"},409);
          }else{
            const salt=randomHex(16);
            record={schema:1,salt,iterations:100000,passwordHash:await passwordHash(body.password,salt),recoveryHash:await digest(body.recovery),
              registrationId:body.id,sessions:[],version:0,farm:newFarm(),recent:[],savedAt:Date.now()};
          }
        }else if(route==="login"){
          if(!validPassword(body.password))return rejected(this.ctx.storage);
          const hash=await passwordHash(body.password,record?.salt||"unknown-account",record?.iterations||100000);
          if(!record||!same(hash,record.passwordHash))return rejected(this.ctx.storage);
        }else{
          if(!record||!validCode(body.recovery)||!validCode(body.newRecovery)||!validPassword(body.newPassword)||typeof body.id!=="string"||body.id.length>80)return rejected(this.ctx.storage);
          const oldRecoveryHash=await digest(body.recovery);
          const nextRecoveryHash=await digest(body.newRecovery);
          const retry=record.resetReceipt?.id===body.id&&record.resetReceipt.expires>Date.now()&&
            same(oldRecoveryHash,record.resetReceipt.oldRecoveryHash)&&same(nextRecoveryHash,record.recoveryHash)&&
            same(await passwordHash(body.newPassword,record.salt,record.iterations),record.passwordHash);
          if(!retry){
            if(!same(oldRecoveryHash,record.recoveryHash))return rejected(this.ctx.storage);
            record.salt=randomHex(16);record.passwordHash=await passwordHash(body.newPassword,record.salt,record.iterations);
            record.recoveryHash=nextRecoveryHash;record.sessions=[];
            record.resetReceipt={id:body.id,oldRecoveryHash,expires:Date.now()+600000};
          }
        }
        const token=await newSession(record);
        await this.ctx.storage.put("account",record);
        await this.ctx.storage.delete("throttle");
        return json({...publicRecord(record,username),token,recovery:route==="register"?body.recovery:route==="reset"?body.newRecovery:undefined});
      }
      if(!record)return json({error:"请先登录。"},401);
      const token=request.headers.get("Authorization")?.replace(/^Bearer /,"");
      if(!/^[a-f0-9]{64}$/.test(token||""))return json({error:"登录已过期，请重新登录。"},401);
      const tokenHash=await digest(token);
      if(!record.sessions.some(s=>s.expires>Date.now()&&same(s.hash,tokenHash)))return json({error:"登录已过期，请重新登录。"},401);
      if(route==="state")return json(publicRecord(record,username));
      if(route==="logout"){
        record.sessions=record.sessions.filter(s=>s.hash!==tokenHash);
        await this.ctx.storage.put("account",record);
        return json({ok:true});
      }
      if(route==="password"){
        if(!validPassword(body.password)||!validPassword(body.newPassword))return json({error:"密码需要 8～128 个字符。"},400);
        if(!same(await passwordHash(body.password,record.salt,record.iterations),record.passwordHash))return json({error:"原密码不正确。"},400);
        record.salt=randomHex(16);record.passwordHash=await passwordHash(body.newPassword,record.salt,record.iterations);
        record.sessions=[];const freshToken=await newSession(record);
        await this.ctx.storage.put("account",record);
        return json({...publicRecord(record,username),token:freshToken});
      }
      if(route!=="action")return json({error:"接口不存在。"},404);
      if(typeof body.id!=="string"||body.id.length>80||!body.id)return json({error:"操作编号无效。"},400);
      if(record.recent.includes(body.id))return json(publicRecord(record,username));
      if(body.version!==record.version)return json({error:"存档已由其他页面更新，已载入最新进度，请重试。",...publicRecord(record,username)},409);
      try{applyFarmAction(record.farm,body.action,body.args||{});}catch(error){return json({error:error.message},400);}
      record.version++;record.savedAt=Date.now();
      record.recent.push(body.id);record.recent=record.recent.slice(-40);
      await this.ctx.storage.put("account",record);
      return json(publicRecord(record,username));
    });
  }
}

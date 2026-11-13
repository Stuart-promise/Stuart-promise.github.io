export const normalize = text => Array.from(String(text).normalize('NFKC').replaceAll('锺','钟').replaceAll('𫐓','輮')).filter(c=>!/[\s\p{P}]/u.test(c)).join('');
export function compare(expected, answer) {
  const a=Array.from(normalize(expected)), b=Array.from(normalize(answer));
  if(b.length>1500)throw Error('输入过长，请只默写当前段落');
  const d=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=0;i<=a.length;i++)d[i][b.length]=a.length-i;
  for(let j=0;j<=b.length;j++)d[a.length][j]=b.length-j;
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)d[i][j]=Math.min(d[i+1][j]+1,d[i][j+1]+1,d[i+1][j+1]+(a[i]===b[j]?0:1));
  const ops=[];let i=0,j=0;
  while(i<a.length||j<b.length){
    if(i<a.length&&j<b.length&&d[i][j]===d[i+1][j+1]+(a[i]===b[j]?0:1)){ops.push({type:a[i]===b[j]?'same':'wrong',expected:a[i++],actual:b[j++]});}
    else if(i<a.length&&d[i][j]===d[i+1][j]+1)ops.push({type:'missing',expected:a[i++],actual:''});
    else ops.push({type:'extra',expected:'',actual:b[j++]});
  }
  return {correct:d[0][0]===0,errors:d[0][0],ops};
}
export function dayKey(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function schedule(old={},hadErrors=false,day=dayKey()){
  const step=hadErrors?0:Math.min(5,(old.step??-1)+1),date=new Date(day+'T00:00:00+08:00');
  date.setUTCDate(date.getUTCDate()+[1,2,4,7,15,30][step]);
  return {...old,step,due:dayKey(date),last:day,passes:(old.passes||0)+1};
}
const PAIRS={已:'己',己:'已',未:'末',末:'未',人:'入',入:'人',日:'目',目:'日',不:'布',无:'元',天:'夭',生:'声',声:'生',青:'清',清:'青',知:'之',之:'知',有:'友',友:'有',心:'必',山:'出',水:'永',白:'百',千:'干',春:'舂',明:'名',名:'明'};
export function challenge(text){const chars=Array.from(text),index=chars.findIndex(c=>PAIRS[c]);if(index<0)return null;const expected=chars[index];chars[index]=PAIRS[expected];return {chars,index,expected};}

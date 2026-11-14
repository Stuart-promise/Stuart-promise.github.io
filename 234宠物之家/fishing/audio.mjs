// Gesture-unlocked, self-contained fishing foley. No audio files or frame-loop work.
export class FishingAudio {
 constructor(){this.enabled=true;this.context=null;this.master=null;this.noise=null;this.groups=[];this.disposed=false;this.resuming=null;this.lastPlay=new Map();}
 async unlock(){
  if(this.disposed||!this.enabled)return false;
  try{
   if(!this.context){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return false;
    const context=new Audio({latencyHint:'interactive'});this.context=context;
    this.master=context.createGain();this.master.gain.value=.42;this.master.connect(context.destination);
    // One small reusable buffer: a soft mix of white and low-frequency noise.
    const size=Math.ceil(context.sampleRate*.75);this.noise=context.createBuffer(1,size,context.sampleRate);
    const data=this.noise.getChannelData(0);let smooth=0;
    for(let i=0;i<size;i++){const white=Math.random()*2-1;smooth=.965*smooth+.035*white;data[i]=white*.56+smooth*3.3;}
   }
   if(this.context.state==='closed')return false;
   if(this.context.state!=='running'){
    this.resuming??=Promise.resolve(this.context.resume()).finally(()=>{this.resuming=null;});
    await this.resuming;
   }
   return !this.disposed&&this.enabled&&this.context?.state==='running';
  }catch{return false;}
 }
 setEnabled(value){
  this.enabled=!!value;if(!this.context||!this.master||this.context.state==='closed')return;
  try{const now=this.context.currentTime;this.master.gain.cancelScheduledValues(now);this.master.gain.setValueAtTime(this.master.gain.value,now);this.master.gain.linearRampToValueAtTime(this.enabled ? .42 : 0,now+.035);if(!this.enabled)for(const group of [...this.groups])this.stopGroup(group);}catch{}
 }
 play(kind){
  if(!this.enabled||this.disposed||this.context?.state!=='running'||!['cast','reel','catch','escape'].includes(kind))return false;
  try{
   const now=this.context.currentTime;if(now-(this.lastPlay.get(kind)??-10)<.07)return false;this.lastPlay.set(kind,now);
   while(this.groups.length>=4)this.stopGroup(this.groups[0]);
   const gain=this.context.createGain();gain.gain.value=1;gain.connect(this.master);
   const group={gain,nodes:[gain],sources:[],remaining:0,stopped:false};this.groups.push(group);
   const at=now+.006;
   if(kind==='cast'){
    // Rod sweep, airy line flight, then a small water entry.
    this.noiseNote(group,at,.24,.17,1700,500,'bandpass',.7);
    this.tone(group,at+.02,.16,360,130,.035,'sine');
    this.noiseNote(group,at+.28,.13,.19,2300,650,'lowpass',1.15);
    this.tone(group,at+.29,.14,470,110,.15,'sine');
    this.tone(group,at+.32,.1,720,240,.045,'sine');
   }else if(kind==='reel'||kind==='catch'){
    // A short, soft ratchet, not a continuous motor or a struggle sound.
    for(let i=0;i<5;i++){this.noiseNote(group,at+i*.037,.024,.06,1800+i*110,1300,'bandpass',1);this.tone(group,at+i*.037,.022,540+i*34,420,.025,'triangle');}
    this.noiseNote(group,at+.14,.16,.12,1200,450,'lowpass',.85);
    this.tone(group,at+.17,.13,180,410,.055,'sine');
    if(kind==='catch'){
     this.tone(group,at+.23,.26,659,659,.11,'sine');
     this.tone(group,at+.33,.38,988,988,.09,'sine');
     this.tone(group,at+.34,.22,1976,1976,.018,'sine');
    }
   }else{
    this.noiseNote(group,at,.25,.17,1700,350,'lowpass',.9);
    this.tone(group,at+.015,.19,260,90,.105,'sine');
    this.tone(group,at+.06,.15,390,150,.035,'sine');
   }
   return true;
  }catch{return false;}
 }
 source(group,node,ends){
  group.sources.push(node);group.nodes.push(node);group.remaining++;
  node.onended=()=>{try{node.disconnect();}catch{}group.remaining--;if(group.remaining===0)this.finishGroup(group);};
  node.stop(ends);
 }
 tone(group,start,duration,frequency,endFrequency,volume,type){
  const oscillator=this.context.createOscillator(),envelope=this.context.createGain();oscillator.type=type;
  oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  envelope.gain.setValueAtTime(.0001,start);envelope.gain.linearRampToValueAtTime(volume,start+.008);envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  oscillator.connect(envelope);envelope.connect(group.gain);group.nodes.push(envelope);oscillator.start(start);this.source(group,oscillator,start+duration+.015);
 }
 noiseNote(group,start,duration,volume,frequency,endFrequency,type,rate){
  const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),envelope=this.context.createGain();
  source.buffer=this.noise;source.playbackRate.value=rate;filter.type=type;filter.Q.value=.65;
  filter.frequency.setValueAtTime(frequency,start);filter.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  envelope.gain.setValueAtTime(.0001,start);envelope.gain.linearRampToValueAtTime(volume,start+Math.min(.025,duration*.3));envelope.gain.exponentialRampToValueAtTime(.0001,start+duration);
  source.connect(filter);filter.connect(envelope);envelope.connect(group.gain);group.nodes.push(filter,envelope);source.start(start);this.source(group,source,start+duration+.015);
 }
 stopGroup(group){
  if(group.stopped)return;group.stopped=true;const at=this.groups.indexOf(group);if(at>=0)this.groups.splice(at,1);
  try{const now=this.context.currentTime;group.gain.gain.cancelScheduledValues(now);group.gain.gain.setValueAtTime(group.gain.gain.value,now);group.gain.gain.linearRampToValueAtTime(0,now+.025);for(const source of group.sources)try{source.stop(now+.03);}catch{}}catch{this.finishGroup(group);}
 }
 finishGroup(group){
  const at=this.groups.indexOf(group);if(at>=0)this.groups.splice(at,1);
  for(const node of group.nodes)try{node.disconnect();}catch{}
  for(const source of group.sources)source.onended=null;group.nodes.length=group.sources.length=0;
 }
 dispose(){
  if(this.disposed)return;this.disposed=true;this.enabled=false;
  for(const group of [...this.groups]){this.stopGroup(group);this.finishGroup(group);}
  this.groups=[];try{this.master?.disconnect();this.context?.close()?.catch(()=>{});}catch{}
  this.context=this.master=this.noise=null;this.lastPlay.clear();
 }
}

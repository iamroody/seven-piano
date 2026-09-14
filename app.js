const buffers=[];
let samplesReady=false;
const syllables=['do','re','mi','fa','sol','la','si'];
let context,master,selected=0,cursor=0,sequence=[],playing=false,timer,releaseTimer,playGeneration=0;
const voices=new Map();
const pendingNotes=new Map();
let inputGeneration=0;
const $=id=>document.getElementById(id);
function audio(){if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=$('volume').value/100*.65;master.connect(context.destination)}return context}
async function unlockAudio(){const ctx=audio();if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running')throw new Error('Audio is not running');return ctx}
function sound(n,id){if(!samplesReady||voices.has(id))return;const ctx=audio(),t=ctx.currentTime;
const gain=ctx.createGain();gain.gain.setValueAtTime(.85,t);gain.connect(master);
const source=ctx.createBufferSource();source.buffer=buffers[n-1];source.connect(gain);source.start(t);
const voice={gain,source,n,started:t};voices.set(id,voice);
source.onended=()=>{source.disconnect();gain.disconnect();if(voices.get(id)===voice){voices.delete(id);if(![...voices.values()].some(v=>v.n===n))document.querySelector(`[data-key="${n}"]`).classList.remove('active')}};
document.querySelector(`[data-key="${n}"]`).classList.add('active');$('played').textContent=`${n} · ${syllables[n-1]}`}
function release(id){const pending=pendingNotes.get(id);if(pending)pending.released=true;const voice=voices.get(id);if(!voice)return;const t=Math.max(context.currentTime,voice.started+.12);
// Keep the hammer attack intact on quick taps, then let the damper fade the string.
voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setValueAtTime(.85,t);voice.gain.gain.exponentialRampToValueAtTime(.0001,t+.55);voice.source.stop(t+.6);voices.delete(id);if(![...voices.values()].some(v=>v.n===voice.n))document.querySelector(`[data-key="${voice.n}"]`).classList.remove('active')}
async function loadSamples(){
const controls=[...document.querySelectorAll('.key'),$('listen')];controls.forEach(e=>e.disabled=true);$('audio-status').textContent='正在准备钢琴…';
try{const ctx=audio();const decoded=await Promise.all(PIANO_SAMPLES.map(data=>{const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return ctx.decodeAudioData(bytes.buffer)}));buffers.push(...decoded);samplesReady=true;controls.forEach(e=>e.disabled=false);$('audio-status').textContent='原声钢琴';}
catch(error){$('audio-status').textContent='音色加载失败，请刷新重试';console.error('Piano sample decoding failed',error)}
}
let phraseStarts=[],freePlay=false;
function currentPhrase(){let result=0;phraseStarts.forEach((start,i)=>{if(cursor>=start)result=i});return result}
function noteMarkup(token,index){const [n,d=1]=token.split(':').map(Number);return `<span class="score-note ${d<1?'half':''}" data-index="${index}">${n}${d===1.5?'<small>·</small>':''}</span>`+'<span class="score-note dash">−</span>'.repeat(Math.max(0,Math.floor(d)-1))}
function savePractice(){try{sessionStorage.setItem('seven-piano-practice',JSON.stringify({song:songs[selected].id,cursor,freePlay}))}catch{}}
function mark(){
const phrase=currentPhrase();
const upcoming=songs[selected].phrases[phrase+1];
$('next-score').innerHTML=upcoming?'<div class="phrase">'+upcoming.split(' ').map(t=>noteMarkup(t,-1).replace(/ data-index="-1"/g,'')).join('')+'</div>':'';
$('score').innerHTML='<div class="phrase">'+songs[selected].phrases[phrase].split(' ').map((t,i)=>noteMarkup(t,phraseStarts[phrase]+i)).join('')+'</div>';
document.querySelectorAll('.score-note[data-index]').forEach(e=>{const i=+e.dataset.index;e.classList.toggle('current',i===cursor);e.classList.toggle('done',i<cursor)});
document.querySelectorAll('.key').forEach(e=>e.classList.toggle('expected',!freePlay&&+e.dataset.key===sequence[cursor]?.n));
$('phrase-count').textContent=`第 ${phrase+1} / ${phraseStarts.length} 句`;
$('prev-phrase').disabled=phrase===0;$('next-phrase').disabled=phrase===phraseStarts.length-1;
$('progress').textContent=cursor===sequence.length?'这首小曲，想弹给谁听？':'';savePractice();
}
function setFreePlay(enabled){stop();cancelInput();freePlay=enabled;document.body.classList.toggle('free-play',enabled);document.querySelector('.practice-panel').hidden=enabled;$('mode-free').setAttribute('aria-pressed',enabled);$('mode-guided').setAttribute('aria-pressed',!enabled);mark()}
$('mode-free').onclick=()=>setFreePlay(true);
$('mode-guided').onclick=()=>setFreePlay(false);
function jumpPhrase(i){stop();cancelInput();cursor=phraseStarts[i];mark()}
async function press(n,id){
if(!samplesReady||pendingNotes.has(id)||voices.has(id))return;
if(playing)stop();
const request={released:false,generation:inputGeneration};pendingNotes.set(id,request);
try{
// Resume within the gesture, and start the note only once the audio clock is running.
if(audio().state!=='running')await unlockAudio();
if(request.generation!==inputGeneration)return;
sound(n,id);$('audio-status').textContent='原声钢琴';
if(!freePlay&&cursor<sequence.length&&sequence[cursor].n===n){cursor++;mark()}
// A quick first tap may have ended while resume() was pending. Still play its attack.
if(request.released)release(id);
}catch(error){$('audio-status').textContent='声音未启动，请再点一次琴键';console.warn('Audio unlock failed',error)}
finally{if(pendingNotes.get(id)===request)pendingNotes.delete(id)}
}
function cancelInput(){inputGeneration++;pendingNotes.clear();[...voices.keys()].forEach(release)}
// Some mobile browsers unlock on touchend/click rather than pointerdown.
for(const event of ['touchend','click'])document.addEventListener(event,()=>{if(pendingNotes.size&&context?.state!=='running')unlockAudio().catch(()=>{})},{capture:true,passive:true});
function stop(){playing=false;playGeneration++;clearTimeout(timer);clearTimeout(releaseTimer);[...voices.keys()].filter(id=>id.startsWith('demo')).forEach(release);$('listen').textContent='▶ 试听'}
function choose(i){stop();cancelInput();selected=i;cursor=0;sequence=[];phraseStarts=[];$('song-title').textContent=songs[i].title;
songs[i].phrases.forEach(phrase=>{phraseStarts.push(sequence.length);phrase.split(' ').forEach(token=>{const [n,d=1]=token.split(':').map(Number);sequence.push({n,d})})});
$('full-score-content').innerHTML=songs[i].phrases.map((phrase,j)=>`<button class="full-phrase" data-phrase="${j}" aria-label="从第 ${j+1} 句开始"><span class="full-phrase-number">${j+1}</span><span class="phrase">${phrase.split(' ').map((t,k)=>noteMarkup(t,phraseStarts[j]+k)).join('')}</span></button>`).join('');
document.querySelectorAll('[data-phrase]').forEach(e=>e.onclick=()=>{jumpPhrase(+e.dataset.phrase);$('full-score').close()});mark()}
$('keys').innerHTML=syllables.map((s,i)=>`<button class="key" data-key="${i+1}" aria-label="${i+1} ${s}"><span class="letter">${'CDEFGAB'[i]}</span><span class="note">${i+1}</span><span class="solfege">${s}</span></button>`).join('');
document.querySelectorAll('.key').forEach(key=>{key.addEventListener('pointerdown',e=>{e.preventDefault();key.setPointerCapture(e.pointerId);press(+key.dataset.key,'pointer'+e.pointerId)});for(const event of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(event,e=>release('pointer'+e.pointerId));key.addEventListener('click',e=>{if(e.detail===0){let id='assist'+key.dataset.key;press(+key.dataset.key,id);setTimeout(()=>release(id),250)}})});
window.addEventListener('keydown',e=>{if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||$('guide').open||$('full-score').open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(/^[1-7]$/.test(e.key)){e.preventDefault();press(+e.key,'keyboard'+e.code)}});
window.addEventListener('keyup',e=>release('keyboard'+e.code));window.addEventListener('blur',()=>{stop();cancelInput()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();cancelInput()}});
$('volume').addEventListener('input',()=>{if(master)master.gain.setTargetAtTime($('volume').value/100*.65,context.currentTime,.02)});
$('restart').onclick=()=>{stop();cursor=0;mark()};
$('listen').onclick=async()=>{if(playing){stop();return}audio();playing=true;const generation=++playGeneration;try{await unlockAudio()}catch(error){stop();$('audio-status').textContent='声音未启动，请再点一次试听';return}if(!playing||generation!==playGeneration)return;if(cursor>=sequence.length)cursor=0;$('listen').textContent='■ 停止';function step(){if(!playing||generation!==playGeneration)return;if(cursor>=sequence.length){stop();mark();return}mark();const {n,d}=sequence[cursor];const duration=480*d;const id='demo'+cursor;sound(n,id);
// Give the key time to rise before the next attack, including repeated notes.
// The note onset interval stays unchanged, so this does not slow the melody.
const liftGap=Math.min(110,duration*.3);
releaseTimer=setTimeout(()=>{if(playing&&generation===playGeneration)release(id)},duration-liftGap);
timer=setTimeout(()=>{cursor++;step()},duration)}step()};
$('help').onclick=()=>$('guide').showModal();$('close-guide').onclick=$('start').onclick=()=>$('guide').close();$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close()}});

$('prev-phrase').onclick=()=>jumpPhrase(currentPhrase()-1);
$('next-phrase').onclick=()=>jumpPhrase(currentPhrase()+1);
$('view-full-score').onclick=()=>{stop();cancelInput();$('full-score-title').textContent=songs[selected].title;$('full-score').showModal()};
$('close-full-score').onclick=()=>$('full-score').close();
document.querySelectorAll('a[href="songs.html"]').forEach(link=>link.addEventListener('click',()=>{stop();cancelInput();savePractice()}));
let saved;try{saved=JSON.parse(sessionStorage.getItem('seven-piano-practice'))}catch{}
const params=new URLSearchParams(location.search),requested=params.get('song');
const songIndex=songs.findIndex(song=>song.id===(requested||saved?.song));
choose(songIndex<0?0:songIndex);
if(!requested&&saved?.song===songs[selected].id&&Number.isInteger(saved.cursor))cursor=Math.max(0,Math.min(sequence.length,saved.cursor));
setFreePlay(!requested&&saved?.freePlay===true);
window.addEventListener('pagehide',()=>{stop();cancelInput();savePractice()});
loadSamples();


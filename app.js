const buffers=[];
let samplesReady=false;
const syllables=['do','re','mi','fa','sol','la','si'];
const songs=[
{title:'小星星',sub:'从最熟悉的旋律开始',phrases:['1 1 5 5 6 6 5:2','4 4 3 3 2 2 1:2','5 5 4 4 3 3 2:2','5 5 4 4 3 3 2:2','1 1 5 5 6 6 5:2','4 4 3 3 2 2 1:2']},
{title:'欢乐颂',sub:'让快乐多一点',phrases:['3 3 4 5','5 4 3 2','1 1 2 3','3:1.5 2:0.5 2:2','3 3 4 5','5 4 3 2','1 1 2 3','2:1.5 1:0.5 1:2']},
{title:'玛丽有只小羊羔',sub:'一首轻快的小曲',phrases:['3 2 1 2','3 3 3:2','2 2 2:2','3 5 5:2','3 2 1 2','3 3 3 3','2 2 3 2','1:4']}
];
let context,master,selected=0,cursor=0,sequence=[],playing=false,timer,playGeneration=0;
const voices=new Map();
const $=id=>document.getElementById(id);
function audio(){if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=$('volume').value/100*.65;master.connect(context.destination)}if(context.state==='suspended')context.resume();return context}
function sound(n,id){if(!samplesReady||voices.has(id))return;const ctx=audio(),t=ctx.currentTime;
const gain=ctx.createGain();gain.gain.setValueAtTime(.85,t);gain.connect(master);
const source=ctx.createBufferSource();source.buffer=buffers[n-1];source.connect(gain);source.start(t);
const voice={gain,source,n,started:t};voices.set(id,voice);
source.onended=()=>{source.disconnect();gain.disconnect();if(voices.get(id)===voice){voices.delete(id);if(![...voices.values()].some(v=>v.n===n))document.querySelector(`[data-key="${n}"]`).classList.remove('active')}};
document.querySelector(`[data-key="${n}"]`).classList.add('active');$('played').textContent=`${n} · ${syllables[n-1]} — 好听，再来一个。`}
function release(id){const voice=voices.get(id);if(!voice)return;const t=Math.max(context.currentTime,voice.started+.12);
// Keep the hammer attack intact on quick taps, then let the damper fade the string.
voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setValueAtTime(.85,t);voice.gain.gain.exponentialRampToValueAtTime(.0001,t+.55);voice.source.stop(t+.6);voices.delete(id);if(![...voices.values()].some(v=>v.n===voice.n))document.querySelector(`[data-key="${voice.n}"]`).classList.remove('active')}
async function loadSamples(){
const controls=[...document.querySelectorAll('.key'),$('listen')];controls.forEach(e=>e.disabled=true);$('audio-status').textContent='正在准备钢琴…';
try{const ctx=audio();const decoded=await Promise.all(PIANO_SAMPLES.map(data=>{const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));return ctx.decodeAudioData(bytes.buffer)}));buffers.push(...decoded);samplesReady=true;controls.forEach(e=>e.disabled=false);$('audio-status').textContent='原声钢琴';}
catch(error){$('audio-status').textContent='音色加载失败，请刷新重试';console.error('Piano sample decoding failed',error)}
}
function mark(){document.querySelectorAll('.score-note[data-index]').forEach(e=>{const i=+e.dataset.index;e.classList.toggle('current',i===cursor);e.classList.toggle('done',i<cursor)});document.querySelectorAll('.key').forEach(e=>e.classList.toggle('expected',+e.dataset.key===sequence[cursor]?.n));$('progress').textContent=cursor===sequence.length?'弹完啦！你的快乐，已经有声音了。':cursor===0?'跟着橙色数字，弹出第一句':`已经弹了 ${cursor} / ${sequence.length} 个音，继续呀`}
function press(n,id){if(!samplesReady)return;if(playing)stop();sound(n,id);if(cursor<sequence.length&&sequence[cursor].n===n){cursor++;mark()}}
function stop(){playing=false;playGeneration++;clearTimeout(timer);[...voices.keys()].filter(id=>id.startsWith('demo')).forEach(release);$('listen').textContent='▶ 听一听'}
function choose(i){stop();selected=i;cursor=0;sequence=[];$('song-title').textContent=songs[i].title;$('score').innerHTML=songs[i].phrases.map(phrase=>'<div class="phrase">'+phrase.split(' ').map(token=>{let [n,d=1]=token.split(':').map(Number);const index=sequence.length;sequence.push({n,d});return `<span class="score-note ${d<1?'half':''}" data-index="${index}">${n}${d===1.5?'<small>·</small>':''}</span>`+'<span class="score-note dash">−</span>'.repeat(Math.max(0,Math.floor(d)-1))}).join('')+'</div>').join('');document.querySelectorAll('.song').forEach((e,j)=>{e.classList.toggle('selected',i===j);e.setAttribute('aria-pressed',i===j)});mark()}
$('keys').innerHTML=syllables.map((s,i)=>`<button class="key" data-key="${i+1}" aria-label="${i+1} ${s}"><span class="letter">${'CDEFGAB'[i]}</span><span class="note">${i+1}</span><span class="solfege">${s}</span></button>`).join('');
document.querySelectorAll('.key').forEach(key=>{key.addEventListener('pointerdown',e=>{e.preventDefault();key.setPointerCapture(e.pointerId);press(+key.dataset.key,'pointer'+e.pointerId)});for(const event of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(event,e=>release('pointer'+e.pointerId));key.addEventListener('click',e=>{if(e.detail===0){let id='assist'+key.dataset.key;press(+key.dataset.key,id);setTimeout(()=>release(id),250)}})});
window.addEventListener('keydown',e=>{if(e.repeat||e.metaKey||e.ctrlKey||e.altKey||$('guide').open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(/^[1-7]$/.test(e.key)){e.preventDefault();press(+e.key,'keyboard'+e.code)}});
window.addEventListener('keyup',e=>release('keyboard'+e.code));window.addEventListener('blur',()=>{stop();[...voices.keys()].forEach(release)});document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();[...voices.keys()].forEach(release)}});
$('volume').addEventListener('input',()=>{if(master)master.gain.setTargetAtTime($('volume').value/100*.65,context.currentTime,.02)});
$('songs').innerHTML=songs.map((song,i)=>`<button class="song" data-song="${i}"><span class="song-index">0${i+1}</span><span class="song-name">${song.title}<span class="song-sub">${song.sub}</span></span><span class="song-arrow">↗</span></button>`).join('');document.querySelectorAll('.song').forEach(e=>e.onclick=()=>choose(+e.dataset.song));
$('restart').onclick=()=>{stop();cursor=0;mark()};
$('listen').onclick=async()=>{if(playing){stop();return}audio();playing=true;const generation=++playGeneration;await context.resume();if(!playing||generation!==playGeneration)return;cursor=0;$('listen').textContent='■ 停止试听';function step(){if(!playing||generation!==playGeneration)return;if(cursor>=sequence.length){stop();mark();return}mark();const {n,d}=sequence[cursor];const duration=480*d/+$('speed').value;const id='demo'+cursor;sound(n,id);timer=setTimeout(()=>{release(id);cursor++;step()},duration)}step()};
$('help').onclick=()=>$('guide').showModal();$('close-guide').onclick=$('start').onclick=()=>$('guide').close();$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close()}});choose(0);

loadSamples();

/* ===== 手で おす（生命の 部屋で 共通） =====
   カメラの 手を 画面 ぜんたいの「しるし（わ）」に うつす。ボタンの 上で 手を とめると、わが みちて おせる。
   星ざ・社会地図の「とめて おす」と 同じ 考え。タップや マウスは そのまま つかえる（どっちでも できる）。
   つかい方：
     RsTe.point(nx,ny,box)  … カメラの 中の 位置（0〜1・かがみの むき）。null で しるしを けす
     RsTe.startHand({onPoint, onLost}) … カメラと 手の トラッキングを はじめる（人さし指の 先＝しるし）
     RsTe.stop()            … 手を やめる
     RsTe.cur               … いまの しるしの 位置（画面の px）
*/
(function(){
  const DWELL=1100;                 // とめて おすまでの 時間（ミリ秒）
  const BOX=[0.1,0.1,0.9,0.9];      // カメラの この はんいを 画面 ぜんたいに 広げる（はしまで とどくように）
  const SM=0.5;
  const cv=document.createElement('canvas'); cv.className='rs-te'; cv.setAttribute('aria-hidden','true');
  cv.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60';
  const tip=document.createElement('div'); tip.className='rs-te-tip'; tip.hidden=true;
  tip.style.cssText='position:fixed;left:50%;top:8px;transform:translateX(-50%);z-index:61;pointer-events:none;background:#fff;border:2px solid var(--rl-ink,#1f2937);border-radius:22px;padding:8px 16px;font-size:16px;font-weight:700;color:var(--rl-ink,#1f2937);white-space:nowrap';
  const st=document.createElement('style');
  st.textContent='.rs-te-near{box-shadow:inset 0 0 0 4px var(--rl-accent,#23784a)!important}#rsTeBtn[aria-pressed="true"]{background:var(--rl-accent,#23784a);color:#fff;border-color:var(--rl-accent,#23784a)}';
  const g=cv.getContext('2d');
  function size(){ const d=window.devicePixelRatio||1; cv.width=innerWidth*d; cv.height=innerHeight*d; g.setTransform(d,0,0,d,0,0); }
  function mount(){ document.head.appendChild(st); document.body.appendChild(cv); document.body.appendChild(tip); size(); }
  if(document.body) mount(); else document.addEventListener('DOMContentLoaded',mount);
  addEventListener('resize',size);
  const T={cur:null, el:null, t0:0, done:false, on:false, dwell:DWELL, clicks:0};
  const cl=v=>Math.max(0,Math.min(1,v));
  T.point=function(nx,ny,box){
    if(nx==null){ T.cur=null; return null; }
    const b=box||BOX, x=cl((nx-b[0])/(b[2]-b[0]))*innerWidth, y=cl((ny-b[1])/(b[3]-b[1]))*innerHeight;
    if(!T.cur) T.cur={x,y}; else { T.cur.x+=(x-T.cur.x)*SM; T.cur.y+=(y-T.cur.y)*SM; }
    return T.cur;
  };
  T.say=function(t){ tip.hidden=!t; if(t && tip.textContent!==t) tip.textContent=t; };
  function target(){
    const c=T.cur; if(!c) return null;
    const e=document.elementFromPoint(c.x,c.y), b=e&&e.closest&&e.closest('button');
    return b && !b.disabled && b.offsetParent && !b.closest('[hidden]') ? b : null;
  }
  function frame(now){
    requestAnimationFrame(frame);
    g.clearRect(0,0,innerWidth,innerHeight);
    const c=T.cur;
    // おした あとは、手が すこし はなれるまで つぎを おさない（書きかわる ボタンで 2回 おさない）
    if(T.lock && (!c || Math.hypot(c.x-T.lock.x,c.y-T.lock.y)>40)) T.lock=null;
    const el=T.lock?null:target();
    if(el!==T.el){ if(T.el) T.el.classList.remove('rs-te-near'); T.el=el; T.t0=now; T.done=false; if(el) el.classList.add('rs-te-near'); }
    let prog=0;
    if(el && !T.done){ prog=Math.min(1,(now-T.t0)/T.dwell); if(prog>=1){ T.done=true; T.clicks++; T.lock={x:c.x,y:c.y}; el.click(); } }
    if(!c) return;
    const R=Math.max(20,Math.min(innerWidth,innerHeight)*0.035);
    const ink=getComputedStyle(document.documentElement).getPropertyValue('--rl-ink').trim()||'#1f2937';
    const acc=getComputedStyle(document.documentElement).getPropertyValue('--rl-accent').trim()||'#23784a';
    g.lineWidth=7; g.strokeStyle='#fff'; g.beginPath(); g.arc(c.x,c.y,R,0,7); g.stroke();
    g.lineWidth=3; g.strokeStyle=ink; g.beginPath(); g.arc(c.x,c.y,R,0,7); g.stroke();
    g.fillStyle=ink; g.beginPath(); g.arc(c.x,c.y,4,0,7); g.fill();
    // みちる わ：こい ふちの 上に 部屋の 色（黄など うすい 色でも 白地で 見える）
    if(prog>0 && !T.done){ g.lineCap='round'; const a1=-Math.PI/2+prog*Math.PI*2;
      g.lineWidth=11; g.strokeStyle=ink; g.beginPath(); g.arc(c.x,c.y,R+8,-Math.PI/2,a1); g.stroke();
      g.lineWidth=6; g.strokeStyle=acc; g.beginPath(); g.arc(c.x,c.y,R+8,-Math.PI/2,a1); g.stroke(); }
  }
  requestAnimationFrame(frame);

  /* ---- 手の トラッキング（人さし指の 先） ---- */
  const VER='0.10.14';
  let hands=null, video=null, stream=null, lastT=-1, onPoint=null, onLost=null, seen=0;
  async function load(){
    const vision=await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`);
    const fs=await vision.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`);
    const o=d=>({baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:d},runningMode:'VIDEO',numHands:1});
    try{ return await vision.HandLandmarker.createFromOptions(fs,o('GPU')); }
    catch(e){ return await vision.HandLandmarker.createFromOptions(fs,o('CPU')); }
  }
  T.errText=function(e){
    return e&&e.name==='NoCamPage' ? 'この ひらきかたでは カメラが つかえません。Chrome で ひらいてね。'
      : e&&(e.name==='NotFoundError'||e.name==='NotReadableError') ? 'カメラが みつかりません。ほかの アプリで つかっていないか みてね。'
      : e&&e.name==='NotAllowedError' ? 'カメラが つかえません。先生に カメラを ゆるして もらってね。'
      : 'じゅんびが できませんでした。インターネットに つながっているか みてね。';
  };
  T.startHand=async function(opt){
    opt=opt||{}; onPoint=opt.onPoint||null; onLost=opt.onLost||null; opt_hint=opt.hint!=null?opt.hint:'人さし指を カメラに 見せてね';
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ const e=new Error(); e.name='NoCamPage'; throw e; }
    if(!video){ video=document.createElement('video'); video.playsInline=true; video.muted=true; video.setAttribute('playsinline','');
      video.style.cssText='position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none'; document.body.appendChild(video); }
    stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:960},height:{ideal:540},facingMode:'user'},audio:false});
    video.srcObject=stream; await video.play();
    hands=hands||await load();
    T.on=true; T.video=video; seen=performance.now(); requestAnimationFrame(track);
    return video;
  };
  function track(){
    if(!T.on) return;
    requestAnimationFrame(track);
    if(!hands||video.readyState<2||video.currentTime===lastT) return;
    lastT=video.currentTime;
    const now=performance.now(), r=hands.detectForVideo(video,now), L=(r.landmarks||[])[0];
    if(L){ seen=now; const c=T.point(1-L[8].x, L[8].y); T.say(''); if(onPoint) onPoint(c); }
    else { T.point(null); if(onPoint) onPoint(null); if(now-seen>1200 && opt_hint) T.say(opt_hint); if(onLost) onLost(); }
  }
  let opt_hint='人さし指を カメラに 見せてね';
  T.stop=function(){ T.on=false; T.point(null); T.say(''); if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } if(onPoint) onPoint(null); };
  // 「手で」ボタン：おすと カメラの 手が はじまる。もう いちど おすと やめる
  T.bindButton=function(btn,opt){
    btn.setAttribute('aria-pressed','false');
    btn.addEventListener('click',async()=>{
      if(T.on){ T.stop(); btn.setAttribute('aria-pressed','false'); return; }
      btn.disabled=true; T.say('じゅんびちゅう…');
      try{ await T.startHand(opt); btn.setAttribute('aria-pressed','true'); T.say(''); }
      catch(e){ T.say(T.errText(e)); setTimeout(()=>T.say(''),5000); }
      finally{ btn.disabled=false; }
    });
  };
  window.RsTe=T;
})();

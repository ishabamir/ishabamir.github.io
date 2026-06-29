(function(){
  var L = window.L || {};
  var ctx = null;
  function AC(){ if(!ctx){ var K = window.AudioContext||window.webkitAudioContext; ctx = new K(); }
    if(ctx.state==='suspended'){ ctx.resume(); } return ctx; }
  function $(id){ return document.getElementById(id); }
  function setTxt(id,t){ var e=$(id); if(e) e.textContent=t; }

  // 1) left / right channel test
  var lr=null;
  function stopLR(){ if(lr){ try{lr.o.stop();}catch(e){} try{lr.o.disconnect();}catch(e){} lr=null; } setTxt('lrstate', L.idle||''); }
  function playSide(side){
    stopLR(); var c=AC(); var o=c.createOscillator(); var g=c.createGain();
    o.type='sine'; o.frequency.value=440; g.gain.value=0; o.connect(g);
    if(c.createStereoPanner){ var p=c.createStereoPanner(); p.pan.value=(side==='left')?-1:(side==='right')?1:0; g.connect(p); p.connect(c.destination); }
    else { var m=c.createChannelMerger(2); var z=c.createGain(); z.gain.value=0; o.connect(z);
      if(side==='left'){ g.connect(m,0,0); z.connect(m,0,1);} else if(side==='right'){ z.connect(m,0,0); g.connect(m,0,1);} else { g.connect(m,0,0); g.connect(m,0,1);} m.connect(c.destination); }
    o.start(); var t=c.currentTime; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.13,t+0.02); lr={o:o};
    var name=(side==='left')?(L.left||'L'):(side==='right')?(L.right||'R'):(L.both||'L+R');
    setTxt('lrstate',(L.playing||'Playing')+': '+name);
  }

  // 2) frequency sweep 20 -> 20000 Hz
  var sw=null;
  function stopSweep(){ if(sw){ try{sw.o.stop();}catch(e){} try{sw.o.disconnect();}catch(e){} if(sw.raf)cancelAnimationFrame(sw.raf); sw=null; } setTxt('sweepstate',L.idle||''); }
  function startSweep(){
    stopSweep(); var c=AC(); var o=c.createOscillator(); var g=c.createGain();
    var f0=20,f1=20000,dur=25,t0=c.currentTime; o.type='sine';
    o.frequency.setValueAtTime(f0,t0); o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.12,t0+0.05);
    g.gain.setValueAtTime(0.12,t0+dur-0.3); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(c.destination); o.start(); var start=performance.now();
    function tick(){ var el=(performance.now()-start)/1000; if(!sw){return;} if(el>=dur){ stopSweep(); return; }
      var f=f0*Math.pow(f1/f0, el/dur); setTxt('sweephz', Math.round(f)+' Hz'); sw.raf=requestAnimationFrame(tick); }
    sw={o:o,raf:requestAnimationFrame(tick)}; setTxt('sweepstate', L.sweeping||'Sweeping…');
  }

  // 3) BPM tap
  var taps=[];
  function tap(){ var t=performance.now(); taps.push(t); if(taps.length>16) taps.shift();
    if(taps.length>=2){ var s=0; for(var i=1;i<taps.length;i++) s+=taps[i]-taps[i-1];
      var bpm=Math.round(60000/(s/(taps.length-1))); setTxt('bpmval', bpm+' '+(L.bpm||'BPM')); }
    else { setTxt('bpmval', L.taps||'…'); } }
  function resetBpm(){ taps=[]; setTxt('bpmval','—'); }

  function on(id,fn){ var e=$(id); if(e) e.addEventListener('click',fn); }
  function wire(){
    on('lr-left',function(){playSide('left');}); on('lr-right',function(){playSide('right');});
    on('lr-both',function(){playSide('both');}); on('lr-stop',stopLR);
    on('sweep-start',startSweep); on('sweep-stop',stopSweep);
    on('bpm-tap',tap); on('bpm-reset',resetBpm);
    document.addEventListener('keydown',function(e){ if((e.code==='Space'||e.key===' ') && document.activeElement && document.activeElement.id==='bpm-tap'){ e.preventDefault(); tap(); } });
  }
  if(document.readyState!=='loading') wire(); else document.addEventListener('DOMContentLoaded',wire);
})();

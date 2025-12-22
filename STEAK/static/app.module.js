// ES module to add animations and micro-interactions
// Imports from CDN (safe for browsers). If you prefer local node_modules, run `npm install` and bundle.
import anime from 'https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.es.js';
import { Howl } from 'https://cdn.jsdelivr.net/npm/howler@2.2.3/dist/howler.esm.js';

const prefs = { prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };

function headerEntrance(){
  if(prefs.prefersReducedMotion) return;
  anime.timeline({loop:false})
    .add({targets:'.logo',translateY:[-18,0],opacity:[0,1],duration:700,easing:'easeOutQuad'})
    .add({targets:'.site-title',translateX:[-10,0],opacity:[0,1],duration:520,easing:'easeOutQuad'},'-=420')
    .add({targets:'.site-sub',opacity:[0,1],translateY:[6,0],duration:520,easing:'easeOutQuad'},'-=420');
}

function hookButtons(){
  document.querySelectorAll('.btn').forEach(btn=>{
    btn.addEventListener('pointerenter',()=>{
      anime({targets:btn,scale:1.03,duration:220,easing:'spring(1,80,10,0)'});
    });
    btn.addEventListener('pointerleave',()=>{
      anime({targets:btn,scale:1,duration:220,easing:'easeOutQuad'});
    });
  });
}

function tinySound(){
  try {
    const s = new Howl({
      src: ['https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg'],
      volume:0.25
    });
    return s;
  } catch(e){return null}
}

function heroPulse(){
  const hero = document.querySelector('.logo');
  if(!hero || prefs.prefersReducedMotion) return;
  anime({targets:hero,scale:[1,1.04],direction:'alternate',easing:'easeInOutSine',duration:4000,loop:true});
}

function attachGalleryHover(){
  document.querySelectorAll('.photo').forEach((el,i)=>{
    el.addEventListener('click',()=>{
      const img = el.querySelector('img');
      if(!img) return;
      const src = img.src;
      const preview = document.querySelector('.preview-img');
      if(preview) preview.src = src;
      anime({targets:el,scale:1.03,duration:260,easing:'easeOutCubic'});
    });
  });
}

function init404Canvas(){
  const canvas = document.createElement('canvas');
  canvas.className='bg-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let w,h; const particles = [];
  function resize(){w=canvas.width=innerWidth;h=canvas.height=innerHeight}
  window.addEventListener('resize',resize);resize();
  function spawn(){
    particles.push({x:Math.random()*w,y:h+20,vy:-1 - Math.random()*1.5, r:4+Math.random()*12, a:0.6*Math.random()+0.2, hue:40+Math.random()*40});
  }
  for(let i=0;i<24;i++) spawn();
  function loop(){
    ctx.clearRect(0,0,w,h);
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];
      p.y+=p.vy; p.x+=Math.sin(p.y*0.01)*0.4;
      ctx.beginPath(); ctx.fillStyle=`hsla(${p.hue},70%,60%,${p.a})`;
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      if(p.y+p.r< -40){particles.splice(i,1);spawn()}
    }
    requestAnimationFrame(loop);
  }
  loop();
}

function init(){
  headerEntrance();
  hookButtons();
  heroPulse();
  attachGalleryHover();
  const sound = tinySound();
  // play a tiny startup blip on user interaction
  window.addEventListener('pointerdown',function once(){
    if(sound) sound.play(); window.removeEventListener('pointerdown',once);
  });

  if(document.body.classList.contains('page-404')){
    init404Canvas();
  }
}

// run when DOM ready
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();


const b=document.getElementById('burger'),m=document.getElementById('mobile');
if(b){b.addEventListener('click',()=>{const o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)});}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

// Copy buttons (donate)
document.querySelectorAll('.copy').forEach(btn=>btn.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(btn.dataset.copy);btn.textContent='Copied';btn.classList.add('done');
  setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('done')},1800)}catch(e){btn.textContent='Select';}
}));

// Berean impact calculator
const amt=document.getElementById('amt');
if(amt){
  const bib=document.getElementById('bibles'),nts=document.getElementById('nts'),btns=document.querySelectorAll('#amounts button');
  const upd=()=>{const v=Math.max(0,parseFloat(amt.value)||0);const n=Math.floor(v/10);bib.textContent=n;nts.textContent=n*3;
    btns.forEach(x=>x.classList.toggle('on',+x.dataset.v===v));};
  btns.forEach(x=>x.addEventListener('click',()=>{amt.value=x.dataset.v;upd();}));
  amt.addEventListener('input',upd);upd();
}

// Berean calculator -> carry chosen amount to the Donate page
(function(){
  const link=document.getElementById('berean-give'),lab=document.getElementById('berean-give-label'),amt=document.getElementById('amt');
  if(!link||!amt)return;
  const sync=()=>{const v=Math.max(0,Math.round(parseFloat(amt.value)||0));
    if(v>0){link.href='donate?amount='+v+'&fund=berean#give-online';lab.textContent='Give $'+v.toLocaleString('en-US')+' to the Berean Project';}
    else{link.href='donate#give-online';lab.textContent='Give to the Berean Project';}};
  amt.addEventListener('input',sync);
  document.querySelectorAll('#amounts button').forEach(b=>b.addEventListener('click',()=>setTimeout(sync,0)));
  sync();
})();

// Donate page: show the amount chosen elsewhere (Zeffy can't be pre-filled)
(function(){
  const bn=document.getElementById('gift-banner');if(!bn)return;
  const q=new URLSearchParams(location.search);
  const v=Math.round(parseFloat(q.get('amount')));
  if(!(v>0&&v<=100000))return;
  const FUNDS={berean:'for the Berean Project'};
  const fund=FUNDS[q.get('fund')]||'';
  const pretty='$'+v.toLocaleString('en-US');
  document.getElementById('gb-amt').textContent=pretty;
  document.getElementById('gb-title').textContent='Your gift'+(fund?' '+fund:'')+': '+pretty;
  document.getElementById('gb-num').textContent=String(v);
  const c=document.getElementById('gb-copy');
  c.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(String(v));c.textContent='Copied';c.classList.add('done');setTimeout(()=>{c.textContent='Copy';c.classList.remove('done')},1800)}catch(e){c.textContent=String(v)}});
  bn.hidden=false;
})();

// Interactive country map
const card=document.getElementById('map-card');
if(card){
  const tip=document.getElementById('map-tip'),tb=tip.querySelector('b'),ts=tip.querySelector('span');
  let cur=null;
  const show=c=>{
    if(cur===c)return; hide(); cur=c;
    document.querySelectorAll(`[data-c="${c}"]`).forEach(el=>el.classList.add('hl'));
    const pin=card.querySelector(`.pin[data-c="${c}"]`);
    const r=pin.querySelector('.core').getBoundingClientRect(),cr=card.getBoundingClientRect();
    tb.textContent=pin.dataset.name; ts.textContent=pin.dataset.sub;
    let x=r.left+r.width/2-cr.left; const w=tip.offsetWidth/2+8;
    x=Math.min(Math.max(x,w),cr.width-w);
    tip.style.left=x+'px'; tip.style.top=(r.top-cr.top)+'px'; tip.classList.add('show');
  };
  const hide=()=>{ if(!cur)return; document.querySelectorAll('.hl[data-c]').forEach(el=>el.classList.remove('hl')); tip.classList.remove('show'); cur=null; };
  // Hover only for a real mouse; taps toggle via click; focus only for keyboard.
  let ptr='mouse';
  document.addEventListener('pointerdown',e=>{ptr=e.pointerType||'mouse';},true);
  document.querySelectorAll('[data-c]').forEach(el=>{
    const c=el.dataset.c;
    el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')show(c);});
    el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')hide();});
    el.addEventListener('focus',()=>{if(el.matches(':focus-visible'))show(c);});
    el.addEventListener('blur',()=>{if(cur===c&&ptr!=='touch')hide();});
    el.addEventListener('click',e=>{e.stopPropagation();
      if(ptr==='mouse'&&e.detail>0){show(c);return;}
      cur===c?hide():show(c);});
  });
  document.addEventListener('click',hide);
  addEventListener('resize',hide);
}

// Contact form -> email draft
const cf=document.getElementById('contact-form');
if(cf){cf.addEventListener('submit',e=>{e.preventDefault();
  const g=id=>document.getElementById(id).value;
  const subject=`${g('f-topic')} from ${g('f-name')}`;
  const body=`${g('f-msg')}\n\n${g('f-name')}\n${g('f-email')}`;
  location.href=`mailto:info@icpfint.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});}

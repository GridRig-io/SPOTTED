/* Spotted shared helpers (no data access here: see db.js). */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₦'+Number(n).toLocaleString('en-NG');
const slugify=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30);
const SLUG_RE=/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const S={
  domain:'yourdomain.com',                 // change to your real domain
  media:{heroVideo:'assets/hero.mp4'},     // optional hero clip (e.g. from Higgsfield)
  colors:['#2F6B4F','#F9A77F','#5F8F74','#9AA59E','#C84B05'],
  stages:['identified','invited','claimed','onboarded','declined'],
  unclaimed:p=>p.stage==='identified'||p.stage==='invited',
  visible:p=>p.stage==='onboarded'||p.stage==='identified'||p.stage==='invited',
  color(p){return this.colors[[...p.slug].reduce((a,c)=>a+c.charCodeAt(0),0)%this.colors.length]},
  live:p=>(p.rooms||[]).filter(r=>r.status==='approved'),
  from(p){const m=S.live(p).map(x=>x.price);return m.length?'From '+money(Math.min(...m)):'Not yet claimed'}
};
const PIN='<svg class="pin" viewBox="0 0 60 80" aria-hidden="true"><path fill-rule="evenodd" d="M30 2C14 2 2 14 2 30c0 22 28 48 28 48s28-26 28-48C58 14 46 2 30 2zm0 20a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/></svg>';
function toast(m){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3600)}
function currentPage(){return location.pathname.split('/').pop()+location.search}
function cover(p){const r=S.live(p).find(x=>x.photos&&x.photos.length);return r?r.photos[0]:''}
function photo(p){const c=cover(p);return `<div class="ph" style="background:${S.color(p)}">${c?`<img src="${esc(c)}" alt="" loading="lazy">`:''}</div>`}
function placeCard(p,saved){const un=S.unclaimed(p),on=saved.has(p.id);
  return `<a class="card" href="place.html?s=${esc(p.slug)}">${photo(p)}<button class="heart ${on?'on':''}" data-save="${esc(p.id)}" aria-label="Save ${esc(p.name)}" aria-pressed="${on}">${on?'♥':'♡'}</button><div class="info"><h3>${esc(p.name)}</h3><p>${esc(p.area)} · ${S.from(p)}</p>${un?'<span class="chip warn">Unclaimed</span>':''}</div></a>`}
function bindSave(root,saved,redraw){root.addEventListener('click',async e=>{const b=e.target.closest('[data-save]');if(!b)return;e.preventDefault();
  const me=await DB.me();
  if(!me){toast('Sign in to save places');setTimeout(()=>location.href='login.html?next='+encodeURIComponent(currentPage()),900);return}
  const id=b.dataset.save,on=!saved.has(id);b.disabled=true;
  try{await DB.toggleSave(id,on);on?saved.add(id):saved.delete(id);toast(on?'Saved to your places':'Removed from saved')}catch(err){toast(DB.msg(err))}
  redraw()})}
function needLogin(el,why){el.innerHTML=`<div class="panel" style="max-width:520px"><h2 style="margin-bottom:8px">Sign in to continue</h2><p class="muted" style="margin-bottom:16px">${esc(why)}</p><a class="btn" href="login.html?next=${encodeURIComponent(currentPage())}">Sign in or create account</a></div>`}

/* Spotted shared code: demo data store (localStorage), header, helpers.
   FRONT-END DEMO ONLY. Real accounts, payments and security need a backend. */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₦'+Number(n).toLocaleString('en-NG');
const slugify=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30);
const S={
  key:'spotted:v1',
  domain:'yourdomain.com',                 // change to your real domain
  reserved:['www','admin','app','api','mail','owner','spotted'],
  media:{heroVideo:'assets/hero.mp4'},     // Higgsfield clip; place photos go in assets/places/<slug>.jpg
  colors:['#2F6B4F','#F9A77F','#5F8F74','#9AA59E','#C84B05'],
  stages:['identified','invited','claimed','onboarded','declined'],
  seed(){const r=(id,name,price,per,photos,am,status='approved')=>({id,name,price,per,photos,am,status});
    return{session:null,saved:[],been:[],places:[
      {slug:'warm-stays',name:'Warm Stays',area:'Wuse 2',stage:'onboarded',owner:'Demo owner',reviews:[],rooms:[r(1,'Warm 2-bed off Aminu Kano',52000,'night',6,['light','water','internet'])]},
      {slug:'asokoro-view',name:'Asokoro View',area:'Asokoro',stage:'onboarded',owner:'Demo owner',reviews:[],rooms:[r(2,'Studio with city view',38000,'night',5,['light','water'])]},
      {slug:'maitama-loft',name:'Maitama Loft',area:'Maitama',stage:'onboarded',owner:'Demo owner',reviews:[],rooms:[r(3,'Loft flat, snug beds',41000,'night',7,['light','water','internet','security'])]},
      {slug:'garden-court',name:'Garden Court Guest House',area:'Jabi',stage:'invited',owner:'',reviews:[],rooms:[]},
      {slug:'gwarinpa-cosy',name:'Gwarinpa Cosy Flats',area:'Gwarinpa',stage:'claimed',owner:'Mrs Ade',reviews:[],rooms:[r(4,'Cosy 1-bed',30000,'month',6,['light','water'],'pending')]}]}},
  load(){try{const d=JSON.parse(localStorage.getItem(this.key));if(d)return d}catch(e){}const d=this.seed();this.save(d);return d},
  save(d){try{localStorage.setItem(this.key,JSON.stringify(d))}catch(e){}},
  unclaimed:p=>p.stage==='identified'||p.stage==='invited',
  visible:p=>p.stage==='onboarded'||p.stage==='identified'||p.stage==='invited',
  color(p){return this.colors[[...p.slug].reduce((a,c)=>a+c.charCodeAt(0),0)%this.colors.length]},
  from(p){const m=p.rooms.filter(x=>x.status==='approved').map(x=>x.price);return m.length?'From '+money(Math.min(...m)):'Not yet claimed'}
};
const PIN='<svg class="pin" viewBox="0 0 60 80" aria-hidden="true"><path fill-rule="evenodd" d="M30 2C14 2 2 14 2 30c0 22 28 48 28 48s28-26 28-48C58 14 46 2 30 2zm0 20a10 10 0 1 1 0 20 10 10 0 0 1 0-20z"/></svg>';
function toast(m){const t=document.createElement('div');t.className='toast';t.setAttribute('role','status');t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),3200)}
function photo(p){return `<div class="ph" style="background:${S.color(p)}"><img src="assets/places/${esc(p.slug)}.jpg" alt="" loading="lazy" onerror="this.remove()"></div>`}
function placeCard(p,d){const un=S.unclaimed(p),on=d.saved.includes(p.slug);
  return `<a class="card" href="place.html?s=${esc(p.slug)}">${photo(p)}<button class="heart ${on?'on':''}" data-save="${esc(p.slug)}" aria-label="Save ${esc(p.name)}" aria-pressed="${on}">${on?'♥':'♡'}</button><div class="info"><h3>${esc(p.name)}</h3><p>${esc(p.area)} · ${S.from(p)}</p>${un?'<span class="chip warn">Unclaimed</span>':''}</div></a>`}
function bindSave(root,d,redraw){root.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;e.preventDefault();const s=b.dataset.save,i=d.saved.indexOf(s);i<0?d.saved.push(s):d.saved.splice(i,1);S.save(d);toast(i<0?'Saved to your places':'Removed from saved');redraw()})}
(function(){const h=$('#hdr');if(!h)return;const s=S.load().session,o=s&&s.role==='owner',page=location.pathname.split('/').pop().replace('.html','')||'index';
  const L=[['explore','Explore','explore.html'],['account','Saved','account.html'],[o?'owner':'signup',o?'Dashboard':'List your place',o?'owner.html':'signup.html']];
  h.innerHTML=`<header class="nav"><div class="wrap"><a class="brand" href="index.html" aria-label="Spotted home">sp${PIN}tted</a><nav aria-label="Main"><ul>${L.map(l=>`<li><a href="${l[2]}" class="${page===l[0]?'on':''}">${l[1]}</a></li>`).join('')}</ul></nav></div></header>`})();

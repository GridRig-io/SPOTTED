/* DEMO ONLY: this access-code check runs in the browser and is NOT real security.
   Replace with a real login + 2FA on a backend before any real use. */
const d=S.load(),m=$('#main'),CODE='spotted-admin';
if(sessionStorage.getItem('adm')==='1')draw();else gate();
function gate(){m.innerHTML='<div class="panel" style="max-width:420px;margin:0 auto"><h2 style="margin-bottom:14px">Super admin</h2><form id="g"><div class="field"><label for="c">Access code</label><input id="c" type="password" autocomplete="off"></div><p id="ge" role="alert" class="err"></p><button class="btn">Enter</button></form></div>';
  $('#g').onsubmit=e=>{e.preventDefault();if($('#c').value===CODE){sessionStorage.setItem('adm','1');draw()}else $('#ge').textContent='Wrong code. Try again.'}}
function draw(){const pend=[];d.places.forEach(p=>p.rooms.filter(r=>r.status==='pending').forEach(r=>pend.push([p,r])));const cl=d.places.filter(p=>p.stage==='claimed');
  m.innerHTML=`<div class="head"><h2>Super admin</h2></div>
  <div class="stats"><div class="stat"><span class="muted">Rooms pending</span><b>${pend.length}</b></div><div class="stat"><span class="muted">Claims to verify</span><b>${cl.length}</b></div><div class="stat"><span class="muted">Live places</span><b>${d.places.filter(p=>p.stage==='onboarded').length}</b></div></div>
  <div class="panel"><h3 style="margin-bottom:8px">Review queue</h3>${pend.length||cl.length?`<table><tr><th>Item</th><th>Owner</th><th>Detail</th><th>Action</th></tr>
  ${pend.map(([p,r])=>`<tr><td>${esc(r.name)}<br><span class="muted">${esc(p.name)}</span></td><td>${esc(p.owner||'-')}</td><td>${money(r.price)} / ${esc(r.per)} · ${r.photos} photos${r.photos<5?' <span class="chip bad">under 5</span>':''}</td><td><button class="btn sm alt" data-ok="${p.slug}|${r.id}">Approve</button> <button class="btn ghost sm" data-no="${p.slug}|${r.id}">Reject</button></td></tr>`).join('')}
  ${cl.map(p=>`<tr><td>${esc(p.name)}<br><span class="muted">Place claim</span></td><td>${esc(p.owner)}</td><td>${esc(p.area)}</td><td><button class="btn sm alt" data-ver="${p.slug}">Verify place</button></td></tr>`).join('')}</table>`:'<p class="muted">Nothing waiting.</p>'}</div>
  <div class="head"><h2 style="font-size:1.4rem">Places pipeline</h2></div>
  <div class="board">${S.stages.map(st=>{const ps=d.places.filter(p=>p.stage===st);return `<div class="col"><h3>${st[0].toUpperCase()+st.slice(1)} <span class="chip">${ps.length}</span></h3>${ps.map(p=>`<div class="pc"><b>${esc(p.name)}</b><br><span class="muted">${esc(p.area)}</span><select data-mv="${p.slug}" aria-label="Move ${esc(p.name)}">${S.stages.map(x=>`<option ${x===st?'selected':''}>${x}</option>`).join('')}</select></div>`).join('')}</div>`}).join('')}</div>
  <form class="panel" id="np" style="margin-top:20px;max-width:560px"><h3 style="margin-bottom:12px">Add an identified place</h3><div class="row"><div class="field"><label for="nn">Name</label><input id="nn" required></div><div class="field"><label for="na">Area</label><input id="na" required></div></div><button class="btn sm">Add place</button></form>`;
  const rm=(v,fn)=>{const[sl,id]=v.split('|'),r=d.places.find(p=>p.slug===sl).rooms.find(x=>x.id==id);fn(r);S.save(d);draw()};
  $$('[data-ok]').forEach(b=>b.onclick=()=>rm(b.dataset.ok,r=>r.status='approved'));
  $$('[data-no]').forEach(b=>b.onclick=()=>rm(b.dataset.no,r=>r.status='rejected'));
  $$('[data-ver]').forEach(b=>b.onclick=()=>{d.places.find(p=>p.slug===b.dataset.ver).stage='onboarded';S.save(d);draw()});
  $$('[data-mv]').forEach(s=>s.onchange=()=>{d.places.find(p=>p.slug===s.dataset.mv).stage=s.value;S.save(d);draw()});
  $('#np').onsubmit=e=>{e.preventDefault();if(!$('#nn').value.trim()||!$('#na').value.trim())return;let sl=slugify($('#nn').value),i=1,b=sl;while(d.places.some(p=>p.slug===sl))sl=b+'-'+(++i);d.places.push({slug:sl,name:$('#nn').value.trim(),area:$('#na').value.trim(),stage:'identified',owner:'',reviews:[],rooms:[]});S.save(d);draw()}}

(async()=>{const m=$('#main');let me,places;
  try{me=await DB.me()}catch(e){m.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  if(!me){needLogin(m,'Sign in with your admin account.');return}
  if(me.profile.role!=='admin'){m.innerHTML='<div class="panel" style="max-width:520px"><h2 style="margin-bottom:8px">Admins only</h2><p class="muted">This page is for Spotted admins.</p></div>';return}
  async function load(){places=await DB.places();draw()}
  function draw(){const pend=[];places.forEach(p=>p.rooms.filter(r=>r.status==='pending').forEach(r=>pend.push([p,r])));const cl=places.filter(p=>p.stage==='claimed');
    const cap=s=>s[0].toUpperCase()+s.slice(1);
    m.innerHTML=`<div class="head"><h2>Super admin</h2></div>
    <div class="stats"><div class="stat"><span class="muted">Rooms pending</span><b>${pend.length}</b></div><div class="stat"><span class="muted">Claims to verify</span><b>${cl.length}</b></div><div class="stat"><span class="muted">Live places</span><b>${places.filter(p=>p.stage==='onboarded').length}</b></div></div>
    <div class="panel"><h3 style="margin-bottom:8px">Review queue</h3>${pend.length||cl.length?`<table><tr><th>Item</th><th>Detail</th><th>Action</th></tr>
    ${pend.map(([p,r])=>`<tr><td>${esc(r.name)}<br><span class="muted">${esc(p.name)} · ${esc(p.area)}</span></td><td>${money(r.price)} / ${esc(r.per)} · ${r.photoCount} photos${r.photoCount<5?' <span class="chip bad">under 5</span>':''}<div class="thumbs">${r.photos.map(u=>`<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Room photo" loading="lazy"></a>`).join('')}</div></td><td><button class="btn sm alt" data-ok="${esc(r.id)}">Approve</button> <button class="btn ghost sm" data-no="${esc(r.id)}">Reject</button></td></tr>`).join('')}
    ${cl.map(p=>`<tr><td>${esc(p.name)}<br><span class="muted">Place claim</span></td><td>${esc(p.area)}${p.free_until?'<br><span class="muted">Free until '+new Date(p.free_until).toLocaleDateString('en-NG')+'</span>':''}</td><td><button class="btn sm alt" data-ver="${esc(p.id)}">Verify place</button></td></tr>`).join('')}</table>`:'<p class="muted">Nothing waiting.</p>'}</div>
    <div class="head"><h2 style="font-size:1.4rem">Places pipeline</h2></div>
    <div class="board">${S.stages.map(st=>{const ps=places.filter(p=>p.stage===st);return `<div class="col"><h3>${cap(st)} <span class="chip">${ps.length}</span></h3>${ps.map(p=>`<div class="pc"><b>${esc(p.name)}</b><br><span class="muted">${esc(p.area)}</span><select data-mv="${esc(p.id)}" aria-label="Move ${esc(p.name)}">${S.stages.map(x=>`<option value="${x}" ${x===st?'selected':''}>${cap(x)}</option>`).join('')}</select></div>`).join('')}</div>`}).join('')}</div>
    <form class="panel" id="np" style="margin-top:20px;max-width:560px"><h3 style="margin-bottom:12px">Add an identified place</h3><div class="row"><div class="field"><label for="nn">Name</label><input id="nn" maxlength="80" required></div><div class="field"><label for="na">Area</label><input id="na" maxlength="80" required></div></div><button class="btn sm">Add place</button></form>`;
    const act=async fn=>{try{await fn();await load()}catch(e){toast(DB.msg(e))}};
    $$('[data-ok]').forEach(b=>b.onclick=()=>act(()=>DB.setRoomStatus(b.dataset.ok,'approved')));
    $$('[data-no]').forEach(b=>b.onclick=()=>act(()=>DB.setRoomStatus(b.dataset.no,'rejected')));
    $$('[data-ver]').forEach(b=>b.onclick=()=>act(()=>DB.setStage(b.dataset.ver,'onboarded')));
    $$('[data-mv]').forEach(s=>s.onchange=()=>act(()=>DB.setStage(s.dataset.mv,s.value)));
    $('#np').onsubmit=e=>{e.preventDefault();const a=$('#nn').value.trim(),b=$('#na').value.trim();if(!a||!b)return;act(()=>DB.addIdentifiedPlace(a,b))}}
  try{await load()}catch(e){m.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>'}})();

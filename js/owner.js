const d=S.load(),m=$('#main'),s=d.session,p=s&&s.role==='owner'&&d.places.find(x=>x.slug===s.slug);
if(!p){m.innerHTML='<h2>Owner dashboard</h2><p class="muted" style="margin:8px 0 18px">Create your listing to open your dashboard.</p><a class="btn" href="signup.html">List your place</a>'}
let photos=[];const AM=['light','water','internet','security','parking','generator'];
function draw(){const live=p.stage==='onboarded',ap=p.rooms.filter(r=>r.status==='approved').length,fu=p.freeUntil?new Date(p.freeUntil).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}):'';
  m.innerHTML=`<div class="head"><h2>${esc(p.name)}</h2><a class="btn ghost sm" href="place.html?s=${esc(p.slug)}">View public page</a></div>
  <div class="banner ${live?'ok':''}">${live?'Your place is live.':'Waiting for Spotted to verify your details. Rooms go live once approved.'} Your web address: <span class="sub-url">${esc(p.slug)}.${S.domain}</span>${fu?'<br>Free until '+fu+', then the monthly listing fee starts.':''}</div>
  <div class="stats"><div class="stat"><span class="muted">Rooms</span><b>${p.rooms.length}</b></div><div class="stat"><span class="muted">Live</span><b>${ap}</b></div><div class="stat"><span class="muted">Awaiting review</span><b>${p.rooms.filter(r=>r.status==='pending').length}</b></div></div>
  <form class="panel" id="rf" novalidate><h3 style="margin-bottom:14px">Add a room</h3><div class="field"><label for="rn">Room name</label><input id="rn" placeholder="e.g. Warm 2-bed, Wuse 2"></div>
  <div class="row"><div class="field"><label for="rp">Price (₦)</label><input id="rp" type="number" min="1" inputmode="numeric"></div><div class="field"><label for="rd">Duration per stay</label><select id="rd"><option value="night">Per night</option><option value="week">Per week</option><option value="month">Per month</option></select></div></div>
  <p class="lbl">What the room offers</p><div class="checks" style="margin:8px 0 18px">${AM.map(a=>`<label><input type="checkbox" value="${a}"> ${a[0].toUpperCase()+a.slice(1)}</label>`).join('')}</div>
  <p class="lbl" id="pl"></p><div class="bar"><i id="pb"></i></div><div class="slots" id="sl"></div><input type="file" id="pf" accept="image/*" multiple hidden>
  <p id="er" role="alert" class="err"></p><button class="btn" id="sb" disabled>Add 5 more photos to submit</button></form>
  <div class="panel"><h3 style="margin-bottom:8px">Your rooms</h3>${p.rooms.length?`<table><tr><th>Room</th><th>Price</th><th>Photos</th><th>Status</th><th></th></tr>${p.rooms.map(r=>`<tr><td>${esc(r.name)}</td><td>${money(r.price)} / ${esc(r.per)}</td><td>${r.photos}</td><td><span class="chip ${r.status==='approved'?'':r.status==='rejected'?'bad':'warn'}">${esc(r.status)}</span></td><td><button class="btn ghost sm" data-del="${r.id}">Remove</button></td></tr>`).join('')}</table>`:'<p class="muted">No rooms yet. Add your first room above.</p>'}</div>`;
  photos=[];slots();$('#pf').onchange=e=>{[...e.target.files].forEach(f=>photos.length<12&&photos.push(URL.createObjectURL(f)));slots()};
  $('#sl').onclick=()=>$('#pf').click();
  $$('[data-del]').forEach(b=>b.onclick=()=>{p.rooms=p.rooms.filter(r=>r.id!=b.dataset.del);S.save(d);draw()});
  $('#rf').onsubmit=e=>{e.preventDefault();const n=$('#rn').value.trim(),pr=+$('#rp').value,er=$('#er');
    if(photos.length<5)return;
    if(!n||!(pr>0)){er.textContent='Enter a room name and a price above zero.';return}
    p.rooms.push({id:Date.now(),name:n,price:pr,per:$('#rd').value,photos:photos.length,am:$$('.checks input:checked').map(c=>c.value),status:'pending'});S.save(d);toast('Room sent for review');draw()}}
function slots(){const k=photos.length,sl=$('#sl');sl.innerHTML=photos.map(u=>`<div class="slot full" style="background-image:url('${u}')"></div>`).join('')+(k<12?'<div class="slot" role="button" tabindex="0" aria-label="Add photos">+</div>':'');
  $('#pl').textContent='Photos · '+k+' of 5 minimum';$('#pb').style.width=Math.min(100,k*20)+'%';const b=$('#sb');b.disabled=k<5;b.textContent=k<5?'Add '+(5-k)+' more photo'+(5-k===1?'':'s')+' to submit':'Submit room for review'}
if(p)draw();

(async()=>{const m=$('#main');
  let me,place;
  try{me=await DB.me();if(!me){needLogin(m,'Sign in to manage your place and rooms.');return}place=await DB.myPlace()}catch(e){m.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  if(!place){m.innerHTML='<h2>Owner dashboard</h2><p class="muted" style="margin:8px 0 18px">You haven\'t listed a place yet.</p><a class="btn" href="signup.html">List your place</a>';return}
  const AM=['light','water','internet','security','parking','generator'],OK={'image/jpeg':1,'image/png':1,'image/webp':1};
  let photos=[];                                   // [{file,url}]
  const clear=()=>{photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[]};
  function draw(){const live=place.stage==='onboarded',rooms=place.rooms,fu=place.free_until?new Date(place.free_until).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'}):'';
    clear();
    m.innerHTML=`<div class="head"><h2>${esc(place.name)}</h2><a class="btn ghost sm" href="place.html?s=${esc(place.slug)}">View public page</a></div>
    <div class="banner ${live?'ok':''}">${live?'Your place is live.':'Waiting for Spotted to verify your details. Rooms go live once approved.'} Your web address: <span class="sub-url">${esc(place.slug)}.${S.domain}</span>${fu?'<br>Free until '+fu+', then the monthly listing fee starts.':''}</div>
    <div class="stats"><div class="stat"><span class="muted">Rooms</span><b>${rooms.length}</b></div><div class="stat"><span class="muted">Live</span><b>${rooms.filter(r=>r.status==='approved').length}</b></div><div class="stat"><span class="muted">Awaiting review</span><b>${rooms.filter(r=>r.status==='pending').length}</b></div></div>
    <form class="panel" id="rf" novalidate><h3 style="margin-bottom:14px">Add a room</h3><div class="field"><label for="rn">Room name</label><input id="rn" maxlength="80" placeholder="e.g. Warm 2-bed, Wuse 2"></div>
    <div class="row"><div class="field"><label for="rp">Price (₦)</label><input id="rp" type="number" min="1" inputmode="numeric"></div><div class="field"><label for="rd">Duration per stay</label><select id="rd"><option value="night">Per night</option><option value="week">Per week</option><option value="month">Per month</option></select></div></div>
    <p class="lbl">What the room offers</p><div class="checks" style="margin:8px 0 18px">${AM.map(a=>`<label><input type="checkbox" value="${a}"> ${a[0].toUpperCase()+a.slice(1)}</label>`).join('')}</div>
    <p class="lbl" id="pl"></p><div class="bar"><i id="pb"></i></div><div class="slots" id="sl"></div><input type="file" id="pf" accept="image/jpeg,image/png,image/webp" multiple hidden>
    <p class="muted" style="font-size:.88rem;margin-bottom:8px">JPG, PNG or WebP, up to 5 MB each. Up to 12 photos.</p>
    <p id="er" role="alert" class="err"></p><button class="btn" id="sb" disabled>Add 5 more photos to submit</button></form>
    <div class="panel"><h3 style="margin-bottom:8px">Your rooms</h3>${rooms.length?`<table><tr><th>Room</th><th>Price</th><th>Photos</th><th>Status</th><th></th></tr>${rooms.map(r=>`<tr><td>${esc(r.name)}</td><td>${money(r.price)} / ${esc(r.per)}</td><td>${r.photoCount}</td><td><span class="chip ${r.status==='approved'?'':r.status==='rejected'?'bad':'warn'}">${esc(r.status)}</span></td><td><button class="btn ghost sm" data-del="${esc(r.id)}">Remove</button></td></tr>`).join('')}</table>`:'<p class="muted">No rooms yet. Add your first room above.</p>'}</div>`;
    slots();
    $('#pf').onchange=e=>{let bad=false;for(const f of e.target.files){if(photos.length>=12)break;if(!OK[f.type]||f.size>5*1024*1024){bad=true;continue}photos.push({file:f,url:URL.createObjectURL(f)})}
      e.target.value='';if(bad)toast('Some files were skipped. Use JPG, PNG or WebP under 5 MB.');slots()};
    const sl=$('#sl');
    sl.onclick=e=>{const rm=e.target.closest('[data-rm]');if(rm){const[x]=photos.splice(+rm.dataset.rm,1);URL.revokeObjectURL(x.url);slots();return}if(e.target.closest('.slot:not(.full)'))$('#pf').click()};
    sl.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.slot:not(.full)')){e.preventDefault();$('#pf').click()}};
    $$('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Remove this room and its photos?'))return;b.disabled=true;
      try{await DB.deleteRoom(b.dataset.del);place=await DB.myPlace();draw()}catch(e){toast(DB.msg(e));b.disabled=false}});
    $('#rf').onsubmit=async e=>{e.preventDefault();const n=$('#rn').value.trim(),pr=Math.round(+$('#rp').value),er=$('#er');er.textContent='';
      if(photos.length<5)return;
      if(!n||!(pr>0)){er.textContent='Enter a room name and a price above zero.';return}
      const b=$('#sb');b.disabled=true;b.textContent='Uploading photos…';
      try{await DB.addRoom(place.id,{name:n,price:pr,per:$('#rd').value,amenities:$$('.checks input:checked').map(c=>c.value),files:photos.map(p=>p.file)});
        toast('Room sent for review');place=await DB.myPlace();draw()}
      catch(x){er.textContent=DB.msg(x);slots()}}}
  function slots(){const k=photos.length,sl=$('#sl');
    sl.innerHTML=photos.map((p,i)=>`<div class="slot full" style="background-image:url('${esc(p.url)}')"><button type="button" class="rm" data-rm="${i}" aria-label="Remove photo ${i+1}">✕</button></div>`).join('')+(k<12?'<div class="slot" role="button" tabindex="0" aria-label="Add photos">+</div>':'');
    $('#pl').textContent='Photos · '+k+' of 5 minimum';$('#pb').style.width=Math.min(100,k*20)+'%';
    const b=$('#sb');b.disabled=k<5;b.textContent=k<5?'Add '+(5-k)+' more photo'+(5-k===1?'':'s')+' to submit':'Submit room for review'}
  draw()})();

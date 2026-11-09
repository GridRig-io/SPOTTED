(async()=>{const m=$('#main');
  let s=new URLSearchParams(location.search).get('s')||'';
  if(!s){const h=location.hostname.split('.');if(h.length>2)s=h[0]}     // owner subdomain, e.g. sunrise-court.yourdomain.com
  if(s==='www'){location.replace('index.html');return}
  const notFound=()=>{m.innerHTML='<h2>We couldn\'t find that place</h2><p class="muted" style="margin:8px 0 18px">Check the address, or browse all places.</p><a class="btn" href="explore.html">Explore places</a>'};
  if(!/^[a-z0-9-]{3,30}$/.test(s)){notFound();return}
  let p,reviews=[],saved=new Set();
  try{p=await DB.placeBySlug(s);if(!p){notFound();return}[reviews,saved]=await Promise.all([DB.reviews(p.id),DB.savedIds()])}catch(e){m.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
  function draw(){const un=S.unclaimed(p),on=saved.has(p.id),rooms=S.live(p),pend=p.stage==='claimed',
      avg=reviews.length?(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1):null,
      pics=rooms.flatMap(r=>r.photos).slice(0,3);
    document.title=p.name+' · Spotted';
    m.innerHTML=`<div class="head"><div><h2 style="font-size:2.2rem">${esc(p.name)}</h2><p class="muted">${esc(p.area)}, Abuja ${avg?'· ★ '+avg+' ('+reviews.length+')':''}</p></div><button class="btn ghost sm" id="sv" aria-pressed="${on}">${on?'♥ Saved':'♡ Save'}</button></div>
    ${pics.length?`<div class="gallery ${pics.length===1?'one':''}">${pics.map((u,i)=>`<img class="${i===0?'big':''}" src="${esc(u)}" alt="">`).join('')}</div>`:`<div class="ph" style="height:240px;border-radius:18px;background:${S.color(p)};margin-bottom:22px"></div>`}
    ${un?`<div class="banner"><b>Unregistered place.</b> This place isn't on Spotted yet, so its details are unverified and you book at your own risk. <a href="signup.html?claim=${esc(p.slug)}" style="font-weight:700;text-decoration:underline">Is this your place? Claim it.</a></div>`:''}
    ${pend?'<div class="banner">This place is waiting for Spotted to verify it. Only you and Spotted can see it right now.</div>':''}
    <h3 style="margin-bottom:12px">Rooms</h3>
    ${rooms.length?rooms.map(r=>`<div class="panel" style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center"><div><h3>${esc(r.name)}</h3><p class="muted">${r.photoCount} photos · ${(r.amenities||[]).map(esc).join(', ')||'no extras listed'}</p><div class="thumbs">${r.photos.slice(0,5).map(u=>`<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div></div><div style="text-align:right"><b style="font-size:1.2rem">${money(r.price)}</b><span class="muted"> / ${esc(r.per)}</span><br><button class="btn sm" data-book="${esc(r.id)}" style="margin-top:8px">Book</button></div></div>`).join(''):'<p class="muted" style="margin-bottom:20px">No rooms listed yet.</p>'}
    <h3 style="margin:28px 0 12px">Ratings and comments</h3>
    ${reviews.map(r=>`<div class="panel"><b>${esc(r.reviewer_name||'Guest')}</b> <span style="color:var(--orange)">${stars(r.rating)}</span><p>${esc(r.body)}</p></div>`).join('')||'<p class="muted">No comments yet.</p>'}
    <form class="panel" id="rf" style="max-width:520px"><h3 style="margin-bottom:10px">Leave a rating</h3><p class="muted" style="margin-bottom:12px">You can rate a place after booking a room here.</p><div class="field"><label for="rn">Rating</label><select id="rn"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div class="field"><label for="rt">Comment</label><textarea id="rt" rows="3" maxlength="1000" required></textarea></div><p id="re" role="alert" class="err"></p><button class="btn sm">Post comment</button></form>`;
    const needSignIn=()=>{toast('Sign in to continue');setTimeout(()=>location.href='login.html?next='+encodeURIComponent(currentPage()),900)};
    $('#sv').onclick=async()=>{if(!(await DB.me()))return needSignIn();const nx=!saved.has(p.id);try{await DB.toggleSave(p.id,nx);nx?saved.add(p.id):saved.delete(p.id);draw()}catch(e){toast(DB.msg(e))}};
    $$('[data-book]').forEach(b=>b.onclick=async()=>{if(!(await DB.me()))return needSignIn();b.disabled=true;
      try{await DB.book(b.dataset.book);toast('Booking saved to your account. Online payment is coming soon.')}catch(e){toast(DB.msg(e))}b.disabled=false});
    $('#rf').onsubmit=async e=>{e.preventDefault();if(!(await DB.me()))return needSignIn();const t=$('#rt').value.trim();if(!t){$('#re').textContent='Write a comment first.';return}
      try{await DB.addReview(p.id,+$('#rn').value,t);reviews=await DB.reviews(p.id);draw()}
      catch(err){$('#re').textContent=(err&&(err.code==='42501'||/row-level security/i.test(err.message)))?'You can rate a place after booking a room here.':DB.msg(err)}}}
  draw()})();

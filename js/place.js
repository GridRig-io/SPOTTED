const d=S.load(),m=$('#main');
let s=new URLSearchParams(location.search).get('s')||'';
if(!s){const h=location.hostname.split('.');if(h.length>2)s=h[0]}   // owner subdomain, e.g. sunrise-court.yourdomain.com
if(s==='www'){location.replace('index.html')}
const p=d.places.find(x=>x.slug===s);
if(S.reserved.includes(s)||!p){m.innerHTML='<h2>We couldn\'t find that place</h2><p class="muted" style="margin:8px 0 18px">Check the address, or browse all places.</p><a class="btn" href="explore.html">Explore places</a>'}
else draw();
function stars(n){return '★'.repeat(n)+'☆'.repeat(5-n)}
function draw(){const un=S.unclaimed(p),on=d.saved.includes(p.slug),rooms=p.rooms.filter(r=>r.status==='approved');
  const avg=p.reviews.length?(p.reviews.reduce((a,r)=>a+r.n,0)/p.reviews.length).toFixed(1):null;
  document.title=p.name+' · Spotted';
  m.innerHTML=`<div class="head"><div><h2 style="font-size:2.2rem">${esc(p.name)}</h2><p class="muted">${esc(p.area)}, Abuja ${avg?'· ★ '+avg+' ('+p.reviews.length+')':''}</p></div><button class="btn ghost sm" id="sv" aria-pressed="${on}">${on?'♥ Saved':'♡ Save'}</button></div>
  <div class="ph" style="height:260px;border-radius:18px;background:${S.color(p)};margin-bottom:22px"><img src="assets/places/${esc(p.slug)}.jpg" alt="" onerror="this.remove()"></div>
  ${un?`<div class="banner"><b>Unregistered place.</b> This place isn't on Spotted yet, so its details are unverified and you book at your own risk. <a href="signup.html?claim=${esc(p.slug)}" style="font-weight:700;text-decoration:underline">Is this your place? Claim it.</a></div>`:''}
  <h3 style="margin-bottom:12px">Rooms</h3>
  ${rooms.length?rooms.map(r=>`<div class="panel" style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center"><div><h3>${esc(r.name)}</h3><p class="muted">${r.photos} photos · ${r.am.map(esc).join(', ')||'no extras listed'}</p></div><div style="text-align:right"><b style="font-size:1.2rem">${money(r.price)}</b><span class="muted"> / ${esc(r.per)}</span><br><button class="btn sm" data-book="${r.id}" style="margin-top:8px">Book</button></div></div>`).join(''):'<p class="muted" style="margin-bottom:20px">No rooms listed yet.</p>'}
  <h3 style="margin:28px 0 12px">Ratings and comments</h3>
  ${p.reviews.map(r=>`<div class="panel"><b>${esc(r.who)}</b> <span style="color:var(--orange)">${stars(r.n)}</span><p>${esc(r.t)}</p></div>`).join('')||'<p class="muted">No comments yet.</p>'}
  <form class="panel" id="rf" style="max-width:520px"><div class="row"><div class="field"><label for="rw">Your name</label><input id="rw" required></div><div class="field"><label for="rn">Rating</label><select id="rn"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div></div><div class="field"><label for="rt">Comment</label><textarea id="rt" rows="3" required></textarea></div><button class="btn sm">Post comment</button></form>`;
  $('#sv').onclick=()=>{const i=d.saved.indexOf(p.slug);i<0?d.saved.push(p.slug):d.saved.splice(i,1);S.save(d);draw()};
  $$('[data-book]').forEach(b=>b.onclick=()=>{const r=p.rooms.find(x=>x.id==b.dataset.book);d.been.push({slug:p.slug,room:r.name,price:r.price,per:r.per,on:new Date().toLocaleDateString('en-NG')});S.save(d);toast('Booking saved to your account. Online payment is coming soon.')});
  $('#rf').onsubmit=e=>{e.preventDefault();if(!$('#rw').value.trim()||!$('#rt').value.trim())return;p.reviews.push({who:$('#rw').value.trim(),n:+$('#rn').value,t:$('#rt').value.trim()});S.save(d);draw()}}

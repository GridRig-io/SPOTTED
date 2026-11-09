const d=S.load(),sv=$('#saved'),bn=$('#been');
const draw=()=>{const l=d.places.filter(p=>d.saved.includes(p.slug));sv.innerHTML=l.length?l.map(p=>placeCard(p,d)).join(''):'<p class="muted">Nothing saved yet. Tap the heart on any place to keep it here.</p>'};
draw();bindSave(sv,d,draw);
bn.innerHTML=d.been.length?'<div class="panel"><table><tr><th>Place</th><th>Room</th><th>Price</th><th>Date</th></tr>'+d.been.map(b=>{const p=d.places.find(x=>x.slug===b.slug);return `<tr><td>${esc(p?p.name:b.slug)}</td><td>${esc(b.room)}</td><td>${money(b.price)} / ${esc(b.per)}</td><td>${esc(b.on)}</td></tr>`}).join('')+'</table></div>':'<p class="muted">No stays yet. Your bookings will show up here.</p>';

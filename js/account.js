(async()=>{const sv=$('#saved'),bn=$('#been'),top=$('#who');let me;
  try{me=await DB.me()}catch(e){top.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  if(!me){$('#acct').hidden=true;needLogin($('#gate'),'Sign in to see your saved places and stays.');return}
  top.textContent=me.profile.full_name?'Hi '+me.profile.full_name:'Your account';
  let list=[],saved=new Set(),stays=[];
  try{[list,stays]=await Promise.all([DB.savedPlaces(),DB.myBookings()]);saved=new Set(list.map(p=>p.id))}catch(e){sv.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  const draw=()=>{const l=list.filter(p=>saved.has(p.id));sv.innerHTML=l.length?l.map(p=>placeCard(p,saved)).join(''):'<p class="muted">Nothing saved yet. Tap the heart on any place to keep it here.</p>'};
  draw();bindSave(sv,saved,draw);
  bn.innerHTML=stays.length?'<div class="panel"><table><tr><th>Place</th><th>Room</th><th>Price</th><th>Date</th><th>Status</th></tr>'+stays.map(b=>`<tr><td>${b.places?`<a href="place.html?s=${esc(b.places.slug)}" style="text-decoration:underline">${esc(b.places.name)}</a>`:'-'}</td><td>${esc(b.rooms?b.rooms.name:'-')}</td><td>${money(b.price)} / ${esc(b.per)}</td><td>${esc(new Date(b.created_at).toLocaleDateString('en-NG'))}</td><td><span class="chip warn">${esc(b.status)}</span></td></tr>`).join('')+'</table></div>':'<p class="muted">No stays yet. Your bookings will show up here.</p>'})();

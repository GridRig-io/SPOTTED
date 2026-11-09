(async()=>{const gate=$('#gate'),f=$('#f'),n=$('#name'),sl=$('#slug'),pv=$('#prev'),err=$('#err');
  const claim=new URLSearchParams(location.search).get('claim');
  let me;try{me=await DB.me()}catch(e){gate.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  if(!me){needLogin(gate,'Your place is tied to your account, so you can manage it from any device.');return}
  try{if(await DB.myPlace()){location.replace('owner.html');return}}catch(e){gate.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  let target=null;
  if(claim){try{target=await DB.placeBySlug(claim)}catch(e){}
    if(!target||!S.unclaimed(target)){gate.innerHTML='<div class="banner">That place can\'t be claimed. You can list a new place below.</div>';target=null}
    else{n.value=target.name;n.readOnly=true;$('#area').value=target.area;$('#area').readOnly=true;sl.value=target.slug;sl.readOnly=true;
      gate.innerHTML='<div class="banner ok">You are claiming <b>'+esc(target.name)+'</b>. We\'ll verify your details before it goes live.</div>'}}
  f.hidden=false;
  let touched=false,ok=false,timer=0,seq=0;
  async function check(){const v=sl.value,my=++seq;ok=false;
    if(!v){pv.textContent='';return}
    if(target){ok=true;pv.innerHTML='Your place will live at <span class="sub-url">'+esc(v)+'.'+S.domain+'</span>';return}
    if(!SLUG_RE.test(v)){pv.innerHTML='<span style="color:#B3290A">Use 3 to 30 letters, numbers or hyphens.</span>';return}
    pv.textContent='Checking…';
    try{const free=await DB.slugAvailable(v);if(my!==seq)return;ok=free;
      pv.innerHTML=free?'Your place will live at <span class="sub-url">'+esc(v)+'.'+S.domain+'</span>':'<span style="color:#B3290A">That address is taken. Try another.</span>'}
    catch(e){if(my===seq)pv.textContent=DB.msg(e)}}
  const later=()=>{clearTimeout(timer);timer=setTimeout(check,300)};
  n.addEventListener('input',()=>{if(!touched&&!target){sl.value=slugify(n.value);later()}});
  sl.addEventListener('input',()=>{touched=true;sl.value=sl.value.toLowerCase();later()});
  f.onsubmit=async e=>{e.preventDefault();err.textContent='';
    if(!n.value.trim()||!$('#area').value.trim()){err.textContent='Fill in the place name and area.';return}
    await check();if(!ok){err.textContent='Choose a valid, unused web address.';return}
    const b=$('#go');b.disabled=true;
    try{target?await DB.claimPlace(target.slug):await DB.createPlace(sl.value,n.value.trim(),$('#area').value.trim());location.href='owner.html'}
    catch(x){err.textContent=DB.msg(x);b.disabled=false}}})();

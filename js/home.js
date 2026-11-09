(async()=>{const f=$('#feat');let list=[],saved=new Set();
  const v=$('#hv');v.src=S.media.heroVideo;v.addEventListener('error',()=>v.remove());   // optional hero clip
  $('#sf').addEventListener('submit',e=>{e.preventDefault();location.href='explore.html?q='+encodeURIComponent($('#q').value.trim())});
  try{[list,saved]=await Promise.all([DB.places(),DB.savedIds()])}catch(e){f.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  list=list.filter(S.visible).slice(0,4);
  const draw=()=>f.innerHTML=list.length?list.map(p=>placeCard(p,saved)).join(''):'<p class="muted">No places yet. Check back soon.</p>';
  draw();bindSave(f,saved,draw)})();

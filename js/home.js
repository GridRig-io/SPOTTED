const d=S.load(),f=$('#feat');
const draw=()=>f.innerHTML=d.places.filter(p=>S.visible(p)).slice(0,4).map(p=>placeCard(p,d)).join('');
draw();bindSave(f,d,draw);
$('#sf').addEventListener('submit',e=>{e.preventDefault();location.href='explore.html?q='+encodeURIComponent($('#q').value.trim())});
// Hero video (e.g. a Higgsfield clip): drop it at assets/hero.mp4 and it plays; otherwise the plain green hero stays.
const v=$('#hv');v.src=S.media.heroVideo;v.addEventListener('error',()=>v.remove());

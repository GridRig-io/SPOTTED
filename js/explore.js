(async()=>{const g=$('#grid'),q=$('#q'),a=$('#area');let list=[],saved=new Set();
  try{[list,saved]=await Promise.all([DB.places(),DB.savedIds()])}catch(e){g.innerHTML='<p class="muted">'+esc(DB.msg(e))+'</p>';return}
  list=list.filter(S.visible);
  [...new Set(list.map(p=>p.area))].sort().forEach(x=>a.add(new Option(x,x)));
  q.value=new URLSearchParams(location.search).get('q')||'';
  function draw(){const t=q.value.toLowerCase(),r=list.filter(p=>(!a.value||p.area===a.value)&&(p.name+' '+p.area).toLowerCase().includes(t));
    g.innerHTML=r.length?r.map(p=>placeCard(p,saved)).join(''):'<p class="muted">No places match. Try another area or clear the search.</p>';
    $('#count').textContent=r.length+' place'+(r.length===1?'':'s')}
  q.addEventListener('input',draw);a.addEventListener('change',draw);bindSave(g,saved,draw);draw()})();

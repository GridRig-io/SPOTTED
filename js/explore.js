const d=S.load(),g=$('#grid'),q=$('#q'),a=$('#area');
const list=d.places.filter(S.visible);
[...new Set(list.map(p=>p.area))].sort().forEach(x=>a.add(new Option(x,x)));
q.value=new URLSearchParams(location.search).get('q')||'';
function draw(){const t=q.value.toLowerCase(),r=list.filter(p=>(!a.value||p.area===a.value)&&(p.name+p.area).toLowerCase().includes(t));
  g.innerHTML=r.length?r.map(p=>placeCard(p,d)).join(''):'<p class="muted">No places match. Try another area or clear the search.</p>';
  $('#count').textContent=r.length+' place'+(r.length===1?'':'s')}
q.addEventListener('input',draw);a.addEventListener('change',draw);bindSave(g,d,draw);draw();

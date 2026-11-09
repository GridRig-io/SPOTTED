const d=S.load(),f=$('#f'),n=$('#name'),sl=$('#slug'),pv=$('#prev'),claim=new URLSearchParams(location.search).get('claim');
let touched=false,target=claim&&d.places.find(p=>p.slug===claim&&S.unclaimed(p));
if(target){n.value=target.name;$('#area').value=target.area;sl.value=target.slug;$('#claimnote').innerHTML='<div class="banner ok">You are claiming <b>'+esc(target.name)+'</b>. We\'ll verify your details before it goes live.</div>'}
function check(){const v=sl.value,taken=d.places.some(p=>p.slug===v&&p!==target);let msg='';
  if(!v)msg='';else if(!/^[a-z0-9-]{3,30}$/.test(v))msg='Use 3 to 30 letters, numbers or hyphens.';else if(S.reserved.includes(v)||taken)msg='That address is taken. Try another.';
  pv.innerHTML=msg?'<span style="color:#B3290A">'+msg+'</span>':(v?'Your place will live at <span class="sub-url">'+esc(v)+'.'+S.domain+'</span>':'');return !msg&&!!v}
n.addEventListener('input',()=>{if(!touched&&!target){sl.value=slugify(n.value)}check()});
sl.addEventListener('input',()=>{touched=true;sl.value=sl.value.toLowerCase();check()});check();
f.addEventListener('submit',e=>{e.preventDefault();const err=$('#err');err.textContent='';
  if(!n.value.trim()||!$('#owner').value.trim()||!$('#area').value.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#email').value)){err.textContent='Fill in every field with a valid email.';return}
  if(!check()){err.textContent='Choose a valid, unused web address.';return}
  const free=new Date();free.setMonth(free.getMonth()+2);
  const rec={slug:sl.value,name:n.value.trim(),area:$('#area').value.trim(),stage:'claimed',owner:$('#owner').value.trim(),email:$('#email').value.trim(),freeUntil:free.toISOString(),reviews:[]};
  if(target)Object.assign(target,rec);else d.places.push(Object.assign(rec,{rooms:[]}));
  d.session={role:'owner',slug:rec.slug};S.save(d);location.href='owner.html'});

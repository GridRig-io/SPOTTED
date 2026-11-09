(async function(){const h=$('#hdr');if(!h)return;
  const page=location.pathname.split('/').pop().replace('.html','')||'index';
  const render=me=>{const role=me?(me.profile.role||'guest'):null;
    const L=[['explore','Explore','explore.html']];
    if(me)L.push(['account','Saved','account.html']);
    if(role==='admin')L.push(['admin','Admin','admin.html']);
    L.push(role==='owner'?['owner','Dashboard','owner.html']:['signup','List your place','signup.html']);
    L.push(me?['signout','Sign out','#']:['login','Sign in','login.html']);
    h.innerHTML=`<header class="nav"><div class="wrap"><a class="brand" href="index.html" aria-label="Spotted home">sp${PIN}tted</a><nav aria-label="Main"><ul>${L.map(l=>`<li><a href="${l[2]}" data-nav="${l[0]}" class="${page===l[0]?'on':''}">${l[1]}</a></li>`).join('')}</ul></nav></div></header>`};
  render(null);
  h.addEventListener('click',async e=>{const a=e.target.closest('[data-nav="signout"]');if(!a)return;e.preventDefault();await DB.signOut();location.href='index.html'});
  try{render(await DB.me())}catch(e){}
})();

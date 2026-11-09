(()=>{const f=$('#f'),err=$('#err');let mode='in';
  const next=(()=>{const n=new URLSearchParams(location.search).get('next')||'';return /^[a-z]+\.html(\?[A-Za-z0-9=&_.%-]*)?$/.test(n)?n:'index.html'})();
  function setMode(m){mode=m;$$('[data-mode]').forEach(b=>b.setAttribute('aria-selected',b.dataset.mode===m));
    $('#nf').hidden=m==='in';$('#name').required=m!=='in';$('#sub').textContent=m==='in'?'Sign in':'Create account';
    $('#pw').autocomplete=m==='in'?'current-password':'new-password';err.textContent=''}
  $$('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  if(new URLSearchParams(location.search).get('new'))setMode('up');
  f.onsubmit=async e=>{e.preventDefault();err.textContent='';err.style.color='';
    const email=$('#email').value.trim(),pw=$('#pw').value,name=$('#name').value.trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err.textContent='Enter a valid email address.';return}
    if(pw.length<8){err.textContent='Use at least 8 characters for your password.';return}
    if(mode==='up'&&!name){err.textContent='Enter your name.';return}
    const b=$('#sub');b.disabled=true;
    try{
      if(mode==='up'){const r=await DB.signUp(name,email,pw);
        if(r.needsConfirm){err.style.color='var(--green)';err.textContent='Account created. Check your email to confirm it, then sign in.';b.disabled=false;setMode('in');err.style.color='var(--green)';err.textContent='Account created. Check your email to confirm it, then sign in.';return}}
      else await DB.signIn(email,pw);
      location.href=next}
    catch(x){err.textContent=DB.msg(x);b.disabled=false}}})();

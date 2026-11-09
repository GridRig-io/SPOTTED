/* Spotted data layer: the ONLY file that talks to Supabase.
   The Android app uses the same project, tables and rules. */
const sb=window.supabase.createClient(SPOTTED_CONFIG.url,SPOTTED_CONFIG.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const BUCKET='room-photos',EXT={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const PLACE_SELECT='id,slug,name,area,stage,owner_id,free_until,created_at,rooms(id,name,price,per,amenities,status,room_photos(path,position))';
const photoUrl=path=>sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
function norm(p){return Object.assign({},p,{rooms:(p.rooms||[]).map(r=>{const ph=(r.room_photos||[]).slice().sort((a,b)=>a.position-b.position);return Object.assign({},r,{photos:ph.map(x=>photoUrl(x.path)),photoCount:ph.length})})})}
let _me=null;
const DB={
  msg(e){const m=String((e&&e.message)||e||'');
    if(/Invalid login credentials/i.test(m))return 'Email or password is wrong.';
    if(/already registered|already been registered/i.test(m))return 'That email already has an account. Sign in instead.';
    if(/Failed to fetch|NetworkError|Load failed/i.test(m))return "Can't reach Spotted. Check your connection and try again.";
    if(/at least 5 photos/i.test(m))return 'This room needs at least 5 photos before it can go live.';
    if(/already have a place/i.test(m))return 'You already have a place on Spotted.';
    if(/cannot be claimed/i.test(m))return 'This place cannot be claimed.';
    if(/not available to book/i.test(m))return 'This room is not available to book yet.';
    if((e&&e.code)==='23505'||/duplicate key/i.test(m))return /reviews/.test(m)?"You've already reviewed this place.":'That address is already taken.';
    if((e&&e.code)==='42501'||/row-level security/i.test(m))return "You don't have permission to do that.";
    if(/Email not confirmed/i.test(m))return 'Confirm your email first, then sign in.';
    return m||'Something went wrong. Try again.'},
  async me(){if(_me)return _me;
    _me=(async()=>{const{data:{session}}=await sb.auth.getSession();if(!session)return null;
      const{data:profile}=await sb.from('profiles').select('id,full_name,role').eq('id',session.user.id).maybeSingle();
      return{user:session.user,profile:profile||{role:'guest',full_name:''}}})();
    return _me},
  async signUp(name,email,password){_me=null;const{data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});if(error)throw error;return{needsConfirm:!data.session}},
  async signIn(email,password){_me=null;const{error}=await sb.auth.signInWithPassword({email,password});if(error)throw error},
  async signOut(){_me=null;await sb.auth.signOut()},
  async places(){const{data,error}=await sb.from('places').select(PLACE_SELECT).order('created_at',{ascending:false});if(error)throw error;return data.map(norm)},
  async placeBySlug(slug){const{data,error}=await sb.from('places').select(PLACE_SELECT).eq('slug',slug).maybeSingle();if(error)throw error;return data?norm(data):null},
  async myPlace(){const me=await this.me();if(!me)return null;const{data,error}=await sb.from('places').select(PLACE_SELECT).eq('owner_id',me.user.id).maybeSingle();if(error)throw error;return data?norm(data):null},
  async slugAvailable(slug){const{data,error}=await sb.rpc('slug_available',{p_slug:slug});if(error)throw error;return data===true},
  async createPlace(slug,name,area){const{error}=await sb.rpc('create_place',{p_slug:slug,p_name:name,p_area:area});if(error)throw error},
  async claimPlace(slug){const{error}=await sb.rpc('claim_place',{p_slug:slug});if(error)throw error},
  async savedIds(){const me=await this.me();if(!me)return new Set();const{data,error}=await sb.from('saved_places').select('place_id');if(error)throw error;return new Set(data.map(x=>x.place_id))},
  async savedPlaces(){const{data,error}=await sb.from('saved_places').select(`created_at,places(${PLACE_SELECT})`).order('created_at',{ascending:false});if(error)throw error;return data.filter(x=>x.places).map(x=>norm(x.places))},
  async toggleSave(placeId,on){const{error}=on?await sb.from('saved_places').insert({place_id:placeId}):await sb.from('saved_places').delete().eq('place_id',placeId);if(error)throw error},
  async book(roomId){const{error}=await sb.from('bookings').insert({room_id:roomId});if(error)throw error},
  async myBookings(){const{data,error}=await sb.from('bookings').select('id,price,per,status,created_at,places(name,slug),rooms(name)').order('created_at',{ascending:false});if(error)throw error;return data},
  async reviews(placeId){const{data,error}=await sb.from('reviews').select('id,reviewer_name,rating,body,created_at').eq('place_id',placeId).order('created_at',{ascending:false});if(error)throw error;return data},
  async addReview(placeId,rating,body){const{error}=await sb.from('reviews').insert({place_id:placeId,rating,body});if(error)throw error},
  async addRoom(placeId,r){const me=await this.me();if(!me)throw new Error('Sign in first');
    const{data:room,error}=await sb.from('rooms').insert({place_id:placeId,name:r.name,price:r.price,per:r.per,amenities:r.amenities}).select('id').single();
    if(error)throw error;const uploaded=[];
    try{
      for(let i=0;i<r.files.length;i++){const f=r.files[i],path=`${me.user.id}/${room.id}/${i+1}-${Date.now()}.${EXT[f.type]}`;
        const{error:ue}=await sb.storage.from(BUCKET).upload(path,f,{contentType:f.type,cacheControl:'3600',upsert:false});if(ue)throw ue;uploaded.push(path)}
      const{error:pe}=await sb.from('room_photos').insert(uploaded.map((path,i)=>({room_id:room.id,path,position:i})));if(pe)throw pe;
    }catch(e){
      if(uploaded.length){try{await sb.storage.from(BUCKET).remove(uploaded)}catch(_){}}
      await sb.from('rooms').delete().eq('id',room.id);throw e}
    return room.id},
  async deleteRoom(roomId){const{data:ph}=await sb.from('room_photos').select('path').eq('room_id',roomId);
    const{error}=await sb.from('rooms').delete().eq('id',roomId);if(error)throw error;
    if(ph&&ph.length){try{await sb.storage.from(BUCKET).remove(ph.map(x=>x.path))}catch(_){}}},
  async setRoomStatus(id,status){const{data,error}=await sb.from('rooms').update({status}).eq('id',id).select('id');if(error)throw error;if(!data||!data.length)throw new Error("You don't have permission to do that.")},
  async setStage(placeId,stage){const{data,error}=await sb.from('places').update({stage}).eq('id',placeId).select('id');if(error)throw error;if(!data||!data.length)throw new Error("You don't have permission to do that.")},
  async addIdentifiedPlace(name,area){let base=slugify(name);if(base.length<3)base=(base+'-place').slice(0,30);let slug=base,i=1;
    while(!(await this.slugAvailable(slug))){i++;slug=(base.slice(0,26)+'-'+i);if(i>50)throw new Error('Could not make an address for that name.')}
    const{error}=await sb.from('places').insert({slug,name,area,stage:'identified'});if(error)throw error}
};

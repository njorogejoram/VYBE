const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const audio=$('#audio');let tracks=[],current=-1,liked=new Set(),playlists=[],activePlaylist=null,shuffle=false,repeat=false,libraryFilter='all',historyViews=['home'],historyIndex=0;
const artColors=[['#b77c86','#453b68'],['#5f9a91','#263f5b'],['#c18b61','#583e55'],['#7c83ba','#333b60'],['#a2a06e','#45445f'],['#ba789e','#51416e']];
const palettes=artColors.map(c=>`linear-gradient(135deg,${c[0]},${c[1]})`);
function setDynamicTheme(t,i){
 const fallback=artColors[(Math.max(0,i))%artColors.length];
 if(t&&t.cover){
  const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{try{
   const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});c.width=c.height=32;ctx.drawImage(img,0,0,32,32);
   const d=ctx.getImageData(0,0,32,32).data;let best=null,bestScore=-1;
   for(let k=0;k<d.length;k+=16){const r=d[k],g=d[k+1],b=d[k+2],max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max===0?0:(max-min)/max,light=(max+min)/510;const score=sat*1.25+(1-Math.abs(light-.52))*.35;if(light>.13&&light<.88&&score>bestScore){bestScore=score;best=[r,g,b]}}
   if(!best)best=[d[0],d[1],d[2]];
   const accent=`rgb(${best.map(v=>Math.round(v)).join(',')})`;
   const [r,g,b]=best.map(v=>v/255);const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0;if(max!==min){const delta=max-min;h=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;h=Math.round(h*60);if(h<0)h+=360}
   applyTheme([accent,`hsl(${h} 24% 15%)`]);
  }catch(e){applyTheme(fallback)}};
  img.onerror=()=>applyTheme(fallback);img.src=t.cover;
 }else applyTheme(fallback);
}
function applyTheme(pair){const root=document.documentElement;root.style.setProperty('--accent',pair[0]);root.style.setProperty('--accent-deep',pair[1]);root.style.setProperty('--ambient',pair[0]+'45');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',pair[1]);document.body.classList.add('theme-shift')}
function syncPlaybackUI(){const playing=!audio.paused&&!audio.ended;$('#playBtn').textContent=playing?'Ⅱ':'▶';$('#largePlay').textContent=playing?'Ⅱ':'▶';document.body.classList.toggle('is-playing',playing);$('#largePlay').setAttribute('aria-label',playing?'Pause':'Play')}

function toast(msg){let t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2100)}
function fmt(s){if(!isFinite(s))return'0:00';return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function coverHTML(t,i){return t.cover?`<img src="${t.cover}" alt="">`:`♫`}
function trackRow(t,i){return `<div class="track-row"><div class="cover" style="background:${palettes[i%palettes.length]}">${coverHTML(t,i)}</div><div class="track-name-wrap"><div class="track-name">${esc(t.title)}</div><div class="track-artist">${esc(t.artist||'Unknown artist')}</div></div><div class="track-album">${esc(t.album||'Local collection')}</div><span class="row-duration">${fmt(t.duration)}</span><button class="row-like" data-like="${t.id}" title="Like">${liked.has(t.id)?'♥':'♡'}</button><button class="row-edit" data-edit="${t.id}" title="Edit track details">⋯</button><button class="row-play" data-play="${t.id}" title="Play">▶</button></div>`}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderTracks(){let list=tracks.slice(-6).reverse();$('#recentTracks').className=tracks.length?'track-grid':'track-grid empty-state';$('#recentTracks').innerHTML=list.length?list.map(t=>trackCard(t)).join(''):`<div class="empty-icon">♫</div><h3>Your next favourite starts here.</h3><p>Add audio files from your device to build your VYBE library.</p><button class="secondary-btn" id="emptyAdd">＋ Add music</button>`;$('#libraryTracks').innerHTML=(libraryFilter==='liked'?tracks.filter(t=>liked.has(t.id)):tracks).map((t)=>trackRow(t,tracks.indexOf(t))).join('')||'<p class="muted">No tracks here yet. Add music to get started.</p>';renderExplore();renderArtists();renderPlaylists()}
function trackCard(t){let i=tracks.indexOf(t);return `<article class="track-card album-card"><button class="album-artwork" data-play="${t.id}" aria-label="Play ${esc(t.title)}" style="--art-a:${artColors[i%artColors.length][0]};--art-b:${artColors[i%artColors.length][1]}">${t.cover?`<img src="${t.cover}" alt="">`:`<span class="art-orbit"></span><span class="art-glyph">♫</span><span class="art-caption-mini">${esc((t.album||t.title).slice(0,22))}</span>`}<span class="art-play">▶</span></button><div class="album-card-meta"><div class="track-name">${esc(t.title)}</div><div class="track-artist">${esc(t.artist||'Unknown artist')}</div><button class="card-art-edit" data-artwork="${t.id}" aria-label="Change artwork" title="Add cover art">＋ Art</button><button class="card-like" data-like="${t.id}" aria-label="Like track">${liked.has(t.id)?'♥':'♡'}</button></div></article>`}
function renderExplore(q=''){let found=tracks.filter(t=>(t.title+' '+t.artist+' '+t.album).toLowerCase().includes(q.toLowerCase()));$('#exploreResults').innerHTML=found.map((t)=>trackRow(t,tracks.indexOf(t))).join('')||'<p class="muted">No matching tracks in your library yet. Add audio files to search your own collection.</p>'}
function renderArtists(){let map={};tracks.forEach(t=>{let a=t.artist||'Unknown artist';map[a]=(map[a]||0)+1});let entries=Object.entries(map);$('#artistGrid').className=entries.length?'artist-grid':'artist-grid empty-state';$('#artistGrid').innerHTML=entries.length?entries.map(([name,count],i)=>`<button class="artist-card" data-artist="${esc(name)}"><div class="artist-avatar" style="background:${palettes[i%palettes.length]}">${esc(name.charAt(0).toUpperCase())}</div><strong>${esc(name)}</strong><small>${count} ${count===1?'track':'tracks'}</small></button>`).join(''):`<div class="empty-icon">◉</div><h3>Your artists will show up here.</h3><p>Add tracks with artist information to discover them here.</p>`}
function renderPlaylists(){$('#playlistNav').innerHTML=playlists.map(p=>`<button data-openlist="${p.id}">♫ ${esc(p.name)}</button>`).join('')||'<p class="muted small">Your playlists will appear here.</p>';$('#homePlaylists').innerHTML=playlists.map((p,i)=>`<button class="artist-card" data-openlist="${p.id}"><div class="playlist-cover" style="width:100%;height:auto;aspect-ratio:1;border-radius:12px;background:${palettes[i%palettes.length]};font-size:30px">♫</div><strong style="margin-top:10px">${esc(p.name)}</strong><small>${p.ids.length} tracks</small></button>`).join('')||'<div class="playlist-placeholder">Your playlists will live here.</div>'}
function switchView(v,push=true){$$('.view').forEach(x=>x.classList.remove('active-view'));let el=$('#'+v+'View');if(el)el.classList.add('active-view');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(push){historyViews=historyViews.slice(0,historyIndex+1);historyViews.push(v);historyIndex++}window.scrollTo({top:0,behavior:'smooth'})}
function playTrack(id){let idx=tracks.findIndex(t=>t.id===id);if(idx<0)return;current=idx;document.body.classList.add('has-track');audio.pause();audio.src=tracks[idx].url;audio.load();updatePlayer();renderQueue();audio.play().then(syncPlaybackUI).catch(()=>{syncPlaybackUI();toast(tracks[idx].online?'Audius could not stream this track. Try another full-track result.':'This file could not be played. Try another audio file.')})}
function updatePlayer(){let t=tracks[current];if(!t)return;setDynamicTheme(t,current);$('#largeCover').innerHTML=coverHTML(t,current);$('#largeCover').style.background=palettes[current%palettes.length];$('#largeTitle').textContent=t.title;$('#largeArtist').textContent=t.artist||'Unknown artist';$('#nowTitle').textContent=t.title;$('#nowArtist').textContent=t.artist||'Unknown artist';$('#miniCover').innerHTML=coverHTML(t,current);$('#miniCover').style.background=palettes[current%palettes.length];$('#likeCurrent').textContent=liked.has(t.id)?'♥':'♡';$('#largeLike').textContent=liked.has(t.id)?'♥':'♡';$('#duration').textContent=fmt(t.duration);$('#largeDuration').textContent=fmt(t.duration);$('#lyricPeekText').textContent=t.lyrics?(t.lyrics.split(/\n/).find(Boolean)||'Open lyrics to sing along'):'Lyrics will appear here when available.';$('#playerBackdrop').style.backgroundImage=t.cover?`linear-gradient(180deg,rgba(5,6,15,.2),rgba(5,6,15,.72)),url("${t.cover}")`:'';$('#playerBackdrop').style.backgroundSize='cover';$('#playerBackdrop').style.backgroundPosition='center';$('#lyricsContent').innerHTML=t.lyrics?`<div class="lyrics-text">${esc(t.lyrics)}</div>`:`<div class="lyrics-symbol">♫</div><h3>Let the words find you.</h3><p>No lyrics added for this track yet.<br>Use the track details option to add lyrics you have permission to use.</p>`}
function renderQueue(){let rest=tracks.slice(current+1);$('#queueContent').innerHTML=rest.length?rest.map(t=>`<div class="queue-item"><div class="cover">${coverHTML(t)}</div><div><strong>${esc(t.title)}</strong><small>${esc(t.artist||'Unknown artist')}</small></div></div>`).join(''):'<p class="muted small">Nothing else in the queue.</p>'}
function next(){if(!tracks.length)return;let n=shuffle?Math.floor(Math.random()*tracks.length):(current+1)%tracks.length;playTrack(tracks[n].id)}
function toggleLike(id){if(liked.has(id))liked.delete(id);else liked.add(id);renderTracks();updatePlayer()}
function addFiles(files){[...files].filter(f=>f.type.startsWith('audio/')).forEach(file=>{let url=URL.createObjectURL(file);let t={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),title:file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' '),artist:'Unknown artist',album:'Local collection',duration:0,url,lyrics:'',file};tracks.push(t);let a=new Audio();a.src=url;a.addEventListener('loadedmetadata',()=>{t.duration=a.duration;renderTracks()},{once:true})});renderTracks();toast('Music added to your VYBE library');}
function openPlaylist(id){activePlaylist=playlists.find(p=>p.id===id);if(!activePlaylist)return;switchView('playlist',false);$('#playlistDetail').innerHTML=`<div class="playlist-hero"><div class="playlist-cover">♫</div><div><p class="eyebrow">YOUR PLAYLIST</p><h1>${esc(activePlaylist.name)}</h1><p>${activePlaylist.ids.length} tracks · Curated by you</p><button class="primary-btn" id="playListAll">▶ Play playlist</button></div></div><div class="section-heading"><div><p class="eyebrow">YOUR SELECTION</p><h2>Tracks</h2></div></div><div class="track-list">${activePlaylist.ids.map(id=>tracks.find(t=>t.id===id)).filter(Boolean).map(t=>trackRow(t,tracks.indexOf(t))).join('')||'<p class="muted">Add tracks to this playlist from the library.</p>'}</div>`;$('#playListAll').onclick=()=>{let first=tracks.find(t=>activePlaylist.ids.includes(t.id));if(first)playTrack(first.id)}}
$('#audioFiles').addEventListener('change',e=>addFiles(e.target.files));['addMusicTop','addMusicSide','emptyAdd'].forEach(id=>{let b=$('#'+id);if(b)b.onclick=()=>$('#audioFiles').click()});
$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>{switchView(b.dataset.go);if(b.dataset.filter){libraryFilter=b.dataset.filter;$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.filter===libraryFilter));renderTracks()}});
const heroExplore=$('#heroExplore');if(heroExplore)heroExplore.onclick=()=>switchView('explore');
$('#globalSearch').addEventListener('input',e=>{switchView('explore',false);$('#exploreSearch').value=e.target.value;renderExplore(e.target.value)});
$('#exploreSearch').addEventListener('input',e=>renderExplore(e.target.value));
function createPlaylist(){let name=prompt('Name your new playlist:');if(!name||!name.trim())return;let p={id:String(Date.now()),name:name.trim(),ids:[]};playlists.push(p);renderPlaylists();toast('Playlist created')}
$('#newPlaylist').onclick=createPlaylist;$('#homeNewPlaylist').onclick=createPlaylist;
$('#goBack').onclick=()=>{if(historyIndex>0){historyIndex--;switchView(historyViews[historyIndex],false)}};$('#goForward').onclick=()=>{if(historyIndex<historyViews.length-1){historyIndex++;switchView(historyViews[historyIndex],false)}};
$('#prevBtn').onclick=()=>{if(audio.currentTime>3){audio.currentTime=0}else if(current>0)playTrack(tracks[current-1].id)};
$('#nextBtn').onclick=next;$('#playBtn').onclick=()=>{if(current<0){if(tracks[0])playTrack(tracks[0].id);else toast('Add music to start listening')}else if(audio.paused){audio.play().then(syncPlaybackUI).catch(()=>toast('Could not resume playback.'))}else{audio.pause();syncPlaybackUI()}};
$('#shuffleBtn').onclick=()=>{$('#shuffleBtn').classList.toggle('active');shuffle=!shuffle;toast(shuffle?'Shuffle on':'Shuffle off')};
$('#repeatBtn').onclick=()=>{$('#repeatBtn').classList.toggle('active');repeat=!repeat;toast(repeat?'Repeat on':'Repeat off')};
$('#likeCurrent').onclick=()=>{if(tracks[current])toggleLike(tracks[current].id)};
$('#progress').oninput=e=>{if(audio.duration)audio.currentTime=(e.target.value/100)*audio.duration};
audio.addEventListener('timeupdate',()=>{if(audio.duration){const pct=audio.currentTime/audio.duration*100;$('#progress').value=pct;$('#largeProgress').value=pct;$('#currentTime').textContent=fmt(audio.currentTime);$('#duration').textContent=fmt(audio.duration);$('#largeCurrentTime').textContent=fmt(audio.currentTime);$('#largeDuration').textContent=fmt(audio.duration)}});
audio.addEventListener('ended',()=>{if(repeat){audio.currentTime=0;audio.play().then(syncPlaybackUI)}else next()});
audio.addEventListener('play',syncPlaybackUI);audio.addEventListener('pause',syncPlaybackUI);audio.addEventListener('error',()=>{syncPlaybackUI();const t=tracks[current];toast(t?.online?'This Audius stream is unavailable or restricted. Try another track.':'Audio format could not be loaded by this browser.')});
audio.addEventListener('loadedmetadata',()=>{$('#duration').textContent=fmt(audio.duration);$('#progress').value=0;$('#largeProgress').value=0;$('#currentTime').textContent='0:00'});
$('#volume').oninput=e=>{audio.volume=e.target.value;$('#largeVolume').value=e.target.value};
$('#lyricsBtn').onclick=()=>{$('#lyricsPanel').classList.add('open');$('#queuePanel').classList.remove('open')};
$('#queueBtn').onclick=()=>{$('#queuePanel').classList.add('open');$('#lyricsPanel').classList.remove('open')};
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('open'));
$('#playlistBack').onclick=()=>switchView('library');
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');libraryFilter=b.dataset.filter;renderTracks()});
document.addEventListener('click',e=>{let edit=e.target.closest('[data-edit]');if(edit){let t=tracks.find(x=>x.id===edit.dataset.edit);if(t){let artist=prompt('Artist name:',t.artist==='Unknown artist'?'':t.artist);if(artist===null)return;let album=prompt('Album name:',t.album==='Local collection'?'':t.album);if(album===null)return;let lyrics=prompt('Lyrics (only text you wrote or have permission to use):',t.lyrics||'');if(lyrics===null)return;t.artist=artist.trim()||'Unknown artist';t.album=album.trim()||'Local collection';t.lyrics=lyrics;renderTracks();if(current>=0&&tracks[current].id===t.id)updatePlayer();toast('Track details updated')}}let p=e.target.closest('[data-play]');if(p)playTrack(p.dataset.play);let artwork=e.target.closest('[data-artwork]');if(artwork){let t=tracks.find(x=>x.id===artwork.dataset.artwork);if(t){let picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.onchange=()=>{let file=picker.files[0];if(file){if(t.cover&&t.cover.startsWith('blob:'))URL.revokeObjectURL(t.cover);t.cover=URL.createObjectURL(file);renderTracks();if(current>=0&&tracks[current].id===t.id)updatePlayer();toast('Cover artwork updated')}};picker.click()}}let l=e.target.closest('[data-like]');if(l)toggleLike(l.dataset.like);let pl=e.target.closest('[data-openlist]');if(pl)openPlaylist(pl.dataset.openlist);let artist=e.target.closest('[data-artist]');if(artist){switchView('explore');$('#exploreSearch').value=artist.dataset.artist;renderExplore(artist.dataset.artist)}let mood=e.target.closest('[data-mood]');if(mood){switchView('explore');$('#exploreSearch').value=mood.dataset.mood;renderExplore(mood.dataset.mood);toast('Showing matches in your collection')}});
$('#artistGrid').addEventListener('click',()=>{});

$('#miniCover').title='Open full player';
$('#miniCover').addEventListener('click',()=>$('#nowPlaying').classList.add('open'));
$('#nowTitle').addEventListener('click',()=>$('#nowPlaying').classList.add('open'));
$('#closeNowPlaying').onclick=()=>$('#nowPlaying').classList.remove('open');
$('#largePlay').onclick=()=>$('#playBtn').click();
$('#largePrev').onclick=()=>$('#prevBtn').click();
$('#largeNext').onclick=()=>$('#nextBtn').click();
$('#largeProgress').oninput=e=>{if(audio.duration)audio.currentTime=(e.target.value/100)*audio.duration};
$('#largeVolume').oninput=e=>{audio.volume=Number(e.target.value);$('#volume').value=e.target.value};
$('#largeLike').onclick=()=>{if(tracks[current])toggleLike(tracks[current].id)};
$('#largeLyrics').onclick=()=>$('#lyricsBtn').click();
$('#lyricPeek').onclick=()=>$('#lyricsBtn').click();
$('#largeQueue').onclick=()=>$('#queueBtn').click();
$('#largeShuffle').onclick=()=>$('#shuffleBtn').click();
$('#largeRepeat').onclick=()=>$('#repeatBtn').click();
$('#largeMore').onclick=()=>{if(tracks[current]){let t=tracks[current];toast(`${t.title} · ${t.artist||'Unknown artist'}`)}};
$('#largeDevice').onclick=()=>toast('Playing on this device');
audio.addEventListener('timeupdate',()=>{if(audio.duration){$('#largeProgress').value=audio.currentTime/audio.duration*100;$('#largeCurrentTime').textContent=fmt(audio.currentTime);$('#largeDuration').textContent=fmt(audio.duration)}});
renderTracks();audio.volume=.8;


/* VYBE 3.4 · Full-track discovery and playback via Audius API */
const AUDIUS_API='https://api.audius.co/v1';
let onlineKind='song', onlineTimer=null, onlineRequest=0, onlineCache=[];
async function audiusGet(path, params={}){
 const url=new URL(AUDIUS_API+path);
 Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')url.searchParams.set(k,v)});
 const response=await fetch(url.toString(),{headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error(`Audius request failed (${response.status})`);
 const payload=await response.json();
 if(payload.error)throw new Error(payload.error);
 return payload.data||[];
}
function onlineEmpty(title,copy){$('#onlineResults').innerHTML=`<div class="online-empty"><span>✦</span><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`}
function audiusArtwork(t){
 const a=t.artwork||t.profile_picture||{};
 return a['1000x1000']||a['480x480']||a['150x150']||a._1000x1000||a._480x480||a._150x150||a.url||'';
}
function canAudiusStream(t){
 const v=t.is_streamable??t.isStreamable;
 return v!==false&&v!=='false'&&t.is_available!==false&&t.isAvailable!==false;
}
function onlineCard(t){
 const cover=audiusArtwork(t);
 const artist=t.user?.name||t.user?.handle||'Independent artist';
 const duration=Number(t.duration)||0;
 const playable=canAudiusStream(t);
 return `<article class="online-card">
   <div class="online-art">${cover?`<img src="${esc(cover)}" alt="">`:`<span>♫</span>`}
     ${playable?`<button class="online-play" data-audius-play="${esc(t.id)}" aria-label="Play full track ${esc(t.title||'Untitled')}">▶</button>`:''}
   </div>
   <div class="online-card-info"><strong>${esc(t.title||'Untitled')}</strong><span>${esc(artist)} · ${fmt(duration)}</span>
   <div class="online-card-actions">${playable?`<button class="online-action" data-audius-play="${esc(t.id)}">▶ Play full track</button>`:'<span class="muted small">Not streamable</span>'}<span class="muted small">Audius</span></div></div>
 </article>`;
}
function artistCard(u){
 const picture=u.profile_picture?.['150x150']||u.profile_picture?.['480x480']||'';
 return `<article class="online-card"><div class="online-art">${picture?`<img src="${esc(picture)}" alt="">`:'<span>◉</span>'}</div><div class="online-card-info"><strong>${esc(u.name||u.handle||'Artist')}</strong><span>@${esc(u.handle||'artist')}</span><div class="online-card-actions"><button class="online-action" data-audius-artist="${esc(u.id)}">View full tracks</button></div></div></article>`;
}
async function searchOnline(term){
 const results=$('#onlineResults');if(!results)return;
 if(!term.trim()){onlineEmpty('Find your next full-length track.','Search Audius for independent artists and music that can stream inside VYBE.');$('#onlineTitle').textContent='Full-track music discovery';return}
 if(onlineKind==='playlist'){
  onlineEmpty('Playlists are coming later.','Search for a song or artist to play full tracks inside VYBE.');$('#onlineTitle').textContent='Playlists';return;
 }
 const req=++onlineRequest;
 $('#onlineTitle').textContent=`Searching ${onlineKind==='musicArtist'?'artists':onlineKind==='album'?'music':'full tracks'} for “${term}”`;
 results.innerHTML='<div class="online-loading"><span class="loading-orb"></span>Finding music you can play in full…</div>';
 try{
  if(onlineKind==='musicArtist'){
   const found=await audiusGet('/users/search',{query:term,limit:24});
   if(req!==onlineRequest)return;
   onlineCache=found;
   results.innerHTML=found.length?`<div class="online-grid">${found.map(artistCard).join('')}</div>`:'<div class="online-empty"><span>⌕</span><strong>No artists found.</strong><p>Try another spelling.</p></div>';
  }else{
   const found=await audiusGet('/tracks/search',{query:term,limit:24});
   if(req!==onlineRequest)return;
   onlineCache=found;
   const playable=found.filter(t=>t.is_streamable!==false&&t.is_available!==false);
   results.innerHTML=found.length?`<div class="online-grid">${found.map(onlineCard).join('')}</div><p class="catalog-note">Full-track playback is provided by Audius for tracks the artist has made streamable. Tracks that are unavailable or restricted won't play. Mainstream commercial releases may not be in this catalogue.</p>`:'<div class="online-empty"><span>⌕</span><strong>No tracks found.</strong><p>Try an artist name, song title or another search.</p></div>';
  }
 }catch(e){if(req===onlineRequest)onlineEmpty('Could not reach Audius.','Check your internet connection and try again.')}
}
async function showAudiusArtistTracks(id){
 const results=$('#onlineResults');results.innerHTML='<div class="online-loading">Loading artist tracks…</div>';
 try{
  const found=await audiusGet(`/users/${encodeURIComponent(id)}/tracks`,{limit:24});
  onlineCache=found;
  results.innerHTML=found.length?`<div class="online-grid">${found.map(onlineCard).join('')}</div>`:'<div class="online-empty"><strong>No public tracks available.</strong><p>This artist has no public streamable tracks listed.</p></div>';
  $('#onlineTitle').textContent='Artist tracks';
 }catch(e){onlineEmpty('Could not load artist tracks.','Please try again.')}
}
function scheduleOnlineSearch(value){clearTimeout(onlineTimer);onlineTimer=setTimeout(()=>searchOnline(value),420)}
$('#exploreSearch')?.addEventListener('input',e=>scheduleOnlineSearch(e.target.value));
$('#globalSearch')?.addEventListener('input',e=>scheduleOnlineSearch(e.target.value));
$('#onlineTabs')?.addEventListener('click',e=>{
 const b=e.target.closest('[data-kind]');if(!b)return;
 onlineKind=b.dataset.kind;
 $$('#onlineTabs .online-tab').forEach(x=>x.classList.toggle('active',x===b));
 scheduleOnlineSearch($('#exploreSearch').value||$('#globalSearch').value||'');
});
function addAudiusTrack(id){
 const r=onlineCache.find(x=>String(x.id)===String(id));
 if(!r){toast('This track is no longer in the results. Search again.');return}
 if(!canAudiusStream(r)){toast('This artist has not made this track streamable.');return}
 let t=tracks.find(x=>x.onlineId===String(r.id));
 if(!t){
  const artwork=audiusArtwork(r);
  t={id:'audius-'+r.id,onlineId:String(r.id),title:r.title||'Untitled',artist:r.user?.name||r.user?.handle||'Independent artist',album:r.album?.name||'Audius',duration:Number(r.duration)||0,url:`${AUDIUS_API}/tracks/${encodeURIComponent(r.id)}/stream?app_name=VYBE`,cover:artwork,lyrics:'',online:true,source:'Audius'};
  tracks.push(t);renderTracks();
 }
 playTrack(t.id);
 toast('Loading full track from Audius…');
}
document.addEventListener('click',e=>{
 const p=e.target.closest('[data-audius-play]');
 if(p){e.preventDefault();addAudiusTrack(p.dataset.audiusPlay);return}
 const a=e.target.closest('[data-audius-artist]');
 if(a){e.preventDefault();showAudiusArtistTracks(a.dataset.audiusArtist)}
});
/* Keep desktop and touch navigation in sync. */
$$('.mobile-nav-item').forEach(b=>b.addEventListener('click',()=>{
 switchView(b.dataset.view);
 $$('.mobile-nav-item').forEach(x=>x.classList.toggle('active',x===b));
}));
const oldSwitchView=switchView;
switchView=function(v,push=true){
 oldSwitchView(v,push);
 $$('.mobile-nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
};

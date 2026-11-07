const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
let key = store.get('vybe.key', ''), liked = store.get('vybe.liked', []), hist = store.get('vybe.hist', []), ids = store.get('vybe.ids', {});
let prev = 'home', cur = 'home', dcol = [];
let queue = [], idx = -1, shuf = false, yt = null, ytReady = false, pending = null, local = [], top = [];
const audio = new Audio();
const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// Deezer has no CORS, so it is called with JSONP (charts, artist pictures, album covers)
function dz(path) {
  return new Promise((res, rej) => {
    const cb = 'dz' + Math.random().toString(36).slice(2), s = document.createElement('script');
    const done = () => { clearTimeout(t); delete window[cb]; s.remove(); };
    const t = setTimeout(() => { done(); rej(new Error('timeout')); }, 8000);
    window[cb] = d => { done(); res(d); };
    s.onerror = () => { done(); rej(new Error('failed')); };
    s.src = 'https://api.deezer.com' + path + (path.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    document.head.appendChild(s);
  });
}

// Songs you add are saved in the browser (IndexedDB) so they stay after you close the tab
const db = new Promise((res, rej) => { const r = indexedDB.open('vybe', 1); r.onupgradeneeded = () => r.result.createObjectStore('files', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = rej; });
const tx = async (m, f) => { const d = await db; return new Promise((res, rej) => { const r = f(d.transaction('files', m).objectStore('files')); r.onsuccess = () => res(r.result); r.onerror = rej; }); };
const toLocal = f => ({ src: 'local', id: f.id, title: f.name, sub: 'On this device', url: URL.createObjectURL(f.blob), fileName: f.fileName });
async function loadLocal() { try { local = (await tx('readonly', s => s.getAll())).map(toLocal); } catch { local = []; } }

function show(v) {
  if (v !== cur) { prev = cur; cur = v; }
  $$('.view').forEach(x => x.classList.toggle('on', x.id === v));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'library') renderLibrary();
  if (v === 'home') renderRecent();
  scrollTo(0, 0);
}
function card(img, title, sub, open, playFn, round) {
  const c = el('div', 'card' + (round ? ' round' : '')), w = el('div', 'cv');
  const i = el('img'); i.src = img || ''; i.alt = ''; i.loading = 'lazy'; w.append(i);
  if (playFn) { const p = el('button', 'pl', '▶'); p.setAttribute('aria-label', 'Play ' + title); p.onclick = e => { e.stopPropagation(); playFn(); }; w.append(p); }
  w.tabIndex = 0; w.onclick = open; w.onkeydown = e => { if (e.key === 'Enter') open(); };
  c.append(w, el('span', '', title)); if (sub) c.append(el('small', 'muted', sub)); return c;
}

const isLiked = t => liked.some(x => x.src === t.src && x.id === t.id);
function toggleLike(t) {
  if (t.src === 'local') return;
  liked = isLiked(t) ? liked.filter(x => !(x.src === t.src && x.id === t.id)) : [...liked, t];
  store.set('vybe.liked', liked); syncLike();
}
function syncLike() { const t = queue[idx]; $$('[data-act=like]').forEach(b => b.textContent = t && isLiked(t) ? '♥' : '♡'); }

function trackRow(list, i) {
  const t = list[i], r = el('div', 'track');
  const im = el('img'); im.src = t.thumb || ''; im.alt = '';
  const info = el('div', 'i'); info.append(el('b', '', t.title), el('small', '', t.sub));
  info.onclick = () => play(list, i);
  r.append(im, info);
  if (t.src === 'local') {
    const dl = el('a', '', '⬇'); dl.href = t.url; dl.download = t.fileName || t.title; dl.title = 'Download';
    const rm = el('button', '', '✕'); rm.title = 'Remove';
    rm.onclick = async () => { await tx('readwrite', s => s.delete(t.id)); local = local.filter(x => x.id !== t.id); renderLibrary(); };
    r.append(dl, rm);
  } else {
    const lk = el('button', '', isLiked(t) ? '♥' : '♡'); lk.title = 'Like';
    lk.onclick = () => { toggleLike(t); lk.textContent = isLiked(t) ? '♥' : '♡'; };
    r.append(lk);
  }
  return r;
}
const renderList = (box, list) => { box.replaceChildren(); list.forEach((_, i) => box.append(trackRow(list, i))); };

async function ytFind(q) {
  if (ids[q]) return ids[q];
  if (!key) { show('explore'); $('#keybox').hidden = false; $('#msg').textContent = 'Add your YouTube key to play songs.'; return null; }
  try {
    const d = await (await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=1&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key))).json();
    const id = d.items?.[0]?.id.videoId || null;
    if (id) { ids[q] = id; store.set('vybe.ids', ids); }
    return id;
  } catch { return null; }
}

async function search(q) {
  q = q.trim(); if (!q) return;
  show('explore'); $('#q').value = q; $('#keybox').hidden = !!key;
  ['#songs', '#artistsHit', '#albumsHit'].forEach(s => $(s).replaceChildren());
  $('#msg').textContent = 'Searching…';
  const yts = key ? fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key)).then(r => r.json()) : Promise.resolve(null);
  const [y, a, al] = await Promise.allSettled([yts, dz('/search/artist?limit=10&q=' + encodeURIComponent(q)), dz('/search/album?limit=10&q=' + encodeURIComponent(q))]);
  (a.value?.data || []).forEach(x => $('#artistsHit').append(card(x.picture_big, x.name, 'Artist', () => openCol('artist', x.id, x.name, 'Top tracks', x.picture_big), () => playOnly('artist', x.id), true)));
  (al.value?.data || []).forEach(x => $('#albumsHit').append(card(x.cover_big, x.title, x.artist?.name, () => openCol('album', x.id, x.title, x.artist?.name, x.cover_big), () => playOnly('album', x.id, x.cover_big))));
  const d = y.value;
  if (!key) $('#msg').textContent = 'Add your YouTube key above to search songs.';
  else if (d?.error) $('#msg').textContent = 'YouTube said: ' + d.error.message;
  else if (!d?.items?.length) $('#msg').textContent = 'No songs found. Try another search.';
  else {
    $('#msg').textContent = '';
    const list = d.items.map(v => ({ src: 'yt', id: v.id.videoId, title: decode(v.snippet.title), sub: decode(v.snippet.channelTitle), thumb: v.snippet.thumbnails.medium?.url }));
    renderList($('#songs'), list); queue = list;
  }
}

function paint(t) {
  $('#t').textContent = $('#t2').textContent = t.title;
  $('#s').textContent = $('#s2').textContent = t.sub;
  $('#art').src = t.thumb || '';
  $('#ambient').style.backgroundImage = t.thumb ? `url("${t.thumb}")` : '';
  $('#ambient').classList.toggle('art', !!t.thumb);
  $('#addLyr').textContent = 'Add lyrics'; $('#lyrEd').hidden = true;
  syncLike();
}
async function play(list, i) {
  queue = list; idx = i; const t = list[i]; paint(t); loadLyrics(t);
  if (t.src === 'q') {
    const id = await ytFind(t.q);
    if (queue[idx] !== t) return;
    if (!id) { $('#s').textContent = 'Could not find this song'; return; }
    t.id = id; t.src = 'yt';
  }
  addHist(t);
  if (t.src === 'yt') {
    audio.pause(); $('#stage').classList.add('on');
    if (ytReady) yt.loadVideoById(t.id); else pending = t.id;
  } else {
    if (ytReady) yt.pauseVideo();
    $('#stage').classList.remove('on'); audio.src = t.url; audio.play();
  }
}
function step(d) {
  if (!queue.length) return;
  play(queue, shuf ? Math.floor(Math.random() * queue.length) : (idx + d + queue.length) % queue.length);
}
function toggle() {
  const t = queue[idx]; if (!t) return;
  if (t.src === 'yt' && ytReady) (yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo());
  else audio.paused ? audio.play() : audio.pause();
}
const setPP = on => $$('[data-act=pp]').forEach(b => b.textContent = on ? '⏸' : '▶');
window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt', { width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0 }, events: {
    onReady: () => { ytReady = true; if (pending) { yt.loadVideoById(pending); pending = null; } },
    onStateChange: e => { setPP(e.data === 1); if (e.data === 0) step(1); },
    onError: () => step(1) } });
};
audio.onplay = () => setPP(true); audio.onpause = () => setPP(false); audio.onended = () => step(1);
setInterval(() => {
  const t = queue[idx]; if (!t || t.src === 'q') return;
  const yo = t.src === 'yt' && ytReady;
  const cu = yo ? yt.getCurrentTime() : audio.currentTime, du = yo ? yt.getDuration() : audio.duration;
  $('#cu').textContent = fmt(cu); $('#du').textContent = fmt(du);
  if (du) { const p = cu / du * 100; $('#pg').style.width = p + '%'; if (!$('#sk').matches(':active')) $('#sk').value = p; }
}, 500);
$('#sk').oninput = e => {
  const t = queue[idx]; if (!t) return;
  if (t.src === 'yt' && ytReady) yt.seekTo(yt.getDuration() * e.target.value / 100, true);
  else audio.currentTime = (audio.duration || 0) * e.target.value / 100;
};

// Lyrics: fetched from lyrics.ovh, or pasted by you and saved in this browser
const clean = s => s.replace(/\(.*?\)|\[.*?\]/g, '').replace(/official|music video|video|audio|lyrics?|\bhd\b|4k/gi, '').replace(/\s+/g, ' ').trim();
function parse(t) {
  const c = clean(t.title), p = c.split(/\s[-–|]\s/);
  if (p.length > 1) return { a: p[0].trim(), s: p.slice(1).join(' ').replace(/\s(ft|feat)\.?.*$/i, '').trim() };
  return { a: clean(t.sub.replace(/ - Topic|VEVO/gi, '')), s: c };
}
async function loadLyrics(t) {
  const box = $('#lyr'), k = 'vybe.lyr.' + (t.id || t.title), saved = localStorage.getItem(k);
  if (saved) { box.textContent = saved; return; }
  box.textContent = 'Finding lyrics…';
  const { a, s } = parse(t);
  try {
    const d = await (await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(s)}`)).json();
    if (queue[idx] === t) box.textContent = d.lyrics ? d.lyrics.trim() : 'No lyrics found. Tap Add lyrics to paste them.';
  } catch { if (queue[idx] === t) box.textContent = 'Could not load lyrics. Tap Add lyrics to paste them.'; }
}
$('#addLyr').onclick = () => { const o = $('#lyrEd').hidden; $('#lyrEd').hidden = !o; $('#addLyr').textContent = o ? 'Cancel' : 'Add lyrics'; if (o) $('#lyrIn').value = ''; };
$('#lyrSave').onclick = () => {
  const t = queue[idx], v = $('#lyrIn').value.trim(); if (!t || !v) return;
  localStorage.setItem('vybe.lyr.' + (t.id || t.title), v); $('#lyr').textContent = v; $('#lyrEd').hidden = true; $('#addLyr').textContent = 'Add lyrics';
};

function renderLibrary() {
  renderList($('#liked'), liked);
  if (!liked.length) $('#liked').append(el('p', 'muted', 'Tap ♡ on any song to keep it here.'));
  renderList($('#local'), local);
  if (!local.length) $('#local').append(el('p', 'muted', 'Add songs from your phone. They are saved in VYBE and can be downloaded again with ⬇.'));
}
$('#file').onchange = async e => {
  for (const f of e.target.files) {
    const rec = { id: 'l' + Date.now() + Math.random().toString(36).slice(2, 6), name: f.name.replace(/\.[^.]+$/, ''), fileName: f.name, blob: f };
    await tx('readwrite', s => s.put(rec)); local.push(toLocal(rec));
  }
  renderLibrary();
};

const GENRES = [['Afrobeats', 2, '#16a34a,#a3e635'], ['R&B', 165, '#7c3aed,#f472b6'], ['Hip-Hop', 116, '#dc2626,#facc15'], ['Pop', 132, '#db2777,#fb923c'], ['Dance', 113, '#4f46e5,#c026d3'], ['Electro', 106, '#0891b2,#22d3ee'], ['Jazz', 129, '#b45309,#fbbf24'], ['Rock', 152, '#334155,#ef4444']];
const toTrack = (x, img) => ({ src: 'q', q: x.artist.name + ' ' + x.title + ' official audio', title: x.title, sub: x.artist.name, thumb: img || x.album?.cover_big || x.album?.cover_medium });
async function loadCol(kind, id, img) {
  const p = { playlist: `/playlist/${id}/tracks?limit=50`, album: `/album/${id}/tracks?limit=50`, artist: `/artist/${id}/top?limit=30`, genre: `/chart/${id}/tracks?limit=30` }[kind];
  return (await dz(p)).data.map(x => toTrack(x, kind === 'album' ? img : null));
}
async function openCol(kind, id, title, sub, img) {
  show('detail'); $('#dt').textContent = title; $('#ds').textContent = sub || ''; $('#dimg').src = img || '';
  $('#dlist').replaceChildren(el('p', 'muted', 'Loading…')); dcol = [];
  try { dcol = await loadCol(kind, id, img); if (!img) $('#dimg').src = dcol[0]?.thumb || ''; renderList($('#dlist'), dcol); }
  catch { $('#dlist').replaceChildren(el('p', 'muted', 'Could not load this. Check your connection and try again.')); }
}
async function playOnly(kind, id, img) { try { const l = await loadCol(kind, id, img); if (l.length) play(l, 0); } catch {} }
const mix = l => [...l].sort(() => Math.random() - .5);
function addHist(t) {
  if (t.src !== 'yt') return;
  hist = [{ src: 'yt', id: t.id, title: t.title, sub: t.sub, thumb: t.thumb }, ...hist.filter(x => x.id !== t.id)].slice(0, 12);
  store.set('vybe.hist', hist);
}
function renderRecent() {
  $('#recentWrap').hidden = !hist.length; $('#recent').replaceChildren();
  hist.forEach((t, i) => $('#recent').append(card(t.thumb, t.title, t.sub, () => play(hist, i), () => play(hist, i))));
}
async function loadHome() {
  GENRES.forEach(([n, id, g]) => { const b = el('button', '', n); b.style.setProperty('--g', g); b.onclick = () => openCol('genre', id, n, 'Trending in ' + n); $('#moods').append(b); });
  renderRecent();
  const [tr, ar, pl, al] = await Promise.allSettled([dz('/chart/0/tracks?limit=12'), dz('/chart/0/artists?limit=40'), dz('/chart/0/playlists?limit=12'), dz('/chart/0/albums?limit=12')]);
  if (tr.value) { top = tr.value.data.map(x => toTrack(x)); renderList($('#top'), top); } else $('#top').append(el('p', 'muted', 'Could not load trending music. Check your connection.'));
  (pl.value?.data || []).forEach(x => $('#pls').append(card(x.picture_big, x.title, (x.nb_tracks || '') + ' songs', () => openCol('playlist', x.id, x.title, x.user?.name || 'Playlist', x.picture_big), () => playOnly('playlist', x.id))));
  (al.value?.data || []).forEach(x => $('#albs').append(card(x.cover_big, x.title, x.artist.name, () => openCol('album', x.id, x.title, x.artist.name, x.cover_big), () => playOnly('album', x.id, x.cover_big))));
  (ar.value?.data || []).forEach((x, n) => {
    const mk = () => card(x.picture_big, x.name, 'Artist', () => openCol('artist', x.id, x.name, 'Top tracks', x.picture_big), () => playOnly('artist', x.id), true);
    if (n < 12) $('#chart').append(mk()); $('#artistGrid').append(mk());
  });
}
$('#back').onclick = () => show(prev === 'detail' ? 'home' : prev);
$('#dplay').onclick = () => { if (dcol.length) play(dcol, 0); };
$('#dshuf').onclick = () => { if (dcol.length) play(mix(dcol), 0); };

const sheet = on => { $('#sheet').classList.toggle('on', on); $('#stage').classList.toggle('full', on); };
const act = {
  pp: toggle, next: () => step(1), prev: () => step(-1), open: () => sheet(true), close: () => sheet(false),
  shuf: () => { shuf = !shuf; $$('[data-act=shuf]').forEach(b => b.classList.toggle('on', shuf)); },
  like: () => { const t = queue[idx]; if (t) toggleLike(t); }
};
$$('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); act[b.dataset.act](); });
$('#sf').onsubmit = e => { e.preventDefault(); search($('#q').value); };
$('#kf').onsubmit = e => { e.preventDefault(); key = $('#key').value.trim(); store.set('vybe.key', key); $('#keybox').hidden = !!key; if ($('#q').value) search($('#q').value); };
$$('nav button').forEach(b => b.onclick = () => { sheet(false); show(b.dataset.v); });
$('#heroPlay').onclick = () => { if (top.length) play(mix(top), 0); };
loadLocal(); loadHome();

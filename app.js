/* VYBE 6.5 - (c) 2026 Joram Ndungu Njoroge. All rights reserved. */
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const keep = t => t.src === 'dz' || t.src === 'jm';
const srcPref = () => store.get('vybe.src', 'free'), useYT = () => srcPref() === 'yt' && !!key;
let key = store.get('vybe.key', ''), liked = store.get('vybe.liked', []).filter(keep), hist = store.get('vybe.hist', []).filter(keep);
let prev = 'home', cur = 'home', dcol = [], extra = [], artTk = 0;
let plMode = null, pls = store.get('vybe.pls', []), addT = null, moodDone = false, chartArtists = [], curArt = null;
let queue = [], idx = -1, shuf = false, local = [], trend = [], yt = null, ytReady = false, pending = null;
const ids = store.get('vybe.ids', {}), cur_ = () => queue[idx] || {};
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
  $('#ddel').hidden = !(v === 'detail' && plMode); $('#dsave').hidden = !(v === 'detail' && !plMode);
  if (v === 'explore' && !moodDone) { moodDone = true; moodLoad(''); loadVideos(); }
  syncFavBtn();
  $$('.view').forEach(x => x.classList.toggle('on', x.id === v));
  $$('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'library') renderLibrary();
  if (v === 'home') renderRecent();
  if (v === 'settings') renderSettings();
  if (v === 'mystats') renderStats();
  scrollTo(0, 0); moveThumb(v);
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
  const info = el('div', 'i'); info.append(el('b', '', t.title), el('small', '', t.rel ? t.sub + ' · ' + t.rel.slice(0, 4) : t.sub));
  info.onclick = () => play(list, i); im.onclick = () => play(list, i);
  r.append(im, info);
  if (t.src === 'local') {
    const dl = el('a', '', '⬇'); dl.href = t.url; dl.download = t.fileName || t.title; dl.title = 'Download';
    const rm = el('button', '', '✕'); rm.title = 'Remove';
    rm.onclick = async () => { await tx('readwrite', s => s.delete(t.id)); local = local.filter(x => x.id !== t.id); renderLibrary(); };
    r.append(dl, rm);
  } else {
    const lk = el('button', '', isLiked(t) ? '♥' : '♡'); lk.title = 'Like';
    lk.onclick = () => { toggleLike(t); lk.textContent = isLiked(t) ? '♥' : '♡'; };
    if (plMode && cur === 'detail') {
      const rm = el('button', '', '✕'); rm.title = 'Remove from playlist';
      rm.onclick = () => { const p = pls.find(x => x.id === plMode); if (p) { p.tracks.splice(i, 1); store.set('vybe.pls', pls); openPl(plMode); } };
      r.append(lk, rm);
    } else { const ad = el('button', '', '＋'); ad.title = 'Add to playlist'; ad.onclick = () => openAdd(t); r.append(lk, ad); }
  }
  return r;
}
const renderList = (box, list) => { box.replaceChildren(); list.forEach((_, i) => box.append(trackRow(list, i))); };

const enc = encodeURIComponent;
// Full songs: Jamendo (free, legal, needs a free client ID). Search can use YouTube; playback finds a full Jamendo stream, else a Deezer preview.
let jkey = store.get('vybe.jkey', '');
async function jam(path) {
  if (!jkey) return null;
  try { const d = await (await fetch('https://api.jamendo.com/v3.0/tracks/?client_id=' + enc(jkey) + '&format=json&audioformat=mp32&' + path)).json(); return d.results || null; } catch { return null; }
}
const toJm = x => ({ src: 'jm', id: 'j' + x.id, title: x.name, sub: x.artist_name, thumb: x.image, url: x.audio, dur: x.duration });
const norm = s => clean(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
async function ov(q, n = 12) {
  try { const d = await (await fetch('https://api.openverse.org/v1/audio/?category=music&page_size=' + n + '&q=' + enc(q))).json(); return d.results || null; } catch { return null; }
}
const toOv = x => ({ src: 'jm', id: 'o' + x.id, title: x.title || 'Untitled', sub: x.creator || 'Unknown artist', thumb: x.thumbnail, url: x.url, dur: x.duration ? Math.round(x.duration / 1000) : 0 });
const loadYT = () => { if (window.YT || $('#ytjs')) return; const s = el('script'); s.id = 'ytjs'; s.src = 'https://www.youtube.com/iframe_api'; document.head.append(s); };
async function ytFind(q) {
  if (!useYT()) return null;
  if (ids[q]) return ids[q];
  try {
    const d = await (await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=1&q=' + enc(q) + '&key=' + enc(key))).json();
    const id = d.items?.[0]?.id.videoId || null; if (id) { ids[q] = id; store.set('vybe.ids', ids); } return id;
  } catch { return null; }
}
async function resolve(t) {
  if (t.url || t.src === 'local' || t.src === 'jm') return;
  if (t.src === 'q') {
    const { a, s } = parse(t);
    try { const d = (await dz('/search?limit=1&q=' + enc(a + ' ' + s))).data[0];
      if (d) Object.assign(t, { src: 'dz', id: d.id, title: d.title, sub: d.artist.name, preview: d.preview, dur: d.duration, thumb: d.album?.cover_big || t.thumb }); } catch {}
  }
  if (t.src !== 'dz') return;
  if (t.yt === undefined) t.yt = await ytFind(t.sub + ' ' + t.title + ' official audio');
  if (t.yt) return;
  const d = await ov(t.sub + ' ' + t.title, 8);
  const m = (d || []).find(x => norm(x.title || '').includes(norm(t.title)) && norm(x.creator || '').includes(norm(t.sub).split(' ')[0]));
  if (m) t.url = m.url;
}
async function search(q) {
  q = q.trim(); if (!q) return;
  show('explore'); $('#q').value = q; $('#moodBox').hidden = true;
  ['#songs', '#auSongs', '#artistsHit', '#albumsHit'].forEach(s => $(s).replaceChildren()); $('#auH').hidden = true;
  $('#msg').textContent = 'Searching…';
  const yts = useYT() ? fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=' + enc(q) + '&key=' + enc(key)).then(r => r.json()) : dz('/search?limit=25&q=' + enc(q));
  const [y, a, al, f] = await Promise.allSettled([yts, dz('/search/artist?limit=10&q=' + enc(q)), dz('/search/album?limit=10&q=' + enc(q)), ov(q, 15)]);
  (a.value?.data || []).forEach(x => $('#artistsHit').append(card(x.picture_big, x.name, 'Artist', () => openCol('artist', x.id, x.name, 'Top tracks', x.picture_big), () => playOnly('artist', x.id), true)));
  (al.value?.data || []).forEach(x => $('#albumsHit').append(card(x.cover_big, x.title, x.artist?.name, () => openCol('album', x.id, x.title, x.artist?.name, x.cover_big), () => playOnly('album', x.id, x.cover_big))));
  const d = y.value;
  const list = useYT() ? (d?.items || []).map(v => ({ src: 'q', id: 'y' + v.id.videoId, yt: v.id.videoId, title: decode(v.snippet.title), sub: decode(v.snippet.channelTitle), thumb: v.snippet.thumbnails.medium?.url }))
                   : (d?.data || []).filter(x => x.preview).map(x => toTrack(x));
  if (list.length) { $('#msg').textContent = ''; renderList($('#songs'), list); }
  else $('#msg').textContent = d?.error ? 'YouTube said: ' + d.error.message : 'No songs found. Try another search.';
  const fl = (f.value || []).map(toOv);
  if (fl.length) { $('#auH').hidden = false; renderList($('#auSongs'), fl); }
}

function paint(t) {
  $('#t').textContent = $('#t2').textContent = t.title;
  $('#s').textContent = $('#s2').textContent = t.sub;
  $('#art').src = $('#bigart').src = t.thumb || '';
  const u = t.thumb ? `url("${t.thumb}")` : 'none';
  document.documentElement.style.setProperty('--cover', u);
  $('#ambient').style.backgroundImage = t.thumb ? u : '';
  $('#ambient').classList.toggle('art', !!t.thumb);
  $('#addLyr').textContent = 'Add lyrics'; $('#lyrEd').hidden = true;
  lyrHead();
  syncLike();
}
async function play(list, i) {
  queue = list; idx = i; const t = list[i]; paint(t); $('#srcbadge').textContent = 'Finding full song…';
  await resolve(t); if (queue[idx] !== t) return;
  const u = t.url || t.preview;
  if (!t.yt && !u) { $('#srcbadge').textContent = 'No playable version found'; return; }
  t.retry = false; t.started = true; t.viaYT = !!t.yt; paint(t); loadLyrics(t); addHist(t);
  if ($('#qsheet').classList.contains('on')) renderQueue();
  if (t.viaYT) {
    audio.pause(); $('#stage').classList.add('on'); $('#srcbadge').textContent = 'Full song · YouTube';
    if (ytReady) { yt.loadVideoById(t.yt); yt.setVolume(curVol * 100); } else pending = t.yt;
  } else {
    if (ytReady) yt.pauseVideo(); $('#stage').classList.remove('on');
    $('#srcbadge').textContent = t.url ? 'Full song' : '30s preview only';
    audio.src = t.src === 'local' ? t.url : u; audio.play().catch(() => {});
  }
}
function step(d) {
  if (!queue.length) return;
  if (d > 0 && !shuf && idx === queue.length - 1 && store.get('vybe.auto', true)) { autoMore(); return; }
  play(queue, shuf ? Math.floor(Math.random() * queue.length) : (idx + d + queue.length) % queue.length);
}
function toggle() {
  const t = queue[idx]; if (!t) return;
  if (!t.started) { play(queue, idx); return; }
  if (t.viaYT && ytReady) yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo();
  else audio.paused ? audio.play() : audio.pause();
}
const setPP = on => document.body.classList.toggle('playing', on);
audio.onplay = () => { if (!cur_().viaYT) setPP(true); }; audio.onpause = () => { if (!cur_().viaYT) setPP(false); }; audio.onended = () => step(1);
window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt', { width: '100%', height: '100%', playerVars: { playsinline: 1, rel: 0 }, events: {
    onReady: () => { ytReady = true; yt.setVolume(curVol * 100); if (pending) { yt.loadVideoById(pending); pending = null; } },
    onStateChange: e => { if (!cur_().viaYT) return; if (e.data === 1) yt.setPlaybackRate(+store.get('vybe.speed', 1)); setPP(e.data === 1); if (e.data === 0) step(1); },
    onError: () => { const t = cur_(); if (t.viaYT) { t.yt = null; play(queue, idx); } } } });
};
// Preview links expire after a while, so a failed one is looked up again once
audio.onerror = async () => {
  const t = queue[idx]; if (!t || t.retry) return; t.retry = true;
  if (t.url && t.preview) { t.url = null; audio.src = t.preview; audio.play(); $('#srcbadge').textContent = '30s preview only'; return; }
  if (t.src !== 'dz') return;
  try { const d = await dz('/track/' + t.id); if (d.preview && queue[idx] === t) { t.url = null; t.preview = d.preview; audio.src = d.preview; audio.play(); $('#srcbadge').textContent = '30s preview only'; } } catch {}
};
let tk = 0;
setInterval(() => {
  const t = queue[idx]; if (!t) return;
  const yo = t.viaYT && ytReady, cu = yo ? yt.getCurrentTime() : audio.currentTime, du = yo ? yt.getDuration() : audio.duration;
  if (yo ? yt.getPlayerState() === 1 : !audio.paused) { stats.secs += .25; stats.days[day()] = (stats.days[day()] || 0) + .25; if (++tk % 40 === 0) store.set('vybe.stats', stats); }
  $('#cu').textContent = fmt(cu); $('#du').textContent = fmt(du);
  if (du) { const p = cu / du * 100; $('#pg').style.width = p + '%'; if (!$('#sk').matches(':active') && !$('#lsk').matches(':active')) { for (const k of [$('#sk'), $('#lsk')]) { k.value = p; k.style.setProperty('--p', p + '%'); } } }
  tickLyrics(cu);
  if (t.viaYT && yo && du && lrcDur && !autoDone && lines.length) { autoDone = true; if (store.get(offKey(t), null) == null) { const df = du - lrcDur; offset = (df > 1 && df < 45) ? -df : 0; } }
}, 250);
$('#lsk').oninput = e => { $('#sk').value = e.target.value; $('#sk').oninput(e); e.target.style.setProperty('--p', e.target.value + '%'); };
$('#sk').oninput = e => {
  $('#sk').style.setProperty('--p', e.target.value + '%');
  const t = queue[idx]; if (!t) return;
  if (t.viaYT && ytReady) yt.seekTo(yt.getDuration() * e.target.value / 100, true); else audio.currentTime = (audio.duration || 0) * e.target.value / 100;
};

// Lyrics: synced lines from LRCLIB (free), or pasted by you (plain or .lrc) and saved in this browser
const clean = s => s.replace(/\(.*?\)|\[.*?\]/g, '').replace(/official|music video|video|audio|lyrics?|\bhd\b|4k/gi, '').replace(/\s+/g, ' ').trim();
function parse(t) {
  if (t.src === 'dz') return { a: t.sub.split(/,|&/)[0].trim(), s: clean(t.title) };
  const c = clean(t.title), p = c.split(/\s[-–|]\s/);
  if (p.length > 1) return { a: p[0].trim(), s: p.slice(1).join(' ').trim() };
  return { a: '', s: c };
}
let lines = [], act_i = -1, offset = null, lrcDur = 0, autoDone = false;
const offKey = t => 'vybe.off.' + (t.id || t.title);
function setLyrics(txt) {
  const box = $('#lyr'); box.replaceChildren(); lines = []; act_i = -1;
  const re = /^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/;
  const p = txt.split(/\r?\n/).map(l => { const m = re.exec(l); return m ? { t: +m[1] * 60 + +m[2], x: m[3] } : null; }).filter(Boolean);
  if (p.length > 3) {
    lines = p; p.forEach((l, i) => { const d = el('div', 'ln', l.x || '♪'); d.onclick = () => align(i); box.append(d); });
  } else box.append(el('pre', 'plain', txt));
  box.classList.toggle('nosync', !!lines.length && offset == null);
}
// Previews are a 30s clip from the middle of a song, so tap the line you hear once to line them up
function align(i) {
  const t = queue[idx]; if (!t) return;
  offset = lines[i].t - audio.currentTime; store.set(offKey(t), offset); $('#lyr').classList.remove('nosync');
}
function tickLyrics(cu) {
  if (!lines.length || offset == null) return;
  const lt = cu + offset; let n = -1;
  for (let i = 0; i < lines.length && lines[i].t <= lt; i++) n = i;
  if (n === act_i) return; act_i = n;
  const kids = $('#lyr').children;
  [...kids].forEach((k, i) => k.classList.toggle('on', i === n));
  const k = kids[n]; if (k) $('#lyr').scrollTo({ top: k.offsetTop - $('#lyr').clientHeight / 2 + k.clientHeight / 2, behavior: 'smooth' });
}
async function loadLyrics(t) {
  const box = $('#lyr'), k = 'vybe.lyr.' + (t.id || t.title), saved = localStorage.getItem(k);
  lrcDur = 0; autoDone = false;
  offset = (t.src === 'local' || t.url || t.yt) ? store.get(offKey(t), 0) : store.get(offKey(t), null); lines = []; act_i = -1; $('#lyr').classList.remove('nosync');
  if (saved) { setLyrics(saved); return; }
  box.textContent = 'Finding lyrics…';
  const { a, s } = parse(t), live = () => queue[idx] === t;
  try {
    let d = null;
    const r = await fetch(`https://lrclib.net/api/get?artist_name=${enc(a)}&track_name=${enc(s)}` + (t.dur ? '&duration=' + t.dur : ''));
    if (r.ok) d = await r.json();
    if (!d?.syncedLyrics && !d?.plainLyrics) { const l = await (await fetch(`https://lrclib.net/api/search?track_name=${enc(s)}` + (a ? '&artist_name=' + enc(a) : ''))).json(); d = l.find(x => x.syncedLyrics) || l.find(x => x.plainLyrics) || null; }
    if (!live()) return;
    lrcDur = d?.duration || 0;
    const txt = d?.syncedLyrics || d?.plainLyrics;
    if (txt) setLyrics(txt); else box.textContent = 'No lyrics found. Tap Add lyrics to paste them.';
  } catch { if (live()) box.textContent = 'Could not load lyrics. Tap Add lyrics to paste them.'; }
}
$('#addLyr').onclick = () => { const o = $('#lyrEd').hidden; $('#lyrEd').hidden = !o; $('#addLyr').textContent = o ? 'Cancel' : 'Add lyrics'; if (o) $('#lyrIn').value = ''; };
$('#lyrSave').onclick = () => {
  const t = queue[idx], v = $('#lyrIn').value.trim(); if (!t || !v) return;
  localStorage.setItem('vybe.lyr.' + (t.id || t.title), v); setLyrics(v); $('#lyrEd').hidden = true; $('#addLyr').textContent = 'Add lyrics';
};

const svgArt = (g1, g2, p) => 'data:image/svg+xml,' + enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>${p}</svg>`);
const HEART = svgArt('#4f7cff', '#8b5cf6', '<path d="M50 72S28 58 28 42a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 30-22 30z" fill="#fff"/>');
const NOTE = svgArt('#1f2438', '#4f7cff', '<path d="M44 66V34l24-6v30" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="38" cy="66" r="7" fill="#fff"/><circle cx="62" cy="58" r="7" fill="#fff"/>');
const PLUS = svgArt('#2a2f4a', '#3b4268', '<path d="M50 30v40M30 50h40" stroke="#fff" stroke-width="6" stroke-linecap="round"/>');
function renderLibrary() {
  const row = $('#folders'); row.replaceChildren();
  row.append(card(HEART, 'Liked songs', liked.length + ' songs', () => showList('Liked songs', liked.length + ' songs', HEART, liked), liked.length ? () => play(liked, 0) : null));
  pls.forEach(p => row.append(card(p.tracks[0]?.thumb || NOTE, p.name, p.tracks.length + ' songs', () => openPl(p.id), p.tracks.length ? () => play(p.tracks, 0) : null)));
  row.append(card(PLUS, 'New playlist', 'Create', () => openAdd(null)));
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

const toTrack = (x, img) => ({ src: 'dz', id: x.id, title: x.title, sub: x.artist.name, thumb: img || x.album?.cover_big || x.album?.cover_medium, preview: x.preview, dur: x.duration });
async function artistLatest(id) {
  const al = (await dz(`/artist/${id}/albums?limit=60`)).data.filter(a => a.release_date).sort((a, b) => b.release_date.localeCompare(a.release_date)).slice(0, 5);
  const rs = await Promise.allSettled(al.map(a => dz(`/album/${a.id}/tracks?limit=40`))), seen = new Set(), out = [];
  rs.forEach((r, i) => (r.value?.data || []).forEach(x => { const k = x.title.toLowerCase().replace(/\(.*?\)/g, '').trim(); if (!seen.has(k)) { seen.add(k); out.push({ ...toTrack(x, al[i].cover_big), rel: al[i].release_date }); } }));
  return out;
}
async function loadCol(kind, id, img) {
  if (kind === 'artist') { try { const l = await artistLatest(id); if (l.length) return l; } catch {} }
  const p = { playlist: `/playlist/${id}/tracks?limit=50`, album: `/album/${id}/tracks?limit=50`, artist: `/artist/${id}/top?limit=30`, genre: `/chart/${id}/tracks?limit=30` }[kind];
  return (await dz(p)).data.map(x => toTrack(x, kind === 'album' ? img : null));
}
async function openCol(kind, id, title, sub, img) {
  plMode = null; curArt = null; show('detail'); $('#dt').textContent = title; $('#ds').textContent = sub || ''; $('#dimg').src = img || '';
  $('#dlist').replaceChildren(el('p', 'muted', 'Loading…')); dcol = [];
  if (kind === 'artist') { curArt = { id, name: title, pic: img }; $('#ds').textContent = 'Newest releases first'; } syncFavBtn();
  try { dcol = await loadCol(kind, id, img); if (!img) $('#dimg').src = dcol[0]?.thumb || ''; renderList($('#dlist'), dcol); }
  catch { $('#dlist').replaceChildren(el('p', 'muted', 'Could not load this. Check your connection and try again.')); }
}
async function playOnly(kind, id, img) { try { const l = await loadCol(kind, id, img); if (l.length) play(l, 0); } catch {} }
const mix = l => [...l].sort(() => Math.random() - .5);
function addHist(t) {
  if (t.src === 'local') return;
  bump(t);
  hist = [{ src: t.src, id: t.id, yt: t.yt, title: t.title, sub: t.sub, thumb: t.thumb, preview: t.preview, url: t.url, dur: t.dur }, ...hist.filter(x => x.id !== t.id)].slice(0, 12);
  store.set('vybe.hist', hist);
}
function renderRecent() {
  const h = new Date().getHours(); const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening', nm = store.get('vybe.profile', null)?.name; $('#hello').textContent = nm ? g + ', ' + nm : g;
  const items = hist.slice(0, 6).map((t, i) => ({ thumb: t.thumb, title: t.title, go: () => play(hist, i) }));
  $('#quick').replaceChildren();
  [...items, ...extra].slice(0, 6).forEach(x => {
    const b = el('button', 'qt'), i = el('img'); i.src = x.thumb || ''; i.alt = '';
    b.append(i, el('span', '', x.title)); b.onclick = x.go; $('#quick').append(b);
  });
  myArtists();
}
const apic = store.get('vybe.apic', {});
async function myArtists() {
  const tk = ++artTk, names = [...new Set(hist.map(t => t.sub.split(/,|&/)[0].trim()))].slice(0, 8);
  $('#artWrap').hidden = !names.length; $('#myArtists').replaceChildren();
  for (const n of names) {
    try {
      if (!apic[n]) { const d = (await dz('/search/artist?limit=1&q=' + encodeURIComponent(n))).data[0]; if (!d) continue; apic[n] = { id: d.id, pic: d.picture_big }; store.set('vybe.apic', apic); }
      if (tk !== artTk) return;
      const a = apic[n]; $('#myArtists').append(card(a.pic, n, 'Artist', () => openCol('artist', a.id, n, 'Top tracks', a.pic), () => playOnly('artist', a.id), true));
    } catch {}
  }
}
const MIX = [['Afrobeats', 2], ['R&B', 165], ['Hip-Hop', 116], ['Pop', 132], ['Dance', 113], ['Jazz', 129]];
function showList(title, sub, img, list) {
  plMode = null; curArt = null; show('detail'); $('#dt').textContent = title; $('#ds').textContent = sub || ''; $('#dimg').src = img || ''; dcol = list; renderList($('#dlist'), list);
}
const loadHomeFull = () => ov(['chill', 'acoustic', 'lofi', 'jazz', 'piano', 'ambient'][new Date().getDay() % 6], 12).then(d => d && renderList($('#auTop'), d.map(toOv)));
async function loadHome() {
  renderRecent();
  const mxP = Promise.allSettled(MIX.map(([, id]) => dz(`/chart/${id}/tracks?limit=30`)));
  const [tr, ar, pl, al] = await Promise.allSettled([dz('/chart/0/tracks?limit=12'), dz('/chart/0/artists?limit=40'), dz('/chart/0/playlists?limit=12'), dz('/chart/0/albums?limit=12')]);
  if (tr.value) { trend = tr.value.data.map(x => toTrack(x)); renderList($('#top'), trend); } else $('#top').append(el('p', 'muted', 'Could not load trending music. Check your connection.'));
  (pl.value?.data || []).forEach(x => $('#pls').append(card(x.picture_big, x.title, (x.nb_tracks || '') + ' songs', () => openCol('playlist', x.id, x.title, x.user?.name || 'Playlist', x.picture_big), () => playOnly('playlist', x.id))));
  (al.value?.data || []).forEach(x => $('#albs').append(card(x.cover_big, x.title, x.artist.name, () => openCol('album', x.id, x.title, x.artist.name, x.cover_big), () => playOnly('album', x.id, x.cover_big))));
  chartArtists = ar.value?.data || [];
  chartArtists.forEach((x, n) => {
    const mk = () => card(x.picture_big, x.name, 'Artist', () => openCol('artist', x.id, x.name, 'Top tracks', x.picture_big), () => playOnly('artist', x.id), true);
    if (n < 12) $('#chart').append(mk()); $('#artistGrid').append(mk());
  });
  extra = [...(pl.value?.data || []).slice(0, 3).map(x => ({ thumb: x.picture_medium, title: x.title, go: () => playOnly('playlist', x.id) })),
           ...(al.value?.data || []).slice(0, 3).map(x => ({ thumb: x.cover_medium, title: x.title, go: () => playOnly('album', x.id, x.cover_big) }))];
  loadHomeFull();
  renderRecent();
  (await mxP).forEach((r, i) => {
    if (!r.value) return;
    const l = r.value.data.map(x => toTrack(x)), g = MIX[i][0], n = g + ' Mix', img = l[0]?.thumb;
    $('#mixes').append(card(img, n, 'Top ' + g + ' hits', () => showList(n, 'Top hits in ' + g, img, l), () => play(l, 0)));
  });
}
$('#back').onclick = () => show(prev === 'detail' ? 'home' : prev);
$('#dplay').onclick = () => { if (dcol.length) play(dcol, 0); };
$('#dshuf').onclick = () => { if (dcol.length) play(mix(dcol), 0); };

function lyrHead() {
  const on = $('.lyrbox').classList.contains('lyrfull'), t = queue[idx];
  $('#lt').textContent = on ? (t?.title || 'Lyrics') : 'Lyrics'; $('#ls').textContent = on ? (t?.sub || '') : ''; $('#lart').src = t?.thumb || '';
}
const closeLyr = () => { $('.lyrbox').classList.remove('lyrfull'); lyrHead(); $('#qsheet').classList.remove('on'); $('#qback').classList.remove('on'); };
const sheet = on => { if (!on) closeLyr(); $('#sheet').classList.toggle('on', on); $('#stage').classList.toggle('full', on); if (!on) $('#stage').style.left = $('#stage').style.top = ''; };
function qRow(x, i, now) {
  const r = el('div', 'qrow' + (now ? ' now' : '')), im = el('img'), info = el('div', 'i');
  im.src = x.thumb || ''; im.alt = ''; info.append(el('b', '', x.title), el('small', 'muted', x.sub));
  info.onclick = () => play(queue, i); r.append(im, info);
  if (!now) { const rm = el('button', 'qx', '✕'); rm.setAttribute('aria-label', 'Remove'); rm.onclick = () => { queue.splice(i, 1); renderQueue(); }; r.append(rm); }
  return r;
}
function renderQueue() {
  $('#qnow').replaceChildren(); $('#qlist').replaceChildren();
  if (queue[idx]) $('#qnow').append(qRow(queue[idx], idx, true));
  queue.forEach((x, i) => { if (i > idx) $('#qlist').append(qRow(x, i)); });
  if (!$('#qlist').children.length) $('#qlist').append(el('p', 'muted', 'Nothing queued. Play an album or playlist to fill this.'));
}
const qOpen = on => { if (on) { queue = [...queue]; renderQueue(); } $('#qsheet').classList.toggle('on', on); $('#qback').classList.toggle('on', on); };
$('#qTog').onclick = () => qOpen(!$('#qsheet').classList.contains('on'));
$('#qback').onclick = () => { qOpen(false); closeAdd(); };
$('#qclear').onclick = () => { queue = queue.slice(0, idx + 1); renderQueue(); };
const act = {
  pp: toggle, next: () => step(1), prev: () => step(-1), open: () => sheet(true), close: () => sheet(false),
  shuf: () => { shuf = !shuf; $$('[data-act=shuf]').forEach(b => b.classList.toggle('on', shuf)); },
  like: () => { const t = queue[idx]; if (t) toggleLike(t); }
};
$$('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); act[b.dataset.act](); });
$('#kf').onsubmit = e => { e.preventDefault(); key = $('#key').value.trim(); store.set('vybe.key', key); $('#key').value = ''; toast(key ? 'YouTube key saved' : 'Key cleared'); renderSettings(); };
$('#lyrTog').onclick = () => $('#lyrFull').click();
let curVol = 1;
$('#vol').oninput = e => { curVol = +e.target.value; audio.volume = curVol; if (ytReady) yt.setVolume(curVol * 100); e.target.style.setProperty('--p', curVol * 100 + '%'); };
$('#vol').style.setProperty('--p', '100%');
const rs = () => store.get('vybe.rs', []);
function openSearch(on) {
  $('#sov').hidden = !on; if (!on) return;
  const r = $('#rec'); r.replaceChildren();
  rs().forEach(q => { const b = el('button', '', q); b.onclick = () => { openSearch(false); search(q); }; r.append(b); });
  setTimeout(() => { $('#q').focus(); $('#q').select(); }, 60);
}
$('#sbtn').onclick = () => { sheet(false); openSearch(true); };
$('#sclose').onclick = () => openSearch(false);
$('#sov').onclick = e => { if (e.target === $('#sov')) openSearch(false); };
$('#sf').onsubmit = e => {
  e.preventDefault(); const q = $('#q').value.trim(); openSearch(false); $('#q').blur();
  if (!q) { ['#songs', '#auSongs', '#artistsHit', '#albumsHit'].forEach(s => $(s).replaceChildren()); $('#auH').hidden = true; $('#msg').textContent = ''; $('#moodBox').hidden = false; show('explore'); return; }
  store.set('vybe.rs', [q, ...rs().filter(x => x !== q)].slice(0, 8)); search(q);
};
const nav = $('nav'), tabs = [...$$('nav button')], order = tabs.map(b => b.dataset.v);
function moveThumb(v) {
  const b = tabs.find(x => x.dataset.v === v); if (!b) return;
  $('#thumb').style.width = b.offsetWidth + 'px'; $('#thumb').style.transform = `translateX(${b.offsetLeft}px)`;
  tabs.forEach(x => x.classList.toggle('on', x === b));
}
let drag = false;
const pick = e => {
  const r = nav.getBoundingClientRect(), x = Math.min(Math.max(e.clientX, r.left + 6), r.right - 6);
  const b = tabs.find(t => { const q = t.getBoundingClientRect(); return x >= q.left && x <= q.right; });
  if (b && b.dataset.v !== cur) { sheet(false); show(b.dataset.v); }
};
nav.onpointerdown = e => { drag = true; nav.setPointerCapture(e.pointerId); pick(e); };
nav.onpointermove = e => { if (drag) pick(e); };
nav.onpointerup = nav.onpointercancel = () => { drag = false; };
tabs.forEach(b => b.onclick = () => { sheet(false); show(b.dataset.v); });
addEventListener('resize', () => moveThumb(cur));
let sx = 0, sy = 0, sOk = false;
document.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; sOk = !e.target.closest('.row,input,textarea,#sheet,nav'); }, { passive: true });
document.addEventListener('touchend', e => {
  if (!sOk || !order.includes(cur)) return;
  const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const n = order[order.indexOf(cur) + (dx < 0 ? 1 : -1)]; if (n) show(n);
}, { passive: true });
$('#heroPlay').onclick = () => { if (trend.length) play(mix(trend), 0); };
loadLocal(); loadHome(); moveThumb('home'); document.fonts?.ready.then(() => moveThumb(cur));

// Settings: theme, listening stats, saved keys
const stats = store.get('vybe.stats', { plays: 0, secs: 0, artists: {}, tracks: {} }); stats.days ||= {};
const day = () => new Date().toLocaleDateString('en-CA');
const bump = t => { stats.plays++; stats.artists[t.sub] = (stats.artists[t.sub] || 0) + 1; const k = t.title + ' — ' + t.sub; stats.tracks[k] = (stats.tracks[k] || 0) + 1; store.set('vybe.stats', stats); };
function renderSettings() { renderAccount();
  $$('#srcSeg button').forEach(x => x.classList.toggle('on', x.dataset.s === srcPref()));
  $('#srcNote').textContent = srcPref() === 'yt' ? (key ? "Full songs through YouTube's player (the video stays visible). Uses your YouTube quota." : 'Add a YouTube API key below to use this.') : 'Songs found in the free library play in full inside VYBE. Everything else plays as a 30s preview.';
  const mark = (id, v) => $$(id + ' button').forEach(x => x.classList.toggle('on', x.dataset.v === String(v)));
  mark('#spdSeg', +store.get('vybe.speed', 1)); mark('#slpSeg', sleepEnd ? '*' : 0); mark('#autoSeg', store.get('vybe.auto', true) ? 1 : 0); mark('#startSeg', store.get('vybe.start', 'home'));
  $('#slpNote').textContent = sleepEnd ? '· stops in about ' + Math.max(1, Math.round((sleepEnd - Date.now()) / 60000)) + ' min' : '';
}
function renderStats() {
  const b = $('#statsBody'); b.replaceChildren();
  const mins = s => Math.round(s / 60), d = new Date();
  const days = [...Array(7)].map((_, i) => { const x = new Date(d); x.setDate(d.getDate() - 6 + i); const k = x.toLocaleDateString('en-CA'); return { l: x.toLocaleDateString(undefined, { weekday: 'short' }), s: stats.days[k] || 0 }; });
  const week = days.reduce((t, x) => t + x.s, 0), max = Math.max(60, ...days.map(x => x.s));
  const g = el('div', 'sgrid');
  [['Today', mins(days[6].s) + ' min'], ['Last 7 days', mins(week) + ' min'], ['All time', mins(stats.secs) + ' min'], ['Plays', stats.plays]].forEach(([l, v]) => { const c = el('div', 'scard glass'); c.append(el('b', '', v), el('small', 'muted', l)); g.append(c); });
  const ch = el('div', 'bars glass');
  days.forEach(x => { const c = el('div', 'bc'), i = el('i'); i.style.height = Math.max(4, x.s / max * 100) + '%'; c.append(i, el('small', 'muted', x.l)); ch.append(c); });
  b.append(g, ch);
  [['Top artists', stats.artists], ['Top songs', stats.tracks]].forEach(([t, o]) => { b.append(el('h3', '', t)); Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 5).forEach(([n, c]) => b.append(el('div', 'srow', n + ' · ' + c + (c === 1 ? ' play' : ' plays')))); });
  b.append(el('p', 'muted', 'Minutes are counted automatically for everything you play in VYBE: YouTube, previews and your own files.'));
}
function applyTheme() { document.documentElement.dataset.theme = 'dark'; }
$('#lyrFull').onclick = () => { $('.lyrbox').classList.toggle('lyrfull'); lyrHead(); act_i = -2; };
$('#stageTap').onclick = () => sheet(true);
$('#gear').onclick = () => { sheet(false); show('settings'); };
$('#rmKey').onclick = () => { key = ''; localStorage.removeItem('vybe.key'); toast('YouTube key removed'); renderSettings(); };
$('#rmStats').onclick = () => { hist = []; store.set('vybe.hist', []); localStorage.removeItem('vybe.stats'); Object.assign(stats, { plays: 0, secs: 0, artists: {}, tracks: {}, days: {} }); toast('History and stats cleared'); renderRecent(); };
applyTheme();

if (hist[0]) { queue = hist; idx = 0; paint(hist[0]); }

// Login: a profile saved on this device, plus an optional Last.fm connection (Spotify/Deezer cannot connect right now)
const prof = () => store.get('vybe.profile', null), lf = () => store.get('vybe.lf', null);
function showLogin(on) {
  $('#login').hidden = !on;
  if (on) { $('#lname').value = prof()?.name || ''; $('#lfu').value = lf()?.user || ''; $('#lfk').value = lf()?.key || ''; $('#lfm').textContent = ''; }
}
function renderAccount() { $('#acct').textContent = (prof()?.name ? 'Signed in as ' + prof().name : 'Guest') + (lf() ? ' · Last.fm: ' + lf().user : ''); }
function finishLogin(name) { store.set('vybe.profile', { name }); showLogin(false); renderRecent(); renderAccount(); loadLastfm(); if (!favs().length && !store.get('vybe.favAsked', false)) { store.set('vybe.favAsked', true); openFav(); } }
$('#lgo').onclick = () => finishLogin($('#lname').value.trim());
$('#lguest').onclick = () => finishLogin('');
$('#lfOpen').onclick = () => { $('#lff').hidden = !$('#lff').hidden; };
$('#lff').onsubmit = e => {
  e.preventDefault(); const user = $('#lfu').value.trim(), k = $('#lfk').value.trim(); if (!user || !k) return;
  store.set('vybe.lf', { user, key: k }); $('#lfm').textContent = 'Saved. Tap Continue to see your top artists on Home.'; loadLastfm();
};
$('#acEdit').onclick = () => { sheet(false); showLogin(true); };
$('#acOut').onclick = () => { localStorage.removeItem('vybe.profile'); localStorage.removeItem('vybe.lf'); renderAccount(); renderRecent(); loadLastfm(); showLogin(true); };
async function artistCard(n, row) {
  if (!apic[n]) { const d = (await dz('/search/artist?limit=1&q=' + enc(n))).data[0]; if (!d) return; apic[n] = { id: d.id, pic: d.picture_big }; store.set('vybe.apic', apic); }
  const a = apic[n]; row.append(card(a.pic, n, 'Artist', () => openCol('artist', a.id, n, 'Top tracks', a.pic), () => playOnly('artist', a.id), true));
}
let lfTk = 0;
async function loadLastfm() {
  const c = lf(), tk = ++lfTk; $('#lfRow').replaceChildren(); $('#lfWrap').hidden = true; if (!c) return;
  try {
    const d = await (await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&period=3month&limit=10&format=json&user=${enc(c.user)}&api_key=${enc(c.key)}`)).json();
    const names = (d.topartists?.artist || []).map(a => a.name);
    if (!names.length) return; $('#lfWrap').hidden = false;
    for (const n of names) { try { if (tk !== lfTk) return; await artistCard(n, $('#lfRow')); } catch {} }
  } catch {}
}
renderAccount(); loadLastfm(); showLogin(!prof());

// ---- 6.5: playlists, moods, toast ----
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
const slim = t => ({ src: t.src, id: t.id, yt: t.yt, title: t.title, sub: t.sub, thumb: t.thumb, preview: t.preview, url: t.url, dur: t.dur });
const savePls = () => store.set('vybe.pls', pls);
function createPl(name) { const p = { id: 'p' + Date.now(), name: name.trim().slice(0, 40), tracks: [] }; pls.push(p); savePls(); return p; }
function addTo(p, t) { if (!p.tracks.some(x => x.src === t.src && x.id === t.id)) p.tracks.push(slim(t)); savePls(); toast('Added to ' + p.name); }
function openAdd(t) {
  addT = t; $('#pst').textContent = t ? 'Add to playlist' : 'New playlist';
  const b = $('#plist'); b.replaceChildren();
  if (t) pls.forEach(p => { const r = el('button', 'plrow', p.name + ' · ' + p.tracks.length + ' songs'); r.onclick = () => { addTo(p, t); closeAdd(); }; b.append(r); });
  $('#psheet').classList.add('on'); $('#qback').classList.add('on');
}
const closeAdd = () => { $('#psheet').classList.remove('on'); if (!$('#qsheet').classList.contains('on')) $('#qback').classList.remove('on'); };
$('#npf').onsubmit = e => {
  e.preventDefault(); const n = $('#npn').value.trim(); if (!n) return;
  const p = createPl(n); if (addT) addTo(p, addT); else toast('Playlist created');
  $('#npn').value = ''; closeAdd(); if (cur === 'library') renderLibrary();
};
function openPl(id) {
  const p = pls.find(x => x.id === id); if (!p) return;
  plMode = id; curArt = null; show('detail'); $('#dt').textContent = p.name; $('#ds').textContent = p.tracks.length + ' songs'; $('#dimg').src = p.tracks[0]?.thumb || NOTE; dcol = p.tracks;
  renderList($('#dlist'), p.tracks);
  if (!p.tracks.length) $('#dlist').append(el('p', 'muted', 'Empty. Tap ＋ on any song to add it here.'));
}
$('#ddel').onclick = () => { if (!plMode || !confirm('Delete this playlist?')) return; pls = pls.filter(p => p.id !== plMode); savePls(); plMode = null; toast('Playlist deleted'); show('library'); };
$('#dsave').onclick = () => { if (!dcol.length) return; const p = createPl($('#dt').textContent || 'Saved playlist'); p.tracks = dcol.slice(0, 100).filter(t => t.src !== 'local').map(slim); savePls(); toast('Saved to your Library'); };
const MOODS = ['Happy', 'Sad', 'Romance', 'Heartbreak', 'Chill', 'Party', 'Workout', 'Focus', 'Sleep', 'Road trip', 'Throwback', 'Gospel', 'Afrobeats', 'Amapiano', 'Hip-Hop', 'R&B', 'Rainy day', 'Motivation', 'Study', 'Dinner'];
MOODS.forEach(m => { const b = el('button', '', m); b.onclick = () => moodLoad(m); $('#moods').append(b); });
async function moodLoad(m) {
  $$('#moods button').forEach(b => b.classList.toggle('on', b.textContent === m));
  $('#moodH').textContent = m ? m + ' playlists' : 'Suggested community playlists';
  const row = $('#moodRes'); row.replaceChildren(el('p', 'muted', 'Loading…'));
  const qs = m ? [m + ' songs', m + ' mix'] : ['feel good', 'late night', 'romance', 'sad songs'];
  const rs = await Promise.allSettled(qs.map(q => dz('/search/playlist?limit=12&q=' + enc(q))));
  const seen = new Set(), all = rs.flatMap(r => r.value?.data || []).filter(x => x.nb_tracks > 5 && !seen.has(x.id) && seen.add(x.id));
  row.replaceChildren(); if (!all.length) row.append(el('p', 'muted', 'No playlists found. Check your connection.'));
  all.slice(0, 24).forEach(x => row.append(card(x.picture_big, x.title, (x.nb_tracks || '') + ' songs', () => openCol('playlist', x.id, x.title, x.user?.name || 'Community playlist', x.picture_big), () => playOnly('playlist', x.id))));
}
$$('#srcSeg button').forEach(b => b.onclick = () => {
  if (b.dataset.s === 'yt' && !key) { toast('Add a YouTube API key first'); return; }
  store.set('vybe.src', b.dataset.s); if (b.dataset.s === 'yt') loadYT(); renderSettings(); toast(b.dataset.s === 'yt' ? 'Using YouTube for full songs' : 'Using the free library');
});
if (useYT()) loadYT();

// ---- 6.5b: new releases, music videos, favourite artists, playback settings ----
async function loadNew() {
  let d = []; try { d = (await dz('/editorial/0/releases?limit=20')).data || []; } catch {}
  if (!d.length) { try { d = (await dz('/chart/0/albums?limit=20')).data || []; } catch {} }
  [$('#newRow'), $('#newRow2')].forEach(row => { row.replaceChildren(); d.forEach(x => row.append(card(x.cover_big, x.title, x.artist?.name, () => openCol('album', x.id, x.title, x.artist?.name, x.cover_big), () => playOnly('album', x.id, x.cover_big)))); if (!d.length) row.append(el('p', 'muted', 'Could not load new releases.')); });
}
const ytSearch = (q, n, extra = '') => fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=' + n + extra + '&q=' + enc(q) + '&key=' + enc(key)).then(r => r.json());
function watch(t) { loadYT(); play([t], 0); sheet(true); }
async function loadVideos() {
  const row = $('#mvRow'); row.replaceChildren();
  if (!key) { row.append(el('p', 'muted', 'Add a YouTube API key in Settings to watch music videos.')); return; }
  try {
    const d = await ytSearch('official music video', 12, '&order=viewCount&publishedAfter=' + enc(new Date(Date.now() - 30 * 864e5).toISOString()));
    if (d.error) { row.append(el('p', 'muted', 'YouTube said: ' + d.error.message)); return; }
    (d.items || []).forEach(v => {
      const t = { src: 'q', id: 'y' + v.id.videoId, yt: v.id.videoId, title: decode(v.snippet.title), sub: decode(v.snippet.channelTitle), thumb: v.snippet.thumbnails.medium?.url };
      const c = card(t.thumb, t.title, t.sub, () => watch(t), () => watch(t)); c.classList.add('vid'); row.append(c);
    });
  } catch { row.append(el('p', 'muted', 'Could not load videos.')); }
}
$('#vidBtn').onclick = async () => {
  const t = queue[idx]; if (!t) return;
  if (!key) { toast('Add a YouTube API key in Settings to watch videos'); return; }
  loadYT(); toast('Finding the music video…');
  try { const id = (await ytSearch(t.sub + ' ' + t.title + ' official music video', 1)).items?.[0]?.id.videoId; if (!id) { toast('No video found'); return; } t.yt = id; play(queue, idx); }
  catch { toast('Could not load the video'); }
};
const favs = () => store.get('vybe.fav', []), isFav = id => favs().some(a => a.id === id);
function toggleFav(a) { store.set('vybe.fav', isFav(a.id) ? favs().filter(x => x.id !== a.id) : [...favs(), a]); renderFav(); syncFavBtn(); }
function renderFav() {
  const f = favs(); $('#favWrap').hidden = !f.length; $('#favRow').replaceChildren();
  f.forEach(a => $('#favRow').append(card(a.pic, a.name, 'Artist', () => openCol('artist', a.id, a.name, '', a.pic), () => playOnly('artist', a.id), true)));
}
function syncFavBtn() { $('#dfav').hidden = !(curArt && cur === 'detail'); if (curArt) $('#dfav').textContent = isFav(curArt.id) ? '♥ Following' : '♡ Follow'; }
$('#dfav').onclick = () => { if (curArt) toggleFav(curArt); };
function openFav() {
  $('#fpick').hidden = false; const g = $('#fgrid'); g.replaceChildren();
  const draw = list => list.forEach(x => {
    const a = { id: x.id, name: x.name, pic: x.picture_big || x.pic }, b = el('button', 'fa' + (isFav(a.id) ? ' on' : '')), i = el('img'); i.src = a.pic; i.alt = '';
    b.append(i, el('span', '', a.name)); b.onclick = () => { toggleFav(a); b.classList.toggle('on', isFav(a.id)); }; g.append(b);
  });
  if (chartArtists.length) draw(chartArtists); else dz('/chart/0/artists?limit=40').then(d => draw(d.data)).catch(() => g.append(el('p', 'muted', 'Could not load artists.')));
}
$('#fdone').onclick = () => { $('#fpick').hidden = true; renderFav(); };
$('#favOpen').onclick = () => openFav();
$('#openStats').onclick = () => show('mystats');
$('#statsBack').onclick = () => show('settings');
async function autoMore() {
  const t = queue[idx];
  try {
    const r = await dz('/search?limit=25&q=' + enc(t.sub));
    const add = (r.data || []).filter(x => x.preview).map(x => toTrack(x)).filter(x => !queue.some(q => q.id === x.id));
    if (add.length) { queue = [...queue, ...add]; play(queue, idx + 1); return; }
  } catch {}
  play(queue, 0);
}
let sleepT = 0, sleepEnd = 0;
function applySpeed() { const r = +store.get('vybe.speed', 1); audio.defaultPlaybackRate = r; audio.playbackRate = r; if (ytReady) yt.setPlaybackRate(r); }
function setSleep(m) {
  clearTimeout(sleepT); sleepEnd = 0;
  if (m) { sleepEnd = Date.now() + m * 60000; sleepT = setTimeout(() => { audio.pause(); if (ytReady) yt.pauseVideo(); sleepEnd = 0; renderSettings(); toast('Sleep timer: playback stopped'); }, m * 60000); toast('Sleep timer: ' + m + ' min'); }
  else toast('Sleep timer off');
  renderSettings();
}
$$('#spdSeg button').forEach(b => b.onclick = () => { store.set('vybe.speed', +b.dataset.v); applySpeed(); renderSettings(); });
$$('#slpSeg button').forEach(b => b.onclick = () => setSleep(+b.dataset.v));
$$('#autoSeg button').forEach(b => b.onclick = () => { store.set('vybe.auto', b.dataset.v === '1'); renderSettings(); });
$$('#startSeg button').forEach(b => b.onclick = () => { store.set('vybe.start', b.dataset.v); renderSettings(); toast('Start screen saved'); });
loadNew(); renderFav(); applySpeed();
if (store.get('vybe.start', 'home') !== 'home') show(store.get('vybe.start', 'home'));

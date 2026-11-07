const $ = s => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
let key = store.get('vybe.key', ''), liked = store.get('vybe.liked', []);
let queue = [], idx = -1, shuf = false, yt = null, ytReady = false, pending = null, local = [];
const audio = new Audio();

const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// Deezer has no CORS, so it is called with JSONP (artist pictures and album covers only)
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

function show(v) {
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === v));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'library') renderLibrary();
  scrollTo(0, 0);
}

function card(img, title, onclick, square) {
  const b = el('button', 'card' + (square ? ' sq' : ''));
  const i = el('img'); i.src = img || ''; i.alt = ''; i.loading = 'lazy';
  b.append(i, el('span', '', title)); b.onclick = onclick; return b;
}

function trackRow(list, i) {
  const t = list[i], r = el('div', 'track');
  const im = el('img'); im.src = t.thumb || ''; im.alt = '';
  const info = el('div', 'i'); info.append(el('b', '', t.title), el('small', '', t.sub));
  info.onclick = () => play(list, i);
  const lk = el('button', '', isLiked(t) ? '♥' : '♡'); lk.title = 'Like';
  lk.onclick = () => { toggleLike(t); lk.textContent = isLiked(t) ? '♥' : '♡'; };
  r.append(im, info, lk); return r;
}
const renderList = (box, list) => { box.replaceChildren(); list.forEach((_, i) => box.append(trackRow(list, i))); };

const isLiked = t => liked.some(x => x.src === t.src && (x.id || x.title) === (t.id || t.title));
function toggleLike(t) {
  if (t.src === 'local') return;
  liked = isLiked(t) ? liked.filter(x => !(x.src === t.src && x.id === t.id)) : [...liked, t];
  store.set('vybe.liked', liked); syncLike();
}
function syncLike() { const t = queue[idx]; $('#like').textContent = t && isLiked(t) ? '♥' : '♡'; }

async function search(q) {
  q = q.trim(); if (!q) return;
  show('explore'); $('#q').value = q;
  $('#keybox').hidden = !!key;
  $('#songs').replaceChildren(); $('#artistsHit').replaceChildren(); $('#albumsHit').replaceChildren();
  $('#msg').textContent = 'Searching…';
  const yts = key ? fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&videoEmbeddable=true&maxResults=20&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(key)).then(r => r.json()) : Promise.resolve(null);
  const [y, a, al] = await Promise.allSettled([yts, dz('/search/artist?limit=10&q=' + encodeURIComponent(q)), dz('/search/album?limit=10&q=' + encodeURIComponent(q))]);
  (a.value?.data || []).forEach(x => $('#artistsHit').append(card(x.picture_medium, x.name, () => search(x.name))));
  (al.value?.data || []).forEach(x => $('#albumsHit').append(card(x.cover_medium, x.title, () => search(x.title + ' ' + (x.artist?.name || '')), true)));
  const d = y.value;
  if (!key) $('#msg').textContent = 'Add your YouTube key above to search songs.';
  else if (d?.error) $('#msg').textContent = 'YouTube said: ' + d.error.message;
  else if (!d?.items?.length) $('#msg').textContent = 'No songs found. Try another search.';
  else {
    $('#msg').textContent = '';
    queue = d.items.map(v => ({ src: 'yt', id: v.id.videoId, title: decode(v.snippet.title), sub: decode(v.snippet.channelTitle), thumb: v.snippet.thumbnails.medium?.url }));
    renderList($('#songs'), queue);
  }
}

function play(list, i) {
  queue = list; idx = i; const t = list[i];
  $('#t').textContent = t.title; $('#s').textContent = t.sub; $('#art').src = t.thumb || '';
  syncLike();
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
  const n = shuf ? Math.floor(Math.random() * queue.length) : (idx + d + queue.length) % queue.length;
  play(queue, n);
}
function toggle() {
  const t = queue[idx]; if (!t) return;
  if (t.src === 'yt' && ytReady) (yt.getPlayerState() === 1 ? yt.pauseVideo() : yt.playVideo());
  else audio.paused ? audio.play() : audio.pause();
}

window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt', { width: '100%', height: '100%', playerVars: { playsinline: 1 }, events: {
    onReady: () => { ytReady = true; if (pending) { yt.loadVideoById(pending); pending = null; } },
    onStateChange: e => { $('#pp').textContent = e.data === 1 ? '⏸' : '▶'; if (e.data === 0) step(1); },
    onError: () => step(1) } });
};
audio.onplay = () => $('#pp').textContent = '⏸';
audio.onpause = () => $('#pp').textContent = '▶';
audio.onended = () => step(1);

setInterval(() => {
  const t = queue[idx]; if (!t) return;
  const yo = t.src === 'yt' && ytReady;
  const cu = yo ? yt.getCurrentTime() : audio.currentTime, du = yo ? yt.getDuration() : audio.duration;
  $('#cu').textContent = fmt(cu); $('#du').textContent = fmt(du);
  if (du && !$('#sk').matches(':active')) $('#sk').value = (cu / du) * 100;
}, 500);
$('#sk').oninput = e => {
  const t = queue[idx]; if (!t) return;
  if (t.src === 'yt' && ytReady) yt.seekTo(yt.getDuration() * e.target.value / 100, true);
  else audio.currentTime = (audio.duration || 0) * e.target.value / 100;
};

function renderLibrary() {
  renderList($('#liked'), liked);
  if (!liked.length) $('#liked').append(el('p', 'muted', 'Tap ♡ on any song to keep it here.'));
  renderList($('#local'), local);
  if (!local.length) $('#local').append(el('p', 'muted', 'Add music from your phone. It plays here and is cleared when you close the tab.'));
}
$('#file').onchange = e => {
  [...e.target.files].forEach(f => local.push({ src: 'local', title: f.name.replace(/\.[^.]+$/, ''), sub: 'On this device', url: URL.createObjectURL(f) }));
  renderLibrary();
};

async function loadArtists() {
  try {
    const d = await dz('/chart/0/artists?limit=40');
    d.data.forEach((x, n) => {
      const go = () => search(x.name);
      if (n < 12) $('#chart').append(card(x.picture_medium, x.name, go));
      $('#artistGrid').append(card(x.picture_medium, x.name, go));
    });
  } catch { $('#chart').append(el('p', 'muted', 'Could not load artists. Check your connection.')); }
}

$('#sf').onsubmit = e => { e.preventDefault(); search($('#q').value); };
$('#kf').onsubmit = e => { e.preventDefault(); key = $('#key').value.trim(); store.set('vybe.key', key); $('#keybox').hidden = !!key; if ($('#q').value) search($('#q').value); };
document.querySelectorAll('nav button').forEach(b => b.onclick = () => show(b.dataset.v));
document.querySelectorAll('.chips button').forEach(b => b.onclick = () => search(b.dataset.q));
$('#pp').onclick = toggle; $('#next').onclick = () => step(1); $('#prev').onclick = () => step(-1);
$('#shuf').onclick = () => { shuf = !shuf; $('#shuf').classList.toggle('on', shuf); };
$('#like').onclick = () => { const t = queue[idx]; if (t) toggleLike(t); };
loadArtists();

import { loadGift } from './data.js';
import { giftThemes } from './themes.js';
import { API_BASE } from './config.js';

const app = document.querySelector('#app');
const searchParams = new URLSearchParams(location.search);
const requestedGiftId = searchParams.get('gift');
const featuredGiftId = 'crush-note-9a199158';
const previewMode = searchParams.has('preview');
const giftToLoad = requestedGiftId || (!previewMode ? featuredGiftId : null);
let gift = loadGift();
let giftLoadError = '';
if (giftToLoad) {
  app.innerHTML = '<main class="gift-loading" role="status">Loading your little story…</main>';
  try {
    const apiBase = requestedGiftId ? API_BASE : 'https://crush-note-api.aldoramadhan16.workers.dev';
    const response = await fetch(apiBase + '/api/public/gifts/' + encodeURIComponent(giftToLoad), { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.project) throw new Error(payload.error || 'Gift not found.');
    gift = payload.project;
  } catch (error) {
    if (requestedGiftId) giftLoadError = error.message || 'Gift could not be loaded.';
  }
}
const audio = new Audio();
audio.preload = 'none';
audio.loop = true;

const fixedCopy = {
  id: {
    puzzleEyebrow: 'HADIAH KECIL UNTUKMU', puzzleTitle: 'Lengkapi fotonya,<br/>lalu buka hadiah kecilmu.', installed: 'KEPING TERPASANG', assist: 'Buka tanpa menggeser', complete: 'fotonya sudah lengkap', openStory: 'Buka ceritanya', musicError: 'Lagu belum dapat diputar. Ceritanya tetap bisa dibuka.', for: 'untuk', from: 'dari', open: 'Buka ceritanya', tap: 'ketuk untuk memulai cerita', storyBy: 'sebuah cerita kecil dari', previous: 'Halaman sebelumnya', next: 'Halaman berikutnya', deepBreath: 'okay, tarik napas dulu...', choose: 'Pilih jawabanmu, ya.', end: 'AKHIR... ATAU AWAL BARU?', goodStory: 'ternyata, kita bisa menjadi cerita yang baik', courage: 'butuh keberanian untuk mengatakan ini', nextChapter: 'HALAMAN KITA BERIKUTNYA', thanks: 'TERIMA KASIH SUDAH MEMBACA', replay: 'Baca lagi', dear: 'Untuk', pause: 'Jeda lagu', play: 'Putar lagu', unavailable: 'Lagu tidak dapat diputar', answerSaved: 'CATATAN JAWABAN', answerLabel: 'JAWABANMU', downloadCard: 'Unduh kartu', shareCard: 'Bagikan kartu', cardStatus: 'Kartu jawaban siap dibagikan.', cardFailed: 'Kartu belum berhasil dibuat. Coba lagi.', littleSecret: 'one photo, one little secret',
  },
  en: {
    puzzleEyebrow: 'A LITTLE GIFT FOR YOU', puzzleTitle: 'Complete the picture,<br/>then open your little gift.', installed: 'PIECES IN PLACE', assist: 'Open without dragging', complete: 'the picture is complete', openStory: 'Open the story', musicError: 'The song could not start, but the story is ready.', for: 'for', from: 'from', open: 'Open the story', tap: 'tap to begin the story', storyBy: 'a little story by', previous: 'Previous page', next: 'Next page', deepBreath: 'okay, deep breath...', choose: 'Choose your answer.', end: 'THE END... OR THE BEGINNING?', goodStory: 'turns out, we are a good story', courage: 'it took courage to say it', nextChapter: 'OUR NEXT CHAPTER', thanks: 'THANK YOU FOR READING', replay: 'Read again', dear: 'Dear', pause: 'Pause song', play: 'Play song', unavailable: 'Song unavailable', answerSaved: 'A LITTLE ANSWER', answerLabel: 'YOUR ANSWER', downloadCard: 'Download card', shareCard: 'Share card', cardStatus: 'Your answer card is ready to share.', cardFailed: 'The card could not be created. Please try again.', littleSecret: 'one photo, one little secret',
  },
};
Object.assign(fixedCopy.id, { coverSection: 'Sampul komik', memorySection: 'Awal cerita', reasonsSection: 'Tiga alasan', letterSection: 'Surat singkat', questionSection: 'Pertanyaan terakhir', resultSection: 'Akhir cerita', pageNavigation: 'Navigasi halaman', puzzlePhoto: 'Foto pembuka untuk', puzzlePiece: 'Pasangkan keping foto', storyCharacters: 'Ilustrasi cerita' });
Object.assign(fixedCopy.en, { coverSection: 'Comic cover', memorySection: 'The beginning', reasonsSection: 'Three reasons', letterSection: 'Short letter', questionSection: 'Final question', resultSection: 'The ending', pageNavigation: 'Page navigation', puzzlePhoto: 'Opening photo for', puzzlePiece: 'Place photo piece', storyCharacters: 'Illustration of' });
const locale = gift.locale === 'en' ? 'en' : 'id';
const t = (key) => fixedCopy[locale][key] || fixedCopy.id[key] || key;
const activeTheme = giftThemes[gift.theme] || giftThemes.classic;
Object.entries(activeTheme.colors).forEach(([name, value]) => {
  const cssName = name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
  document.documentElement.style.setProperty('--' + cssName, value);
});
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', activeTheme.colors.canvas);
document.documentElement.lang = locale;

function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('crush-note-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function hydrateAudio() {
  if (gift.music.url !== 'indexeddb://custom-audio') { audio.src = gift.music.url || ''; return; }
  try {
    const db = await openMediaDb();
    const blob = await new Promise((resolve, reject) => {
      const request = db.transaction('files').objectStore('files').get('custom-audio');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (blob) audio.src = URL.createObjectURL(blob);
    else state.musicError = true;
  } catch { state.musicError = true; }
}

const params = new URLSearchParams(location.search);
const previewSection = params.get('section');
const previewPages = { opening: 0, chapter1: 1, chapter2: 2, letter: 3, ending: 4 };
const state = {
  gate: !params.has('preview') || previewSection === 'puzzle',
  puzzleComplete: false,
  page: previewPages[previewSection] ?? 0,
  outcome: null,
  noDodges: 0,
  musicError: false,
};
const NO_DODGE_LIMIT = 10;
const totalPages = 5;
const solvedPieces = new Set();
const PUZZLE_PATH = 'M80 60H155C150 35 168 18 193 18C218 18 236 35 231 60H320V135C345 130 362 148 362 173C362 198 345 216 320 211V300H231C236 325 218 342 193 342C168 342 150 325 155 300H80V211C55 216 38 198 38 173C38 148 55 130 80 135Z';
const PUZZLE_PIECES = [
  { id: 'one', transform: 'translate(0 0)', viewBox: '20 0 360 360', target: 'left:3.8%;top:2.5%;width:34%;height:51%' },
  { id: 'two', transform: 'translate(600 60) rotate(90 200 180)', viewBox: '620 60 360 360', target: 'left:62%;top:11%;width:34%;height:51%' },
  { id: 'three', transform: 'translate(280 340) rotate(180 200 180)', viewBox: '300 340 360 360', target: 'left:31%;top:49%;width:34%;height:49%' },
];
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const icon = (name) => {
  const paths = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6 6-6-6 6-6"/>',
    music: '<path d="M9 18V5l11-2v13M9 9l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    muted: '<path d="M9 18V5l11-2v13M9 9l11-2"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>',
    heart: '<path d="M20.6 5.6a5 5 0 0 0-7.1 0L12 7.1l-1.5-1.5a5 5 0 0 0-7.1 7.1L12 21l8.6-8.3a5 5 0 0 0 0-7.1Z"/>',
    replay: '<path d="M4 11a8 8 0 1 1 2.4 6M4 5v6h6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    share: '<path d="M12 16V3m-5 5 5-5 5 5M5 13v6h14v-6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

function header() {
  const musicLabel = state.musicError ? t('unavailable') : audio.paused ? t('play') : t('pause');
  return `<header class="topbar"><button class="music-toggle ${audio.paused ? 'is-muted' : 'is-playing'}" data-action="music" aria-label="${musicLabel}" title="${musicLabel}">${icon(audio.paused ? 'muted' : 'music')}</button></header>`;
}

function fallbackArtwork() {
  const colors = activeTheme.colors;
  const markup = '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700">' +
    '<rect width="1000" height="700" fill="' + colors.coverPage + '"/><g fill="none" stroke="' + colors.ink + '" stroke-width="8" opacity=".17">' +
    '<circle cx="90" cy="90" r="64"/><circle cx="910" cy="610" r="110"/><path d="M0 580 290 290 510 510 760 210 1000 450"/></g>' +
    '<path d="M500 440 354 299c-83-80 45-205 126-124l20 20 20-20c81-81 209 44 126 124Z" fill="' + colors.accent + '" stroke="' + colors.ink + '" stroke-width="13"/>' +
    '<text x="500" y="555" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="' + colors.ink + '">' +
    escape(gift.sender) + ' + ' + escape(gift.recipient) + '</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
}

function photoSource(source) {
  return typeof source === 'string' && source.trim() ? source.trim() : fallbackArtwork();
}

function photoContent(source, alt, className = '') {
  if (typeof source === 'string' && source.trim()) return `<img src="${escape(source)}" alt="${escape(alt)}" class="${className}"/>`;
  return `<div class="photo-placeholder ${className}" role="img" aria-label="${t('storyCharacters')} ${escape(gift.sender)} ${t('from')} ${escape(gift.recipient)}"><span>${icon('heart')}</span><strong>OUR LITTLE STORY</strong><small>${escape(gift.sender)} + ${escape(gift.recipient)}</small></div>`;
}

function puzzleBoard() {
  const source = escape(photoSource(gift.puzzle?.photo));
  return `<div class="puzzle-board ${state.puzzleComplete ? 'is-complete' : ''}" id="puzzle-board"><div class="puzzle-photo-mount"><span class="puzzle-tape" aria-hidden="true"></span><div class="puzzle-visual"><svg class="puzzle-photo" viewBox="0 0 1000 700" role="img" aria-label="Foto pembuka untuk ${escape(gift.recipient)}" preserveAspectRatio="xMidYMid slice"><defs><mask id="opening-photo-mask"><rect width="1000" height="700" fill="white"/>${PUZZLE_PIECES.map((piece) => `<path d="${PUZZLE_PATH}" transform="${piece.transform}" fill="black"/>`).join('')}</mask>${PUZZLE_PIECES.map((piece) => `<clipPath id="opening-board-clip-${piece.id}" clipPathUnits="userSpaceOnUse"><path d="${PUZZLE_PATH}" transform="${piece.transform}"/></clipPath>`).join('')}<linearGradient id="puzzle-hole-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent-light)"/><stop offset=".48" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-deep)"/></linearGradient><filter id="puzzle-hole-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="var(--ink)" flood-opacity=".42"/></filter></defs><image href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" mask="url(#opening-photo-mask)"/>${PUZZLE_PIECES.map((piece) => `<image class="puzzle-filled-piece ${solvedPieces.has(piece.id) ? 'is-filled' : ''}" data-filled-piece="${piece.id}" href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" clip-path="url(#opening-board-clip-${piece.id})"/>`).join('')}<image class="puzzle-complete-photo" href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice"/>${PUZZLE_PIECES.map((piece) => `<path class="puzzle-empty-shape ${solvedPieces.has(piece.id) ? 'is-filled' : ''}" data-empty-piece="${piece.id}" d="${PUZZLE_PATH}" transform="${piece.transform}"/>`).join('')}<rect class="puzzle-photo-line" x="3" y="3" width="994" height="694" rx="10"/></svg>${PUZZLE_PIECES.map((piece) => `<span class="puzzle-target ${solvedPieces.has(piece.id) ? 'solved' : ''}" id="puzzle-hole-${piece.id}" data-piece="${piece.id}" style="${piece.target}" aria-hidden="true"></span>`).join('')}</div><p class="puzzle-caption">${t('littleSecret')}</p></div></div>`;
}

function puzzlePieces() {
  const source = escape(photoSource(gift.puzzle?.photo));
  return PUZZLE_PIECES.map((piece, index) => `<button class="puzzle-piece ${solvedPieces.has(piece.id) ? 'solved' : ''}" id="puzzle-piece-${piece.id}" data-piece="${piece.id}" aria-label="Pasangkan keping foto ${index + 1}" type="button"><svg viewBox="${piece.viewBox}" aria-hidden="true"><defs><clipPath id="opening-piece-clip-${piece.id}" clipPathUnits="userSpaceOnUse"><path d="${PUZZLE_PATH}" transform="${piece.transform}"/></clipPath></defs><image href="${source}" width="1000" height="700" preserveAspectRatio="xMidYMid slice" clip-path="url(#opening-piece-clip-${piece.id})"/><path class="puzzle-piece-line" d="${PUZZLE_PATH}" transform="${piece.transform}"/></svg></button>`).join('');
}

function puzzleGate() {
  return `<div class="puzzle-scene"><main class="puzzle-gate ${state.puzzleComplete ? 'puzzle-completed' : ''}"><span class="eyebrow">${t('puzzleEyebrow')}</span><h1>${t('puzzleTitle')}</h1>${puzzleBoard()}<div class="puzzle-progress"><span>${t('installed')}</span><strong>${solvedPieces.size} / 3</strong></div><div class="puzzle-tray">${puzzlePieces()}</div><button class="puzzle-assist" data-action="puzzle-assist">${t('assist')}</button><div class="puzzle-continuation" ${state.puzzleComplete ? '' : 'hidden'}><span>${t('complete')}</span><button data-action="enter">${t('openStory')} ${icon('arrow')}</button>${state.musicError ? `<small>${t('musicError')}</small>` : ''}</div></main></div>`;
}

function cover() {
  return `<section class="page page--cover" aria-label="Sampul komik">
    <div class="cover__corner">NO. 001<br/>A LITTLE LOVE STORY</div>
    <div class="cover__photo-wrap">${photoContent(gift.cover.photo, 'Foto kenangan dua orang', 'cover__photo')}<span class="photo-sticker">${icon('heart')}</span><span class="photo-tape" aria-hidden="true"></span></div>
    <div class="cover__speech"><span class="eyebrow">${escape(gift.cover.kicker)}</span><h1>${escape(gift.cover.title)}</h1><p>${t('for')} <strong>${escape(gift.recipient)}</strong>, ${t('from')} ${escape(gift.sender)}</p></div>
    <div class="cover__footer"><span>${escape(gift.cover.hint)}</span><button class="primary" data-action="open">${t('open')} ${icon('arrow')}</button></div>
  </section>`;
}

function memory() {
  return `<section class="page page--memory" aria-label="Awal cerita"><span class="eyebrow">${escape(gift.memory.label)}</span><h2>${escape(gift.memory.title)}</h2><div class="comic-photo comic-photo--large">${photoContent(gift.memory.photo, 'Foto momen bersama')}<span class="comic-photo__flash" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><path d="M24 3 27 18 40 9 31 22 46 24 31 28 40 41 27 32 24 47 21 32 8 41 17 28 2 24 17 22 8 9 21 18Z"/></svg></span></div><p class="hand-caption">${escape(gift.memory.caption)}</p><div class="speech-bubble"><span>aku:</span><p>${escape(gift.memory.body)}</p></div>${pager()}</section>`;
}

function reasons() {
  return `<section class="page page--reasons" aria-label="Tiga alasan"><span class="eyebrow">${escape(gift.reasons.label)}</span><h2>${escape(gift.reasons.title)}</h2><div class="reason-grid">${gift.reasons.items.map((item, index) => `<article class="reason" style="--reason-index:${index}"><span class="reason__number">0${index + 1}</span><p>${escape(item)}</p></article>`).join('')}</div><div class="reason-photo">${photoContent(gift.reasons.photo, 'Foto dua orang di bawah langit senja')}<span>little moments, big feelings</span></div><p class="reason-note">${escape(gift.reasons.note)}</p>${pager()}</section>`;
}

function letter() {
  return `<section class="page page--letter" aria-label="Surat singkat"><span class="eyebrow">${escape(gift.letter.label)}</span><h2>${escape(gift.letter.title)}</h2><div class="letter-paper"><span class="letter-paper__dear">${t('dear')} ${escape(gift.recipient)},</span><p>${escape(gift.letter.body)}</p><div class="letter-paper__signoff">${escape(gift.letter.signoff)}<strong>${escape(gift.sender)}</strong></div></div>${pager()}</section>`;
}

function noStyle() {
  const positions = [[52, 10], [11, 82], [52, 82], [11, 10], [52, 48], [11, 48], [52, 10], [11, 82], [52, 82], [11, 10], [52, 48]];
  const [left, top] = positions[Math.min(state.noDodges, positions.length - 1)];
  return `left:${left}%;top:${top}px`;
}

function question() {
  if (state.outcome) return result();
  return `<section class="page page--question" aria-label="Pertanyaan terakhir"><span class="eyebrow">${escape(gift.question.label)}</span><div class="question__bubble"><span class="hand-caption">${t('deepBreath')}</span><h2>${escape(gift.question.title)}</h2><p class="question__signature">— ${escape(gift.sender)}</p></div><div class="answer-area"><button class="answer-yes" data-action="yes">${escape(gift.question.yes)} ${icon('heart')}</button><button class="answer-no" data-action="no" style="${noStyle()}">${escape(gift.question.no)}</button></div><p class="answer-hint" aria-live="polite">${t('choose')}</p>${pager()}</section>`;
}

function result() {
  const yes = state.outcome === 'yes';
  const body = yes ? gift.question.yesBody : gift.question.noBody;
  const answer = yes ? gift.question.yes : gift.question.no;
  return `<section class="page page--result ${yes ? 'page--yes' : 'page--no'}" aria-label="Akhir cerita">
    <span class="eyebrow">${t('end')}</span>
    <div class="answer-printer ${yes ? 'is-positive' : ''}">
      <div class="answer-printer__machine"><span>CRUSH NOTE · MINI PRESS</span><i aria-hidden="true"></i><div class="answer-printer__slot"></div></div>
      <article class="answer-ticket">
        <span class="answer-ticket__eyebrow">${t('answerSaved')}</span>
        <div class="answer-ticket__rule"></div>
        <div class="answer-ticket__answer"><small>${t('answerLabel')}</small><strong>${escape(answer)}</strong></div>
        <p>${escape(body)}</p>
      </article>
    </div>
    <div class="answer-card-actions">
      <button class="secondary" data-action="download-answer">${icon('download')}${t('downloadCard')}</button>
      <button class="primary" data-action="share-answer">${icon('share')}${t('shareCard')}</button>
    </div>
    <p class="answer-export-status" aria-live="polite"></p>
    <button class="result-replay" data-action="replay">${t('replay')} ${icon('replay')}</button>
  </section>`;
}

function pager() {
  return `<nav class="pager" aria-label="Navigasi halaman"><button data-action="prev" aria-label="${t('previous')}">${icon('back')}</button><span>${String(state.page + 1).padStart(2, '0')} <i></i> 05</span><button data-action="next" aria-label="${t('next')}" ${state.page === 4 ? 'disabled' : ''}>${icon('arrow')}</button></nav>`;
}

function body() {
  return [cover, memory, reasons, letter, question][state.page]();
}

function render() {
  document.title = `Crush Note — untuk ${gift.recipient}`;
  if (state.gate) {
    app.innerHTML = puzzleGate();
    app.querySelector('.puzzle-photo')?.setAttribute('aria-label', `${t('puzzlePhoto')} ${gift.recipient}`);
    app.querySelectorAll('.puzzle-piece').forEach((piece, index) => piece.setAttribute('aria-label', `${t('puzzlePiece')} ${index + 1}`));
    app.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => act(button.dataset.action)));
    bindPuzzle();
    window.scrollTo(0, 0);
    return;
  }
  app.innerHTML = `<div class="scene"><div class="scene__halftone" aria-hidden="true"></div>${header()}<main class="book" key="${state.page}">${body()}</main><div class="scene__bottom">${state.page === 0 ? t('tap') : `${t('storyBy')} ${escape(gift.sender)}`}</div></div>`;
  const sectionLabelKeys = { cover: 'coverSection', memory: 'memorySection', reasons: 'reasonsSection', letter: 'letterSection', question: state.outcome ? 'resultSection' : 'questionSection', result: 'resultSection' };
  Object.entries(sectionLabelKeys).forEach(([className, key]) => app.querySelector(`.page--${className}`)?.setAttribute('aria-label', t(key)));
  app.querySelector('.pager')?.setAttribute('aria-label', t('pageNavigation'));
  app.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => act(button.dataset.action)));
  const noButton = app.querySelector('.answer-no');
  noButton?.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && state.noDodges < NO_DODGE_LIMIT) dodge();
  });
  window.scrollTo(0, 0);
}

function dodge() {
  state.noDodges += 1;
  const noButton = app.querySelector('.answer-no');
  if (noButton) noButton.setAttribute('style', noStyle());
}

function completePuzzle() {
  if (state.puzzleComplete) return;
  state.puzzleComplete = true;
  render();
  document.querySelector('.puzzle-scene')?.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  requestAnimationFrame(() => document.querySelector('.puzzle-continuation')?.classList.add('is-visible'));
}

function bindPuzzle() {
  const pieces = [...document.querySelectorAll('.puzzle-piece')];
  if (!pieces.length || state.puzzleComplete) return;

  const lockPiece = (piece, hole) => {
    const id = piece.dataset.piece;
    if (!id || solvedPieces.has(id)) return;
    solvedPieces.add(id);
    hole.classList.remove('near');
    hole.classList.add('solved');
    piece.classList.add('solved');
    document.querySelector(`[data-filled-piece="${id}"]`)?.classList.add('is-filled');
    document.querySelector(`[data-empty-piece="${id}"]`)?.classList.add('is-filled');
    const counter = document.querySelector('.puzzle-progress strong');
    if (counter) counter.textContent = `${solvedPieces.size} / 3`;
    if (solvedPieces.size === PUZZLE_PIECES.length) window.setTimeout(completePuzzle, 300);
  };

  pieces.forEach((piece) => {
    const hole = document.querySelector(`#puzzle-hole-${piece.dataset.piece}`);
    if (!hole) return;
    let startX = 0;
    let startY = 0;
    let moved = false;
    piece.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
      piece.setPointerCapture(event.pointerId);
      piece.classList.add('dragging');
    });
    piece.addEventListener('pointermove', (event) => {
      if (!piece.hasPointerCapture(event.pointerId)) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      piece.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * .025}deg)`;
      const a = piece.getBoundingClientRect();
      const b = hole.getBoundingClientRect();
      hole.classList.toggle('near', a.left < b.right + 18 && a.right > b.left - 18 && a.top < b.bottom + 18 && a.bottom > b.top - 18);
    });
    piece.addEventListener('pointerup', (event) => {
      piece.classList.remove('dragging');
      const a = piece.getBoundingClientRect();
      const b = hole.getBoundingClientRect();
      if (!moved || (a.left < b.right + 18 && a.right > b.left - 18 && a.top < b.bottom + 18 && a.bottom > b.top - 18)) lockPiece(piece, hole);
      else { piece.style.transform = ''; hole.classList.remove('near'); }
      try { piece.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    });
    piece.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); lockPiece(piece, hole); }
    });
  });
}

function wrapCanvasLines(context, text, x, y, maxWidth, lineHeight, maxLines = 5) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  let line = '';
  let lines = 0;
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines - 1) break;
    } else line = candidate;
  }
  if (line && lines < maxLines) context.fillText(line, x, y);
  return y + lineHeight;
}

async function answerCardBlob() {
  if (document.fonts?.ready) await document.fonts.ready;
  const yes = state.outcome === 'yes';
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const colors = activeTheme.colors;
  context.fillStyle = colors.canvas;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colors.halftone || colors.line;
  for (let y = 24; y < canvas.height; y += 34) for (let x = 24; x < canvas.width; x += 34) {
    context.globalAlpha = .2;
    context.beginPath(); context.arc(x, y, 2.2, 0, Math.PI * 2); context.fill();
  }
  context.globalAlpha = 1;
  const x = 82, y = 105, width = 916, height = 1230;
  context.fillStyle = colors.ink;
  context.fillRect(x + 18, y + 22, width, height);
  context.fillStyle = colors.paper;
  context.fillRect(x, y, width, height);
  context.strokeStyle = colors.accent;
  context.lineWidth = 3;
  context.setLineDash([12, 10]);
  context.strokeRect(x + 24, y + 24, width - 48, height - 48);
  context.setLineDash([]);

  const center = canvas.width / 2;
  context.textAlign = 'center';
  context.fillStyle = colors.accentDeep;
  context.font = '700 24px "Balsamiq Sans", sans-serif';
  context.fillText(t('answerSaved'), center, y + 130);
  context.strokeStyle = colors.line;
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(x + 105, y + 175); context.lineTo(x + width - 105, y + 175); context.stroke();

  const body = yes ? gift.question.yesBody : gift.question.noBody;
  const answer = yes ? gift.question.yes : gift.question.no;
  const answerY = y + 245;
  context.fillStyle = colors.secondary;
  context.fillRect(x + 106, answerY, width - 212, 180);
  context.fillStyle = colors.accentDeep;
  context.font = '700 21px "Balsamiq Sans", sans-serif';
  context.fillText(t('answerLabel'), center, answerY + 48);
  context.fillStyle = colors.ink;
  context.font = '700 48px "Balsamiq Sans", sans-serif';
  wrapCanvasLines(context, answer, center, answerY + 112, width - 270, 55, 2);

  context.textAlign = 'left';
  context.fillStyle = colors.inkSoft;
  context.font = '400 34px "Patrick Hand", sans-serif';
  wrapCanvasLines(context, body, x + 120, answerY + 270, width - 240, 42, 10);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
}

function downloadAnswerBlob(blob) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = 'crush-note-jawaban.png';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportAnswer(action) {
  const yes = state.outcome === 'yes';
  const status = app.querySelector('.answer-export-status');
  if (status) status.textContent = '…';
  try {
    const blob = await answerCardBlob();
    const file = new File([blob], 'crush-note-answer.png', { type: 'image/png' });
    if (action === 'share' && navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Crush Note · ' + t('answerSaved'), text: `${t('answerLabel')}: ${yes ? gift.question.yes : gift.question.no}\n\n${yes ? gift.question.yesBody : gift.question.noBody}`, files: [file] });
      if (status) status.textContent = t('cardStatus');
    } else {
      downloadAnswerBlob(blob);
      if (status) status.textContent = t('cardStatus');
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') { if (status) status.textContent = ''; return; }
    if (status) status.textContent = t('cardFailed');
  }
}

function act(action) {
  if (action === 'music') {
    if (audio.paused) audio.play().then(() => { state.musicError = false; render(); }).catch(() => { state.musicError = true; render(); });
    else { audio.pause(); render(); }
    return;
  }
  if (action === 'download-answer' || action === 'share-answer') { exportAnswer(action === 'share-answer' ? 'share' : 'download'); return; }
  if (action === 'puzzle-assist') {
    const pieces = [...document.querySelectorAll('.puzzle-piece')];
    pieces.forEach((piece) => {
      const hole = document.querySelector(`#puzzle-hole-${piece.dataset.piece}`);
      if (!hole || solvedPieces.has(piece.dataset.piece)) return;
      solvedPieces.add(piece.dataset.piece);
      piece.classList.add('solved');
      hole.classList.add('solved');
      document.querySelector(`[data-filled-piece="${piece.dataset.piece}"]`)?.classList.add('is-filled');
      document.querySelector(`[data-empty-piece="${piece.dataset.piece}"]`)?.classList.add('is-filled');
    });
    completePuzzle();
    return;
  }
  if (action === 'enter') {
    state.gate = false;
    state.page = 0;
    audio.play().catch(() => { state.musicError = true; });
    render();
    return;
  }
  if (action === 'open') { state.page = 1; render(); return; }
  if (action === 'next') state.page = Math.min(totalPages - 1, state.page + 1);
  if (action === 'prev') state.page = Math.max(0, state.page - 1);
  if (action === 'no') {
    if (state.noDodges < NO_DODGE_LIMIT) { dodge(); return; }
    state.outcome = 'no';
  }
  if (action === 'yes') state.outcome = 'yes';
  if (action === 'replay') { state.page = 0; state.outcome = null; state.noDodges = 0; }
  render();
}

let touchStart = null;
document.addEventListener('touchstart', (event) => {
  touchStart = { x: event.changedTouches[0].screenX, y: event.changedTouches[0].screenY };
}, { passive: true });
document.addEventListener('touchend', (event) => {
  if (!touchStart || state.page === 0 || state.outcome) return;
  const dx = event.changedTouches[0].screenX - touchStart.x;
  const dy = event.changedTouches[0].screenY - touchStart.y;
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) act(dx < 0 ? 'next' : 'prev');
}, { passive: true });
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' && state.page > 0 && !state.outcome) act('next');
  if (event.key === 'ArrowLeft' && state.page > 0 && !state.outcome) act('prev');
});
audio.addEventListener('play', render);
audio.addEventListener('pause', render);
if (giftLoadError) {
  app.innerHTML = '<main class="gift-unavailable"><span>CRUSH NOTE</span><h1>Gift belum bisa dibuka.</h1><p>Periksa kembali link atau coba beberapa saat lagi.</p><a href="/">Kembali</a></main>';
} else {
  hydrateAudio();
  render();
}

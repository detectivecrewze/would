import { defaultGift, loadGift } from './data.js';
import { presets } from './presets.js';
import { giftThemes } from './themes.js';
import { API_BASE, PUBLIC_APP_URL, apiRequest } from './config.js';

const STORAGE_KEY = 'crush-note:project:v1';
const editor = document.querySelector('#editor');
const saveState = document.querySelector('#save-state');
const previewPanel = document.querySelector('#preview-panel');
const previewFrame = document.querySelector('#gift-preview');
const previewLabel = document.querySelector('#preview-label');
const toast = document.querySelector('#studio-toast');
const steps = [...document.querySelectorAll('.step')];
const panels = [...document.querySelectorAll('.editor-step')];
const previewNames = {
  id: { puzzle: 'Puzzle opening', opening: 'Opening gift', chapter1: 'Chapter 1', chapter2: 'Chapter 2', letter: 'Surat', ending: 'Ending' },
  en: { puzzle: 'Puzzle opening', opening: 'Gift opening', chapter1: 'Chapter 1', chapter2: 'Chapter 2', letter: 'Letter', ending: 'Ending' },
};
const previewTabNames = {
  id: { puzzle: 'Puzzle', opening: 'Opening', chapter1: 'Ch. 1', chapter2: 'Ch. 2', letter: 'Surat', ending: 'Ending' },
  en: { puzzle: 'Puzzle', opening: 'Opening', chapter1: 'Ch. 1', chapter2: 'Ch. 2', letter: 'Letter', ending: 'Ending' },
};
const stepPreview = ['puzzle', 'chapter1', 'letter', 'ending', 'ending'];
const remoteParams = new URLSearchParams(location.search);
const remoteProjectId = remoteParams.get('project') || '';
const studioToken = remoteParams.get('token') || '';
let project = loadGift();
let remoteProjectError = '';
let remoteProjectReady = !remoteProjectId;
if (remoteProjectId) {
  try {
    if (!studioToken) throw new Error('Link Studio tidak memiliki token akses.');
    const result = await apiRequest('/api/studio/projects/' + encodeURIComponent(remoteProjectId), {
      headers: { 'X-Studio-Token': studioToken },
    });
    project = result.project;
    remoteProjectReady = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (error) {
    remoteProjectError = error.message || 'Project tidak dapat dimuat dari Worker.';
  }
}
if (!giftThemes[project.theme]) project.theme = 'classic';
let currentStep = 0;
let currentPreview = 'puzzle';
let saveTimer;
let playlist = [];
let pendingPreset = null;
let remoteSaveQueue = Promise.resolve();

const studioCopy = {
  id: {
    steps: ['Identitas','Awal cerita','Isi hati','Ending','Bagikan'],
    headings: ['Bahasa dan tokoh ceritamu.','Buka ceritanya dengan ringan.','Bagian yang membuatnya terasa personal.','Pertanyaan terakhir dan soundtrack.','Gift siap dibagikan.'],
    descriptions: ['Pilih bahasa gift terlebih dahulu. Preset pada langkah berikutnya otomatis mengikuti bahasa ini, sementara tulisanmu tetap dapat diedit kapan saja.','Atur cover comic dan halaman pertama. Tulis dengan gaya bicaramu sendiri agar tidak terasa seperti template.','Isi alasan-alasan kecil lalu lanjutkan dengan surat yang lebih jujur.','Atur momen puncak gift, respons setelah jawaban, dan lagu yang menemani ceritamu.','Pilih cara yang paling nyaman: kirim link langsung atau unduh barcode berbentuk love stamp.'],
    previous: 'Sebelumnya', next: 'Lanjutkan', finish: 'Selesai & buka gift', preview: 'Lihat preview', saved: 'Tersimpan', saving: 'Menyimpan...', choosePreset: 'Pilih preset siap pakai', applied: 'Preset diterapkan. Kamu masih bisa mengubah semua tulisannya.',
    presetModal: { eyebrow: 'LIHAT PRESET', intro: 'Cek dulu teks yang akan berubah. Preset baru diterapkan setelah kamu menekan tombolnya.', changes: 'BAGIAN YANG BERUBAH', before: 'SEBELUM', after: 'SESUDAH', cancel: 'Kembali', apply: 'Terapkan preset', empty: '(Kosong)', same: 'Isi preset ini sudah sama dengan yang sedang dipakai.' },
  },
  en: {
    steps: ['Identity','First pages','Your feelings','Ending','Share'],
    headings: ['Choose the language and characters.','Open the story in your own way.','Make every page feel personal.','The final question and soundtrack.','Your gift is ready to share.'],
    descriptions: ['Choose the gift language first. Every preset will follow this choice, while your own writing always remains editable.','Set up the comic cover and first chapter in the way you naturally speak.','Add the little reasons, then continue with a more honest letter.','Shape the final moment, its responses, and the song that accompanies your story.','Send the direct link or download an aesthetic love-stamp barcode.'],
    previous: 'Previous', next: 'Continue', finish: 'Finish & open gift', preview: 'View preview', saved: 'Saved', saving: 'Saving...', choosePreset: 'Choose a ready-to-use preset', applied: 'Preset applied. You can still edit every word.',
    presetModal: { eyebrow: 'PRESET PREVIEW', intro: 'Review the text changes first. The preset is applied only after you confirm.', changes: 'WHAT WILL CHANGE', before: 'BEFORE', after: 'AFTER', cancel: 'Go back', apply: 'Apply preset', empty: '(Empty)', same: 'This preset already matches the text in use.' },
  },
};
const ui = () => studioCopy[project.locale === 'en' ? 'en' : 'id'];
const activeTheme = () => giftThemes[project.theme] || giftThemes.classic;

const studioTranslations = [
  ['SELF-EDIT GIFT', 'SELF-EDIT GIFT'], ['Tersimpan', 'Saved'], ['Lihat preview', 'View preview'],
  ['Identitas', 'Identity'], ['Awal cerita', 'First pages'], ['Isi hati', 'Your feelings'], ['Bagikan', 'Share'],
  ['Tahapan Studio', 'Studio steps'], ['Pilih bahasa gift', 'Choose gift language'],
  ['WARNA GIFT', 'GIFT COLORS'], ['Pilih suasana warnanya', 'Choose a color mood'],
  ['Pilih warna untuk seluruh halaman gift. Isi ceritamu akan tetap sama.', 'Choose a color palette for every gift page. Your story content stays unchanged.'],
  ['Bahasa Indonesia', 'Bahasa Indonesia'], ['Studio, preset, dan tombol gift memakai Bahasa Indonesia.', 'Studio, presets, and gift controls use Indonesian.'],
  ['Studio presets and gift controls use English.', 'Studio presets and gift controls use English.'],
  ['Nama pengirim', 'Sender name'], ['Nama penerima', 'Recipient name'], ['WAJIB', 'REQUIRED'],
  ['TRANSISI PEMBUKA', 'OPENING TRANSITION'], ['Foto puzzle', 'Puzzle photo'],
  ['Foto ini hanya dipakai pada puzzle sebelum gift dibuka. Foto boleh dikosongkan, tetapi sangat direkomendasikan.', 'This photo is used only in the puzzle before the gift opens. It is optional, but recommended.'],
  ['RECOMMENDED', 'RECOMMENDED'], ['Pilih foto yang jelas dan punya ruang cukup agar tiga kepingnya mudah terlihat.', 'Choose a clear photo with enough room for all three puzzle pieces.'],
  ['Ganti foto', 'Replace photo'], ['Hapus', 'Remove'], ['OPTIONAL', 'OPTIONAL'], ['Foto opening', 'Opening photo'],
  ['Foto yang tampil pada cover comic setelah puzzle selesai.', 'This photo appears on the comic cover after the puzzle is complete.'],
  ['Catatan kecil di atas judul', 'Small note above the title'], ['Judul opening', 'Opening title'], ['Petunjuk membuka cerita', 'Story opening prompt'],
  ['Chapter 1 — Awal cerita', 'Chapter 1 — The beginning'], ['Foto Chapter 1', 'Chapter 1 photo'],
  ['Pilih foto yang cocok dengan cerita tentang awal mula perasaanmu.', 'Choose a photo that fits the story of how your feelings began.'],
  ['Label halaman', 'Page label'], ['Judul Chapter 1', 'Chapter 1 title'], ['Caption foto', 'Photo caption'], ['Isi cerita', 'Story'],
  ['Ceritakan bagaimana semuanya bermula atau momen kecil yang membuat kamu mulai tertarik.', 'Tell how it all began or share a small moment that made you interested.'],
  ['Chapter 2 — Alasan kecil', 'Chapter 2 — Little reasons'], ['Foto Chapter 2', 'Chapter 2 photo'],
  ['Gunakan foto yang berbeda agar halaman alasan kecil terasa seperti chapter baru.', 'Use a different photo to make this page feel like a new chapter.'],
  ['Judul Chapter 2', 'Chapter 2 title'], ['Alasan 1', 'Reason 1'], ['Alasan 2', 'Reason 2'], ['Alasan 3', 'Reason 3'], ['Catatan penutup halaman', 'Closing note'],
  ['Chapter 3 — Surat singkat', 'Chapter 3 — A short letter'], ['Judul surat', 'Letter title'], ['Isi surat', 'Letter'],
  ['Tidak ada batas kata. Tulis sepanjang yang kamu perlukan.', 'There is no word limit. Write as much as you need.'], ['Kalimat sebelum tanda tangan', 'Sign-off line'],
  ['Pertanyaan akhir', 'Final question'], ['Pertanyaan utama', 'Main question'], ['Teks tombol Iya', 'Yes button text'], ['Teks tombol Tidak', 'No button text'],
  ['Respons setelah menjawab', 'After-answer messages'], ['Judul saat memilih Iya', 'Title after choosing Yes'], ['Pesan saat memilih Iya', 'Message after choosing Yes'],
  ['Judul saat memilih Tidak', 'Title after choosing No'], ['Pesan saat memilih Tidak', 'Message after choosing No'],
  ['Soundtrack gift', 'Gift soundtrack'], ['Pilih dari library', 'Choose from library'], ['Upload MP3 sendiri', 'Upload your own MP3'], ['Cari lagu', 'Search songs'],
  ['Cari judul atau artis...', 'Search by title or artist...'], ['Memuat playlist...', 'Loading playlist...'], ['Pilih file MP3', 'Choose an MP3 file'],
  ['File disimpan di browser untuk fase lokal ini.', 'The file is saved in this browser for this local version.'], ['Judul lagu', 'Song title'], ['Nama artis', 'Artist name'],
  ['LINK GIFT', 'GIFT LINK'], ['Kirim link langsung', 'Share the direct link'],
  ['Gunakan alamat final gift setelah website dipublikasikan. Untuk preview lokal, alamat di bawah otomatis memakai halaman ini.', 'Use the final gift address after publishing the website. In local preview, the address below points to this page.'],
  ['Alamat gift', 'Gift address'], ['Salin link', 'Copy link'], ['Unduh barcode PNG', 'Download barcode PNG'],
  ['Puzzle', 'Puzzle'], ['Opening', 'Opening'], ['Ch. 1', 'Ch. 1'], ['Ch. 2', 'Ch. 2'], ['Surat', 'Letter'],
  ['Pilih bagian preview', 'Choose preview section'], ['Tutup preview', 'Close preview'], ['LIVE PREVIEW', 'LIVE PREVIEW'],
  ['Sebelumnya', 'Previous'], ['Lanjutkan', 'Continue'], ['Selesai & buka gift', 'Finish & open gift'],
];

function translateStaticUi() {
  const english = project.locale === 'en';
  const replacements = new Map(studioTranslations.map(([id, en]) => english ? [id, en] : [en, id]));
  const walker = document.createTreeWalker(document.querySelector('.studio-shell'), NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const trimmed = node.nodeValue.trim();
    const translated = replacements.get(trimmed);
    if (translated !== undefined && translated !== trimmed) node.nodeValue = node.nodeValue.replace(trimmed, translated);
  }
  const attributes = [
    ['aria-label', 'Pilih bahasa gift', 'Choose gift language'],
    ['aria-label', 'Pilih tema warna gift', 'Choose gift color theme'],
    ['aria-label', 'Pilihan warna gift', 'Gift color options'],
    ['aria-label', 'Tahapan Studio', 'Studio steps'],
    ['aria-label', 'Pilih bagian preview', 'Choose preview section'],
    ['aria-label', 'Tutup preview', 'Close preview'],
    ['title', 'Preview Crush Note', 'Crush Note preview'],
    ['placeholder', 'Cari judul atau artis...', 'Search by title or artist...'],
  ];
  attributes.forEach(([name, id, en]) => {
    document.querySelectorAll(`[${name}]`).forEach((element) => {
      if (element.getAttribute(name) === (english ? id : en)) element.setAttribute(name, english ? en : id);
    });
  });
  document.querySelectorAll('[data-preview]').forEach((button) => { button.textContent = (english ? previewTabNames.en : previewTabNames.id)[button.dataset.preview]; });
  previewLabel.textContent = (english ? previewNames.en : previewNames.id)[currentPreview];
}

const getByPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
function setByPath(object, path, value) {
  const keys = path.split('.');
  const final = keys.pop();
  let target = object;
  keys.forEach((key) => {
    if (target[key] === undefined) target[key] = /^\d+$/.test(key) ? [] : {};
    target = target[key];
  });
  target[final] = value;
}

function renderLanguageUi() {
  const copy = ui();
  document.documentElement.lang = project.locale === 'en' ? 'en' : 'id';
  steps.forEach((step, index) => { step.querySelector('b').textContent = copy.steps[index]; });
  panels.forEach((panel, index) => {
    const heading = panel.querySelector('.section-heading h1');
    const description = panel.querySelector('.section-heading p');
    if (heading) heading.textContent = copy.headings[index];
    if (description) description.textContent = copy.descriptions[index];
  });
  document.querySelector('#previous-step').textContent = copy.previous;
  document.querySelector('#next-step').textContent = copy.next;
  document.querySelector('#finish-gift').textContent = remoteProjectId ? (project.locale === 'en' ? 'Publish & open gift' : 'Publikasikan & buka gift') : copy.finish;
  document.querySelector('#open-preview').textContent = copy.preview;
  if (!saveState.classList.contains('is-saving')) saveState.textContent = copy.saved;
  document.querySelectorAll('[data-locale]').forEach((button) => button.classList.toggle('is-active', button.dataset.locale === project.locale));
  translateStaticUi();
  renderPhotoCards();
  renderThemeOptions();
  renderSelectedTrack();
  if (playlist.length) renderMusicLibrary(document.querySelector('#music-search').value);
  renderPresetRows();
  renderPresetModalCopy();
}

function renderThemeOptions() {
  const container = document.querySelector('#theme-options');
  const locale = project.locale === 'en' ? 'en' : 'id';
  const selectedKey = giftThemes[project.theme] ? project.theme : 'classic';
  container.replaceChildren();
  Object.entries(giftThemes).forEach(([key, theme]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-option' + (selectedKey === key ? ' is-selected' : '');
    button.dataset.themeChoice = key;
    button.setAttribute('aria-pressed', String(selectedKey === key));
    button.setAttribute('aria-label', theme.name[locale] + '. ' + theme.description[locale]);
    const swatches = document.createElement('span');
    swatches.className = 'theme-option__swatches';
    ['canvas', 'accent', 'secondary', 'highlight'].forEach((colorName) => {
      const swatch = document.createElement('span');
      swatch.className = 'theme-option__swatch';
      swatch.style.backgroundColor = theme.colors[colorName];
      swatch.setAttribute('aria-hidden', 'true');
      swatches.append(swatch);
    });
    const label = document.createElement('span');
    label.className = 'theme-option__label';
    const name = document.createElement('strong');
    name.textContent = theme.name[locale];
    const description = document.createElement('small');
    description.textContent = theme.description[locale];
    label.append(name, description);
    button.append(swatches, label);
    container.append(button);
  });
}

function renderPresetRows() {
  const locale = project.locale === 'en' ? 'en' : 'id';
  document.querySelectorAll('[data-preset-scope]').forEach((row) => {
    const scope = row.dataset.presetScope;
    row.innerHTML = `<span>${ui().choosePreset}</span><div>${presets[locale][scope].map((preset, index) => `<button type="button" data-apply-preset="${scope}" data-preset-index="${index}">${preset.name}</button>`).join('')}</div>`;
  });
}

const presetFieldLabels = {
  id: {
    'cover.kicker':'Catatan kecil', 'cover.title':'Judul opening', 'cover.hint':'Petunjuk membuka cerita',
    'memory.label':'Label halaman', 'memory.title':'Judul Chapter 1', 'memory.caption':'Caption foto', 'memory.body':'Isi cerita',
    'reasons.label':'Label halaman', 'reasons.title':'Judul Chapter 2', 'reasons.items.0':'Alasan 1', 'reasons.items.1':'Alasan 2', 'reasons.items.2':'Alasan 3', 'reasons.note':'Catatan penutup',
    'letter.label':'Label halaman', 'letter.title':'Judul surat', 'letter.body':'Isi surat', 'letter.signoff':'Kalimat tanda tangan',
    'question.label':'Label halaman', 'question.title':'Pertanyaan utama', 'question.yes':'Tombol Iya', 'question.no':'Tombol Tidak', 'question.yesTitle':'Judul respons Iya', 'question.yesBody':'Pesan respons Iya', 'question.noTitle':'Judul respons Tidak', 'question.noBody':'Pesan respons Tidak',
  },
  en: {
    'cover.kicker':'Small note', 'cover.title':'Opening title', 'cover.hint':'Opening prompt',
    'memory.label':'Page label', 'memory.title':'Chapter 1 title', 'memory.caption':'Photo caption', 'memory.body':'Story',
    'reasons.label':'Page label', 'reasons.title':'Chapter 2 title', 'reasons.items.0':'Reason 1', 'reasons.items.1':'Reason 2', 'reasons.items.2':'Reason 3', 'reasons.note':'Closing note',
    'letter.label':'Page label', 'letter.title':'Letter title', 'letter.body':'Letter', 'letter.signoff':'Sign-off',
    'question.label':'Page label', 'question.title':'Main question', 'question.yes':'Yes button', 'question.no':'No button', 'question.yesTitle':'Yes response title', 'question.yesBody':'Yes response message', 'question.noTitle':'No response title', 'question.noBody':'No response message',
  },
};

function renderPresetModalCopy() {
  const copy = ui().presetModal;
  document.querySelector('#preset-modal-eyebrow').textContent = copy.eyebrow;
  document.querySelector('#preset-modal-description').textContent = copy.intro;
  document.querySelector('#preset-modal-changes-label').textContent = copy.changes;
  document.querySelector('#preset-modal-cancel').textContent = copy.cancel;
  document.querySelector('#preset-modal-apply').textContent = copy.apply;
}

function presetValueText(value) {
  if (value === undefined || value === null || value === '') return ui().presetModal.empty;
  return String(value);
}

function openPresetPreview(scope, index) {
  const locale = project.locale === 'en' ? 'en' : 'id';
  const preset = presets[locale][scope]?.[index];
  if (!preset) return;
  pendingPreset = { scope, index };
  document.querySelector('#preset-modal-title').textContent = preset.name;
  const rows = document.querySelector('#preset-preview-changes');
  rows.replaceChildren();
  const changes = [];
  Object.entries(preset.values).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item, itemIndex) => changes.push([scope + '.' + key + '.' + itemIndex, item]));
    else changes.push([scope + '.' + key, value]);
  });
  changes.forEach(([path, nextValue]) => {
    const item = document.createElement('article');
    item.className = 'preset-change';
    const label = document.createElement('strong');
    label.textContent = presetFieldLabels[locale][path] || path;
    const values = document.createElement('div');
    values.className = 'preset-change__values';
    const before = document.createElement('div');
    before.className = 'preset-change__value';
    const beforeLabel = document.createElement('small');
    beforeLabel.textContent = ui().presetModal.before;
    const beforeText = document.createElement('p');
    beforeText.textContent = presetValueText(getByPath(project, path));
    before.append(beforeLabel, beforeText);
    const arrow = document.createElement('span');
    arrow.className = 'preset-change__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    const after = document.createElement('div');
    after.className = 'preset-change__value preset-change__value--after';
    const afterLabel = document.createElement('small');
    afterLabel.textContent = ui().presetModal.after;
    const afterText = document.createElement('p');
    afterText.textContent = presetValueText(nextValue);
    after.append(afterLabel, afterText);
    values.append(before, arrow, after);
    item.append(label, values);
    rows.append(item);
  });
  if (!changes.length) {
    const empty = document.createElement('p');
    empty.className = 'preset-modal__intro';
    empty.textContent = ui().presetModal.same;
    rows.append(empty);
  }
  document.querySelector('#preset-preview-dialog').showModal();
}

function applyPreset(scope, index) {
  const locale = project.locale === 'en' ? 'en' : 'id';
  const preset = presets[locale][scope]?.[index];
  if (!preset) return;
  Object.entries(preset.values).forEach(([key, value]) => setByPath(project, `${scope}.${key}`, structuredClone(value)));
  hydrateFields();
  persist();
  announce(ui().applied);
}

function placeholderArt(path) {
  const labels = { 'puzzle.photo': 'PUZZLE PHOTO', 'cover.photo': 'OPENING PHOTO', 'memory.photo': 'CHAPTER 1', 'reasons.photo': 'CHAPTER 2' };
  return `<div class="photo-empty"><span>♡</span><b>${labels[path]}</b><small>${project.locale === 'en' ? 'Optional photo' : 'Foto opsional'}</small></div>`;
}

function renderPhotoCards() {
  document.querySelectorAll('[data-photo-card]').forEach((card) => {
    const path = card.dataset.photoCard;
    const source = getByPath(project, path);
    const preview = card.querySelector('.photo-card__preview');
    preview.innerHTML = source ? `<img src="${source}" alt="${project.locale === 'en' ? 'Preview photo' : 'Preview foto'} ${path}"/>` : placeholderArt(path);
    card.classList.toggle('has-photo', Boolean(source));
  });
}

function hydrateFields() {
  editor.querySelectorAll('[data-path]').forEach((input) => {
    input.value = getByPath(project, input.dataset.path) ?? '';
    if (input.tagName === 'TEXTAREA') autoGrow(input);
  });
  renderPhotoCards();
  renderSelectedTrack();
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(textarea.scrollHeight, 62)}px`;
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function persist({ refresh = true } = {}) {
  saveState.textContent = ui().saving;
  saveState.classList.add('is-saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      if (remoteProjectId && !remoteProjectReady) throw new Error(remoteProjectError || 'Project Worker belum siap.');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      if (remoteProjectId) {
        const snapshot = JSON.stringify(project);
        remoteSaveQueue = remoteSaveQueue.then(() => apiRequest('/api/studio/projects/' + encodeURIComponent(remoteProjectId), {
          method: 'PUT',
          headers: { 'X-Studio-Token': studioToken, 'content-type': 'application/json' },
          body: JSON.stringify({ project: JSON.parse(snapshot) }),
        }));
        await remoteSaveQueue;
      }
      saveState.textContent = ui().saved;
      saveState.classList.remove('is-saving');
      if (refresh) refreshPreview();
    } catch (error) {
      saveState.textContent = project.locale === 'en' ? 'Save failed' : 'Gagal menyimpan';
      saveState.classList.remove('is-saving');
      announce(error.message || (project.locale === 'en' ? 'Could not save to Worker.' : 'Tidak dapat menyimpan ke Worker.'));
    }
  }, 420);
}

function refreshPreview() {
  previewFrame.src = `/?preview=1&section=${currentPreview}&studio=${Date.now()}`;
}

function showStep(index) {
  currentStep = Math.max(0, Math.min(panels.length - 1, index));
  panels.forEach((panel, panelIndex) => { panel.hidden = panelIndex !== currentStep; panel.classList.toggle('is-active', panelIndex === currentStep); });
  steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === currentStep));
  document.querySelector('#previous-step').disabled = currentStep === 0;
  document.querySelector('#next-step').hidden = currentStep === panels.length - 1;
  document.querySelector('#finish-gift').hidden = currentStep !== panels.length - 1;
  setPreview(stepPreview[currentStep]);
  if (currentStep === 4) renderBarcode();
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function setPreview(section) {
  currentPreview = section;
  previewLabel.textContent = (project.locale === 'en' ? previewNames.en : previewNames.id)[section];
  document.querySelectorAll('[data-preview]').forEach((button) => button.classList.toggle('is-active', button.dataset.preview === section));
  refreshPreview();
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const max = 1500;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/webp', .78));
      URL.revokeObjectURL(image.src);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

async function uploadRemoteMedia(file) {
  if (!remoteProjectId || !remoteProjectReady) throw new Error('Upload media memerlukan project Studio dari dashboard.');
  const result = await apiRequest('/api/studio/projects/' + encodeURIComponent(remoteProjectId) + '/media', {
    method: 'POST',
    headers: { 'X-Studio-Token': studioToken, 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });
  return result.url;
}

function openMediaDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('crush-note-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeAudio(file) {
  const db = await openMediaDb();
  await new Promise((resolve, reject) => {
    const request = db.transaction('files', 'readwrite').objectStore('files').put(file, 'custom-audio');
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

function renderSelectedTrack() {
  const track = project.music;
  const english = project.locale === 'en';
  const cover = track.coverUrl ? `<img src="${track.coverUrl}" alt=""/>` : '<span>♫</span>';
  document.querySelector('#selected-track').innerHTML = `${cover}<div><small>${english ? 'SELECTED SOUNDTRACK' : 'LAGU TERPILIH'}</small><strong>${track.title || (english ? 'Untitled song' : 'Lagu tanpa judul')}</strong><p>${track.artist || (english ? 'Unknown artist' : 'Artis tidak diketahui')}</p></div>`;
}

function renderMusicLibrary(query = '') {
  const normalized = query.trim().toLowerCase();
  const filtered = playlist.filter((song) => `${song.title} ${song.artist}`.toLowerCase().includes(normalized));
  const container = document.querySelector('#music-library');
  if (!filtered.length) { container.innerHTML = `<p class="library-empty">${project.locale === 'en' ? 'No songs found.' : 'Lagu tidak ditemukan.'}</p>`; return; }
  container.innerHTML = filtered.map((song) => {
    const index = playlist.indexOf(song);
    const active = project.music.url === song.audioUrl;
    return `<button type="button" class="music-card ${active ? 'is-active' : ''}" data-song-index="${index}"><img src="${song.coverUrl}" alt=""/><span><strong>${song.title}</strong><small>${song.artist}</small></span><b>${active ? '✓' : '+'}</b></button>`;
  }).join('');
}

async function loadPlaylist() {
  try {
    playlist = await fetch('/assets/playlist.json').then((response) => response.json());
    renderMusicLibrary();
  } catch { document.querySelector('#music-library').innerHTML = `<p class="library-empty">${project.locale === 'en' ? 'The playlist could not be loaded.' : 'Playlist belum dapat dimuat.'}</p>`; }
}

function selectLibrarySong(index) {
  const song = playlist[index];
  if (!song) return;
  project.music = { title: song.title, artist: song.artist, coverUrl: song.coverUrl, url: song.audioUrl, source: 'library' };
  hydrateFields();
  renderMusicLibrary(document.querySelector('#music-search').value);
  renderSelectedTrack();
  persist();
  announce(project.locale === 'en' ? 'Soundtrack selected.' : 'Soundtrack berhasil dipilih.');
}

function setMusicMode(mode) {
  document.querySelectorAll('[data-music-mode]').forEach((button) => button.classList.toggle('is-active', button.dataset.musicMode === mode));
  document.querySelector('#music-library-panel').hidden = mode !== 'library';
  document.querySelector('#music-upload-panel').hidden = mode !== 'upload';
}

function insideHeart(x, y, grid) {
  const normalizedX = ((x + 0.5 - grid / 2) / (grid / 2)) * 1.3;
  const normalizedY = -((y + 0.5 - grid / 2) / (grid / 2)) * 1.3;
  const x2 = normalizedX * normalizedX;
  const y2 = normalizedY * normalizedY;
  const term = x2 + y2 - 1;
  return term * term * term - x2 * y2 * normalizedY <= 0;
}

function decorativeDot(x, y) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value) > 0.47;
}

function appendSvgRect(svg, x, y, width, height, fill, radius = 0) {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('fill', fill);
  if (radius) rect.setAttribute('rx', String(radius));
  svg.append(rect);
}

function createHeartQr(url) {
  if (!window.QRCode) return null;
  const scratch = document.createElement('div');
  let generator;
  const colors = activeTheme().colors;
  try {
    generator = new window.QRCode(scratch, { text: url, width: 256, height: 256, colorDark: colors.ink, colorLight: colors.paper, correctLevel: window.QRCode.CorrectLevel.H });
  } catch {
    return null;
  }
  const matrix = generator._oQRCode;
  if (!matrix) return null;
  const count = matrix.getModuleCount();
  const grid = Math.ceil(count * 2.25);
  const offset = Math.floor((grid - count) / 2);
  const quiet = 2;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('viewBox', '0 0 ' + grid + ' ' + grid);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', project.locale === 'en' ? 'Heart-shaped QR code' : 'Barcode QR berbentuk hati');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const heartCells = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  heartCells.setAttribute('fill', colors.accentDeep);
  heartCells.setAttribute('opacity', '.8');
  const dark = colors.ink;
  const paper = colors.paper;
  for (let y = 0; y < grid; y += 1) {
    for (let x = 0; x < grid; x += 1) {
      const inQuietArea = x >= offset - quiet && x < offset + count + quiet && y >= offset - quiet && y < offset + count + quiet;
      if (!inQuietArea && insideHeart(x, y, grid) && decorativeDot(x, y)) appendSvgRect(heartCells, x + 0.12, y + 0.12, 0.76, 0.76, colors.accentDeep, 0.26);
    }
  }
  svg.append(heartCells);
  appendSvgRect(svg, offset - quiet, offset - quiet, count + quiet * 2, count + quiet * 2, paper, 2);
  const qrCells = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  qrCells.setAttribute('fill', dark);
  for (let y = 0; y < count; y += 1) {
    for (let x = 0; x < count; x += 1) {
      if (matrix.isDark(y, x)) appendSvgRect(qrCells, offset + x, offset + y, 1, 1, dark);
    }
  }
  svg.append(qrCells);
  return svg;
}

function renderBarcode() {
  const url = document.querySelector('#share-url').value.trim() || location.origin + '/';
  const target = document.querySelector('#barcode-qr');
  target.replaceChildren();
  const svg = createHeartQr(url);
  if (svg) target.append(svg);
  else target.textContent = project.locale === 'en' ? 'QR code could not be generated.' : 'Barcode belum dapat dibuat.';
}

function svgAsImage(svg) {
  return new Promise((resolve, reject) => {
    const source = new XMLSerializer().serializeToString(svg);
    const imageUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(imageUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(imageUrl); reject(new Error('Could not render QR image')); };
    image.src = imageUrl;
  });
}

async function downloadBarcode() {
  const svg = document.querySelector('#barcode-qr svg');
  if (!svg) { announce(project.locale === 'en' ? 'QR code is not ready yet.' : 'Barcode belum siap diunduh.'); return; }
  try {
    const image = await svgAsImage(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1030;
    const context = canvas.getContext('2d');
    const colors = activeTheme().colors;
    context.fillStyle = colors.canvas;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colors.paperLight;
    context.fillRect(42, 42, 816, 946);
    context.strokeStyle = colors.line;
    context.lineWidth = 2;
    context.setLineDash([7, 7]);
    context.strokeRect(66, 66, 768, 898);
    context.setLineDash([]);
    context.drawImage(image, 100, 92, 700, 700);
    context.fillStyle = colors.accentDeep;
    context.textAlign = 'center';
    context.font = '700 27px Arial';
    context.fillText('SCAN TO OPEN THE STORY', 450, 876);
    const link = document.createElement('a');
    link.download = 'crush-note-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    announce(project.locale === 'en' ? 'The QR image could not be downloaded.' : 'Barcode belum dapat diunduh. Coba lagi.');
  }
}

editor.addEventListener('input', (event) => {
  const input = event.target.closest('[data-path]');
  if (!input) return;
  setByPath(project, input.dataset.path, input.value);
  if (input.tagName === 'TEXTAREA') autoGrow(input);
  if (input.dataset.path.startsWith('music.')) renderSelectedTrack();
  if (input.dataset.path === 'recipient') renderBarcode();
  persist();
});

editor.addEventListener('change', async (event) => {
  const input = event.target.closest('[data-photo]');
  if (!input?.files?.[0]) return;
  const card = input.closest('.photo-card');
  card.classList.add('is-loading');
  try {
    const compressed = await compressImage(input.files[0]);
    const imageBlob = await (await fetch(compressed)).blob();
    const result = remoteProjectId ? await uploadRemoteMedia(new File([imageBlob], 'photo.webp', { type: 'image/webp' })) : compressed;
    setByPath(project, input.dataset.photo, result);
    renderPhotoCards();
    persist();
    announce('Foto berhasil dipasang.');
  } catch {
    announce('Foto belum dapat diproses. Coba file lain.');
  } finally {
    card.classList.remove('is-loading');
    input.value = '';
  }
});

editor.addEventListener('click', (event) => {
  const presetButton = event.target.closest('[data-apply-preset]');
  if (presetButton) { openPresetPreview(presetButton.dataset.applyPreset, Number(presetButton.dataset.presetIndex)); return; }
  const songButton = event.target.closest('[data-song-index]');
  if (songButton) { selectLibrarySong(Number(songButton.dataset.songIndex)); return; }
  const remove = event.target.closest('[data-remove-photo]');
  if (!remove) return;
  setByPath(project, remove.dataset.removePhoto, '');
  renderPhotoCards();
  persist();
  announce('Foto dihapus. Ilustrasi comic akan digunakan.');
});

document.querySelectorAll('[data-locale]').forEach((button) => button.addEventListener('click', () => {
  project.locale = button.dataset.locale;
  renderLanguageUi();
  persist();
  announce(project.locale === 'en' ? 'English presets are ready.' : 'Preset Bahasa Indonesia siap digunakan.');
}));

document.querySelectorAll('[data-music-mode]').forEach((button) => button.addEventListener('click', () => setMusicMode(button.dataset.musicMode)));
document.querySelector('#music-search').addEventListener('input', (event) => renderMusicLibrary(event.target.value));
document.querySelector('#audio-upload').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('audio/')) { announce('Pilih file audio MP3 atau M4A.'); return; }
  try {
    const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const audioUrl = remoteProjectId ? await uploadRemoteMedia(file) : (await storeAudio(file), 'indexeddb://custom-audio');
    project.music = { ...project.music, title: cleanName, artist: project.locale === 'en' ? 'Your uploaded song' : 'Lagu pilihanmu', coverUrl: '', url: audioUrl, source: 'upload' };
    hydrateFields();
    persist();
    announce(project.locale === 'en' ? 'Your audio is ready.' : 'File audio berhasil dipasang.');
  } catch { announce('Audio belum dapat disimpan. Coba file yang lebih kecil.'); }
  event.target.value = '';
});

document.querySelector('#theme-options').addEventListener('click', (event) => {
  const button = event.target.closest('[data-theme-choice]');
  if (!button) return;
  project.theme = button.dataset.themeChoice;
  renderThemeOptions();
  if (currentStep === 4) renderBarcode();
  persist();
  const selected = activeTheme().name[project.locale === 'en' ? 'en' : 'id'];
  announce(project.locale === 'en' ? 'Gift colors changed to ' + selected + '.' : 'Warna gift diubah ke ' + selected + '.');
});

document.querySelector('#share-url').addEventListener('input', renderBarcode);
document.querySelector('#copy-link').addEventListener('click', async () => {
  const url = document.querySelector('#share-url').value.trim();
  try { await navigator.clipboard.writeText(url); announce(project.locale === 'en' ? 'Gift link copied.' : 'Link gift berhasil disalin.'); }
  catch { document.querySelector('#share-url').select(); announce('Pilih lalu salin link yang sudah ditandai.'); }
});
document.querySelectorAll('[data-preset-cancel]').forEach((button) => button.addEventListener('click', () => document.querySelector('#preset-preview-dialog').close()));
document.querySelector('#preset-preview-dialog').addEventListener('click', (event) => { if (event.target.id === 'preset-preview-dialog') event.currentTarget.close(); });
document.querySelector('#preset-modal-apply').addEventListener('click', () => {
  if (!pendingPreset) return;
  const selection = pendingPreset;
  document.querySelector('#preset-preview-dialog').close();
  pendingPreset = null;
  applyPreset(selection.scope, selection.index);
});
document.querySelector('#download-barcode').addEventListener('click', downloadBarcode);

steps.forEach((step) => step.addEventListener('click', () => showStep(Number(step.dataset.step))));
document.querySelector('#previous-step').addEventListener('click', () => showStep(currentStep - 1));
document.querySelector('#next-step').addEventListener('click', () => showStep(currentStep + 1));
document.querySelector('#finish-gift').addEventListener('click', async (event) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  if (!remoteProjectId) {
    window.open('/', '_blank', 'noopener');
    return;
  }
  if (!remoteProjectReady) { announce(remoteProjectError || 'Project Worker belum siap.'); return; }
  const button = event.currentTarget;
  button.disabled = true;
  const giftTab = window.open('about:blank', '_blank');
  if (giftTab) giftTab.opener = null;
  try {
    clearTimeout(saveTimer);
    await remoteSaveQueue;
    await apiRequest('/api/studio/projects/' + encodeURIComponent(remoteProjectId), {
      method: 'PUT',
      headers: { 'X-Studio-Token': studioToken, 'content-type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    const published = await apiRequest('/api/studio/projects/' + encodeURIComponent(remoteProjectId) + '/publish', {
      method: 'POST',
      headers: { 'X-Studio-Token': studioToken },
    });
    document.querySelector('#share-url').value = remoteProjectId
  ? new URL('/?gift=' + encodeURIComponent(remoteProjectId), PUBLIC_APP_URL).toString()
  : location.origin + '/';
    renderBarcode();
    if (giftTab) giftTab.location.href = published.giftUrl;
    saveState.textContent = project.locale === 'en' ? 'Published' : 'Gift dipublikasikan';
    announce(project.locale === 'en' ? 'Your gift is live.' : 'Gift berhasil dipublikasikan.');
  } catch (error) {
    if (giftTab) giftTab.close();
    announce(error.message || 'Gift belum dapat dipublikasikan.');
  } finally {
    button.disabled = false;
  }
});
document.querySelector('#open-preview').addEventListener('click', () => previewPanel.classList.add('is-open'));
document.querySelector('#close-preview').addEventListener('click', () => previewPanel.classList.remove('is-open'));
document.querySelectorAll('[data-preview]').forEach((button) => button.addEventListener('click', () => setPreview(button.dataset.preview)));

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  project = loadGift();
  hydrateFields();
  refreshPreview();
});

hydrateFields();
document.querySelector('#share-url').value = `${location.origin}/`;
renderLanguageUi();
if (remoteProjectError) {
  editor.inert = true;
  announce(remoteProjectError + ' Buka dashboard lalu masuk ulang ke Studio.');
}
loadPlaylist();
renderBarcode();
setMusicMode(project.music.source === 'upload' ? 'upload' : 'library');
showStep(0);

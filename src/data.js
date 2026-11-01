export const defaultGift = {
  locale: 'id',
  theme: 'classic',
  recipient: 'Nara',
  sender: 'Adit',
  puzzle: {
    photo: '/assets/our-moment.jpg',
  },
  cover: {
    kicker: 'Sebuah pesan rahasia',
    title: 'Ada cerita kecil yang mau kusampaikan.',
    hint: 'Buka komiknya sampai halaman terakhir, ya.',
    photo: '/assets/our-moment.jpg',
  },
  memory: {
    label: 'CHAPTER 01 / AWAL CERITA',
    title: 'Awalnya cuma mau bilang halo.',
    body: 'Tapi setelah kenal kamu, obrolan sesingkat apa pun selalu jadi bagian favorit dari hariku.',
    caption: 'hari biasa yang mendadak terasa spesial',
    photo: '/assets/our-moment.jpg',
  },
  reasons: {
    label: 'CHAPTER 02 / CATATAN KECIL',
    title: 'Tiga hal tentang kamu yang susah kuabaikan.',
    items: [
      'Senyummu bisa memperbaiki hari yang berantakan.',
      'Aku selalu ingin obrolan kita berlangsung sedikit lebih lama.',
      'Bersamamu, hal sederhana terasa punya cerita.',
    ],
    note: 'dan ternyata... aku suka kamu.',
    photo: '/assets/sunset.jpg',
  },
  letter: {
    label: 'CHAPTER 03 / JUJUR SEBENTAR',
    title: 'Jadi, ini yang sebenarnya ingin kubilang...',
    body: 'Aku suka kamu, Nar. Bukan cuma karena hari-hari bersamamu terasa lebih seru, tapi karena aku bisa jadi diriku sendiri saat dekat denganmu. Aku nggak tahu cerita ini akan ke mana, tapi aku ingin mencoba menulis halaman berikutnya bersamamu.',
    signoff: 'dari seseorang yang diam-diam suka kamu,',
  },
  question: {
    label: 'THE FINAL PANEL',
    title: 'Mau nggak kita coba jalan bareng, kali ini sebagai kita?',
    yes: 'Iya, mau!',
    no: 'Nggak dulu',
    yesTitle: 'Yay! Ini awal cerita kita.',
    yesBody: 'Sekarang kita punya alasan baru untuk tersenyum setiap kali ingat halaman ini.',
    noTitle: 'Terima kasih sudah jujur.',
    noBody: 'Terima kasih sudah membaca ceritaku sampai halaman terakhir.',
  },
  music: {
    title: 'About You',
    artist: 'The 1975',
    coverUrl: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904442555-tjdyhk.jpg',
    url: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904364430-4b7hn9.mp3',
    source: 'library',
  },
};

function mergeProject(base, saved) {
  if (!saved || typeof saved !== 'object') return structuredClone(base);
  const output = structuredClone(base);
  Object.entries(saved).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object') {
      output[key] = { ...output[key], ...value };
    } else if (value !== undefined) output[key] = value;
  });
  return output;
}

export function loadGift() {
  try {
    return mergeProject(defaultGift, JSON.parse(localStorage.getItem('crush-note:project:v1') || 'null'));
  } catch {
    return structuredClone(defaultGift);
  }
}

export const gift = loadGift();

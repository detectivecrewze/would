export const defaultGift = {
  locale: 'id',
  theme: 'classic',
  recipient: 'Nara',
  sender: 'Adit',
  puzzle: { photo: 'https://crush-note-api.aldoramadhan16.workers.dev/media/crush-note/crush-note-9a199158/1793557153728-9b49bfed.webp' },
  cover: {
    kicker: 'Akhirnya aku bilang juga',
    title: 'Hari ini aku memilih untuk jujur tentang kamu.',
    hint: 'Baca sampai akhir sebelum kamu menjawab, ya.',
    photo: 'https://crush-note-api.aldoramadhan16.workers.dev/media/crush-note/crush-note-9a199158/1793556844977-2d606d10.webp',
  },
  memory: {
    label: 'CHAPTER 01 / AWAL CERITA',
    title: 'Awalnya cuma mau bilang halo.',
    body: 'Tapi setelah kenal kamu, obrolan sesingkat apa pun selalu jadi bagian favorit dari hariku.',
    caption: 'my favorite view',
    photo: 'https://crush-note-api.aldoramadhan16.workers.dev/media/crush-note/crush-note-9a199158/1793556878153-95d4ba39.webp',
  },
  reasons: {
    label: 'CHAPTER 02 / KENAPA KAMU',
    title: 'Bukan satu alasan besar, tapi banyak hal kecil.',
    items: ['Cara kamu ngedengerin cerita aku setiap kali telpon', 'Cara kamu ngebuat hari buruk menjadi hari yang baik', 'Aku bisa lebih jujur pas bareng sama kamu'],
    note: 'hal-hal kecil itu akhirnya menjadi rasa yang besar.',
    photo: 'https://crush-note-api.aldoramadhan16.workers.dev/media/crush-note/crush-note-9a199158/1793556927140-45ba7fd6.webp',
  },
  letter: {
    label: 'CHAPTER 03 / JUJUR SEBENTAR',
    title: 'Jadi, ini yang sebenarnya ingin kubilang...',
    body: 'Aku suka kamu, Nar. Bukan cuma karena hari-hari bersamamu terasa lebih seru, tapi karena aku bisa jadi diriku sendiri saat dekat denganmu. Aku nggak tahu cerita ini akan ke mana, tapi aku ingin mencoba menulis halaman berikutnya bersamamu.',
    signoff: 'Your favorite admirer',
  },
  question: {
    label: 'THE FINAL PANEL',
    title: 'Mau nggak kita coba jalan bareng, kali ini sebagai kita?',
    yes: 'Iya, mau!',
    no: 'Nggak dulu',
    yesBody: 'Sekarang kita punya alasan baru untuk tersenyum setiap kali ingat halaman ini.',
    noBody: 'Terima kasih sudah membaca ceritaku sampai halaman terakhir.',
  },
  music: {
    title: 'About You', artist: 'The 1975',
    coverUrl: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904442555-tjdyhk.jpg',
    url: 'https://arcade-edition.aldoramadhan16.workers.dev/files/1773904364430-4b7hn9.mp3', source: 'library',
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

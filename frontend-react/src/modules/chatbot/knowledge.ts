/**
 * Basis pengetahuan lokal chatbot bantuan: daftar artikel fitur dan pencarian ekstraktif tanpa LLM.
 * Isi artikel (judul, jawaban, kata kunci) ada di locales `chatbot.kb.<id>` agar ikut bahasa aktif.
 *
 * Dipakai di: ChatbotWidget.tsx, tests/chatbot.test.tsx.
 */

export interface KnowledgeArticle {
  id: string;
  /** Halaman tujuan tombol "Buka halaman"; null bila tidak ada halaman khusus. */
  path: string | null;
  /** Kode menu untuk cek izin can(); null bila halaman terbuka untuk semua user. */
  menu: string | null;
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  { id: 'pendaftaran', path: '/transaction/pendaftaran', menu: 'pendaftaran' },
  { id: 'pasien', path: '/master/pasien', menu: 'master-pasien' },
  { id: 'antrean', path: '/transaction/antrean', menu: 'antrean' },
  { id: 'displayAntrean', path: '/display-antrean', menu: null },
  { id: 'pemeriksaan', path: '/transaction/pemeriksaan', menu: 'pemeriksaan' },
  { id: 'riwayatMedis', path: '/transaction/riwayat-medis', menu: 'riwayat-medis' },
  { id: 'farmasi', path: '/transaction/farmasi', menu: 'farmasi' },
  { id: 'laboratorium', path: '/transaction/laboratorium', menu: 'laboratorium' },
  { id: 'billing', path: '/transaction/billing', menu: 'billing' },
  { id: 'dashboard', path: '/dashboard', menu: 'dashboard' },
  { id: 'jadwal', path: '/master/jadwal-dokter', menu: 'master-jadwal-dokter' },
  { id: 'obat', path: '/master/obat', menu: 'master-obat' },
  { id: 'masterData', path: '/master/poli', menu: 'master-poli' },
  { id: 'userRole', path: '/system/role-access', menu: 'system-role-access' },
  { id: 'pengaturan', path: null, menu: null },
];

const STOPWORDS = new Set(
  (
    'apa yang di ke dari dan atau saya bagaimana cara caranya dimana mana ada untuk dengan ini itu mau ingin bisa menu ' +
    'fitur halaman how to the a an where is do i can what of in on for and or my page feature'
  ).split(' '),
);

/** Memecah teks menjadi token huruf kecil tanpa stopword. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

// Token >= 4 huruf boleh cocok sebagian, misal "daftar" mengenai "pendaftaran".
function matches(queryToken: string, docTokens: string[]): boolean {
  return docTokens.some((docToken) => {
    if (docToken === queryToken) return true;
    if (queryToken.length < 4 || docToken.length < 4) return false;
    return docToken.includes(queryToken) || queryToken.includes(docToken);
  });
}

export interface KnowledgeText {
  title: string;
  keywords: string;
  answer: string;
}

/**
 * Mengurutkan artikel menurut skor kecocokan kata (kata kunci x3, judul x2, isi x1).
 * Hanya artikel dengan skor > 0 yang dikembalikan, paling relevan di depan.
 */
export function searchKnowledge(
  query: string,
  articles: KnowledgeArticle[],
  getText: (id: string) => KnowledgeText,
  limit = 3,
): KnowledgeArticle[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  return articles
    .map((article) => {
      const text = getText(article.id);
      const keywords = tokenize(text.keywords);
      const title = tokenize(text.title);
      const answer = tokenize(text.answer);
      const score = queryTokens.reduce(
        (sum, token) =>
          sum +
          (matches(token, keywords) ? 3 : 0) +
          (matches(token, title) ? 2 : 0) +
          (matches(token, answer) ? 1 : 0),
        0,
      );
      return { article, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.article);
}

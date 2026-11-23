/**
 * Basis pengetahuan lokal chatbot bantuan: daftar artikel fitur, pencarian fuzzy + sinonim tanpa LLM,
 * router intent deterministik untuk input bebas, dan pemetaan konteks halaman aktif.
 * Isi artikel (judul, jawaban, kata kunci) ada di locales `chatbot.kb.<id>` agar ikut bahasa aktif.
 *
 * Dipakai di: ChatbotWidget.tsx, tests/chatbot.test.tsx.
 */

export type Topic =
  | 'pasien'
  | 'tagihan'
  | 'jadwal'
  | 'obat'
  | 'farmasi'
  | 'lab'
  | 'ringkasan'
  | 'faq';

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

/** Kamus sinonim domain rumah sakit (ID & EN) untuk memperluas token pertanyaan tanpa LLM. */
const SYNONYMS: Record<string, string[]> = {
  apotek: ['farmasi', 'resep'],
  apotik: ['farmasi', 'resep'],
  tebus: ['farmasi', 'resep'],
  racik: ['farmasi', 'resep'],
  pharmacy: ['farmasi', 'resep'],
  prescription: ['resep', 'farmasi'],
  kwitansi: ['billing', 'invoice', 'pembayaran'],
  kuitansi: ['billing', 'invoice', 'pembayaran'],
  struk: ['billing', 'invoice', 'pembayaran'],
  nota: ['billing', 'invoice', 'pembayaran'],
  kasir: ['billing', 'pembayaran'],
  bayar: ['billing', 'pembayaran', 'invoice'],
  tagihan: ['billing', 'invoice', 'pembayaran'],
  lunas: ['billing', 'pembayaran'],
  receipt: ['billing', 'invoice', 'payment'],
  payment: ['billing', 'invoice'],
  antri: ['antrean'],
  antrian: ['antrean'],
  queue: ['antrean'],
  rontgen: ['laboratorium', 'lab'],
  darah: ['laboratorium', 'lab'],
  urine: ['laboratorium', 'lab'],
  sampel: ['laboratorium', 'lab'],
  praktek: ['jadwal', 'dokter'],
  praktik: ['jadwal', 'dokter'],
  shift: ['jadwal', 'dokter'],
  kuota: ['jadwal', 'dokter'],
  schedule: ['jadwal', 'dokter'],
  stok: ['obat'],
  gudang: ['obat'],
  stock: ['obat'],
  medicine: ['obat'],
  drug: ['obat'],
  rekam: ['riwayat', 'medis'],
  medik: ['riwayat', 'medis'],
  emr: ['riwayat', 'medis'],
  history: ['riwayat', 'medis'],
  soap: ['pemeriksaan'],
  anamnesis: ['pemeriksaan'],
  diagnosa: ['pemeriksaan', 'icd'],
  diagnosis: ['pemeriksaan', 'icd'],
  periksa: ['pemeriksaan'],
  registrasi: ['pendaftaran'],
  regis: ['pendaftaran'],
  loket: ['pendaftaran'],
  tv: ['display', 'antrean'],
  layar: ['display', 'antrean'],
  monitor: ['display', 'antrean'],
  suara: ['display', 'antrean'],
  panggil: ['display', 'antrean'],
  akses: ['role', 'izin'],
  hak: ['role', 'izin'],
  akun: ['user', 'role'],
  permission: ['role', 'access'],
  rbac: ['role', 'access'],
  bahasa: ['pengaturan', 'tema'],
  tema: ['pengaturan', 'gelap'],
  gelap: ['pengaturan', 'tema'],
  terang: ['pengaturan', 'tema'],
  dark: ['pengaturan', 'theme'],
  language: ['pengaturan', 'theme'],
};

/** Memecah teks menjadi token huruf kecil tanpa stopword. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Menghitung jarak edit Levenshtein dengan batas awal agar tetap ringan di browser. */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr.push(val);
      if (val < rowMin) rowMin = val;
    }
    if (rowMin > maxDist) return maxDist + 1;
    prev = curr;
  }
  return prev[b.length];
}

function tokenMatchScore(queryToken: string, docTokens: string[]): number {
  let best = 0;
  for (const docToken of docTokens) {
    if (docToken === queryToken) return 1;
    if (queryToken.length >= 4 && docToken.length >= 4) {
      if (docToken.includes(queryToken) || queryToken.includes(docToken)) {
        best = Math.max(best, 0.9);
        continue;
      }
      const allowedDist = queryToken.length >= 7 && docToken.length >= 7 ? 2 : 1;
      if (editDistance(queryToken, docToken, allowedDist) <= allowedDist) {
        best = Math.max(best, 0.7);
      }
    }
  }
  return best;
}

function expandToken(token: string): Array<{ term: string; weight: number }> {
  const expanded: Array<{ term: string; weight: number }> = [{ term: token, weight: 1 }];
  const syns = SYNONYMS[token];
  if (syns) {
    for (const syn of syns) {
      expanded.push({ term: syn, weight: 0.85 });
    }
  }
  return expanded;
}

export interface KnowledgeText {
  title: string;
  keywords: string;
  answer: string;
}

/**
 * Mengurutkan artikel menurut skor kecocokan kata (kata kunci x3, judul x2, isi x1),
 * termasuk ekspansi sinonim domain RS dan toleransi typo (Levenshtein 1-2).
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
      const score = queryTokens.reduce((sum, token) => {
        let bestTokenScore = 0;
        for (const variant of expandToken(token)) {
          const s =
            (tokenMatchScore(variant.term, keywords) * 3 +
              tokenMatchScore(variant.term, title) * 2 +
              tokenMatchScore(variant.term, answer) * 1) *
            variant.weight;
          if (s > bestTokenScore) bestTokenScore = s;
        }
        return sum + bestTokenScore;
      }, 0);
      return { article, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.article);
}

export interface DetectedIntent {
  topic: Topic;
  query: string;
}

const PREFIX_PATTERNS: Array<{ topic: Topic; regex: RegExp; defaultQuery?: string }> = [
  { topic: 'tagihan', regex: /^(?:cek|status|cari)?\s*(?:tagihan|invoice|billing)\s+(.+)$/i },
  { topic: 'pasien', regex: /^(?:cari|cek|info)\s+pasien\s+(.+)$/i },
  {
    topic: 'jadwal',
    regex: /^(?:cek|lihat)?\s*jadwal(?:\s+(?:dokter|poli|praktik|praktek))?(?:\s+(.*))?$/i,
    defaultQuery: 'hari ini',
  },
  { topic: 'obat', regex: /^(?:cek\s+)?(?:stok|harga)\s+obat\s+(.+)$/i },
  { topic: 'obat', regex: /^(?:cari|cek)\s+obat\s+(.+)$/i },
  {
    topic: 'farmasi',
    regex: /^(?:cek|status|antrean)\s+(?:resep|farmasi)(?:\s+(.*))?$/i,
    defaultQuery: 'aktif',
  },
  {
    topic: 'lab',
    regex: /^(?:cek|status|worklist|order)\s+(?:lab|laboratorium)(?:\s+(.*))?$/i,
    defaultQuery: 'aktif',
  },
  {
    topic: 'ringkasan',
    regex: /^(?:ringkasan|summary|laporan\s+hari\s+ini|belum\s+ditagih)\b.*$/i,
    defaultQuery: 'hari ini',
  },
];

/**
 * Menentukan topik secara deterministik dari input bebas berdasarkan pola nomor SIMRS
 * (RM, RJ, INV, RSP, LAB/ORD) atau frasa perintah singkat, tetap menghormati izin role.
 */
export function detectIntent(rawQuery: string, allowedTopics: Topic[]): DetectedIntent {
  const q = rawQuery.trim();
  const has = (t: Topic) => allowedTopics.includes(t);

  if (/^INV[-A-Z0-9]*\d+$/i.test(q) && has('tagihan')) {
    return { topic: 'tagihan', query: q.toUpperCase() };
  }
  if (/^(?:RM|RJ)-?\d+$/i.test(q)) {
    if (has('pasien')) return { topic: 'pasien', query: q.toUpperCase() };
    if (has('tagihan')) return { topic: 'tagihan', query: q.toUpperCase() };
  }
  if (/^RSP[-A-Z0-9]*\d+$/i.test(q) && has('farmasi')) {
    return { topic: 'farmasi', query: q.toUpperCase() };
  }
  if (/^(?:LAB|ORD)[-A-Z0-9]*\d+$/i.test(q) && has('lab')) {
    return { topic: 'lab', query: q.toUpperCase() };
  }

  for (const rule of PREFIX_PATTERNS) {
    if (!has(rule.topic)) continue;
    const match = q.match(rule.regex);
    if (match) {
      const extracted = (match[1] ?? '').trim() || rule.defaultQuery || '';
      if (extracted) return { topic: rule.topic, query: extracted };
    }
  }

  return { topic: 'faq', query: q };
}

interface RouteContextRule {
  prefix: string;
  topics: Topic[];
  articleIds: string[];
}

const ROUTE_CONTEXT_RULES: RouteContextRule[] = [
  { prefix: '/transaction/billing', topics: ['tagihan', 'ringkasan', 'pasien'], articleIds: ['billing', 'pendaftaran', 'dashboard'] },
  { prefix: '/transaction/farmasi', topics: ['farmasi', 'obat', 'pasien'], articleIds: ['farmasi', 'obat', 'pemeriksaan'] },
  { prefix: '/transaction/laboratorium', topics: ['lab', 'pasien'], articleIds: ['laboratorium', 'pemeriksaan', 'riwayatMedis'] },
  { prefix: '/transaction/pemeriksaan', topics: ['pasien', 'obat', 'lab'], articleIds: ['pemeriksaan', 'riwayatMedis', 'farmasi', 'laboratorium'] },
  { prefix: '/transaction/riwayat-medis', topics: ['pasien'], articleIds: ['riwayatMedis', 'pemeriksaan', 'pasien'] },
  { prefix: '/transaction/pendaftaran', topics: ['pasien', 'jadwal'], articleIds: ['pendaftaran', 'pasien', 'jadwal', 'antrean'] },
  { prefix: '/transaction/antrean', topics: ['pasien', 'jadwal'], articleIds: ['antrean', 'displayAntrean', 'pendaftaran'] },
  { prefix: '/master/obat', topics: ['obat', 'farmasi'], articleIds: ['obat', 'farmasi'] },
  { prefix: '/master/jadwal-dokter', topics: ['jadwal'], articleIds: ['jadwal', 'pendaftaran'] },
  { prefix: '/master/pasien', topics: ['pasien'], articleIds: ['pasien', 'pendaftaran'] },
  { prefix: '/dashboard', topics: ['ringkasan', 'tagihan'], articleIds: ['dashboard', 'billing'] },
];

/** Mengurutkan topik yang diizinkan dengan menempatkan topik relevan halaman aktif di paling atas. */
export function prioritizeTopicsByPath(pathname: string, allowedTopics: Topic[]): Topic[] {
  const rule = ROUTE_CONTEXT_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return allowedTopics;
  const preferred = rule.topics.filter((t) => allowedTopics.includes(t));
  const rest = allowedTopics.filter((t) => !preferred.includes(t));
  return [...preferred, ...rest];
}

/** Mengembalikan daftar saran FAQ yang difilter izin role dan diprioritaskan sesuai halaman aktif. */
export function getSuggestedArticles(
  pathname: string,
  can: (menu: string) => boolean,
  limit = 6,
): KnowledgeArticle[] {
  const accessible = KNOWLEDGE_ARTICLES.filter((a) => a.menu === null || can(a.menu));
  const pool = accessible.length > 0 ? accessible : KNOWLEDGE_ARTICLES;
  const rule = ROUTE_CONTEXT_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return pool.slice(0, limit);

  const preferred = rule.articleIds
    .map((id) => pool.find((a) => a.id === id))
    .filter((a): a is KnowledgeArticle => Boolean(a));
  const rest = pool.filter((a) => !preferred.some((p) => p.id === a.id));
  return [...preferred, ...rest].slice(0, limit);
}

const HARI_MAP: Record<string, number> = {
  senin: 1,
  monday: 1,
  selasa: 2,
  tuesday: 2,
  rabu: 3,
  wednesday: 3,
  kamis: 4,
  thursday: 4,
  jumat: 5,
  friday: 5,
  sabtu: 6,
  saturday: 6,
  minggu: 7,
  sunday: 7,
};

/** Mengonversi input hari ("hari ini", "today", "senin".."minggu") menjadi kode ISO 1..7, atau null. */
export function parseHariQuery(query: string, now = new Date()): number | null {
  const norm = query.trim().toLowerCase();
  if (norm === '' || norm === 'hari ini' || norm === 'today' || norm === 'sekarang') {
    const d = now.getDay();
    return d === 0 ? 7 : d;
  }
  return HARI_MAP[norm] ?? null;
}

/**
 * Chatbot bantuan tanpa LLM: mendukung input bebas (auto-detect intent pola nomor SIMRS & perintah),
 * kategori berbasis izin role yang diprioritaskan sesuai halaman aktif, lookup data live dengan
 * tautan aksi langsung, riwayat terstruktur (reaktif terhadap ganti bahasa), dan penyimpanan per sesi.
 *
 * Dipakai di: AppLayout.tsx.
 */
import { Bot, ExternalLink, Send, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRupiah } from '@/lib/format';
import { loadChatSession, saveChatSession } from './chatbot.storage';
import type { ChatMessage, ChatMessagePayload } from './chatbot.types';
import {
  KNOWLEDGE_ARTICLES,
  detectIntent,
  getSuggestedArticles,
  prioritizeTopicsByPath,
  searchKnowledge,
  type KnowledgeArticle,
  type Topic,
} from './knowledge';
import {
  LOW_STOCK_THRESHOLD,
  lookupFarmasiData,
  lookupJadwalData,
  lookupLabData,
  lookupObatData,
  lookupPasienData,
  lookupRingkasanData,
  lookupTagihanData,
} from './lookups';

/** Topik yang tidak memerlukan minimal 3 karakter karena punya kata pendek / pencarian aktif. */
const SHORT_QUERY_TOPICS = new Set<Topic>(['jadwal', 'farmasi', 'lab', 'ringkasan', 'faq']);

export function ChatbotWidget() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return <ChatbotPanel key={userId ?? 'guest'} userId={userId} />;
}

function ChatbotPanel({ userId }: { userId: number | null }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const permissions = useAuthStore((s) => s.user?.permissions);
  const can = (menu: string) => permissions?.[menu]?.read ?? false;

  const allowedTopics = useMemo<Topic[]>(() => {
    const has = (menu: string) => permissions?.[menu]?.read ?? false;
    const list: Topic[] = [];
    if (has('master-pasien') || has('antrean')) list.push('pasien');
    if (has('billing')) list.push('tagihan');
    if (has('master-jadwal-dokter')) list.push('jadwal');
    if (has('master-obat')) list.push('obat');
    if (has('farmasi')) list.push('farmasi');
    if (has('laboratorium')) list.push('lab');
    if (has('dashboard') || has('billing')) list.push('ringkasan');
    list.push('faq');
    return list;
  }, [permissions]);

  const initialSession = useMemo(() => loadChatSession(userId), [userId]);

  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(() =>
    initialSession?.topic && allowedTopics.includes(initialSession.topic)
      ? initialSession.topic
      : null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialSession?.messages ?? []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const nextId = useRef(
    (initialSession?.messages ?? []).reduce((acc, m) => Math.max(acc, m.id), -1) + 1,
  );
  const requestSeq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const orderedTopics = useMemo(
    () => prioritizeTopicsByPath(pathname, allowedTopics),
    [pathname, allowedTopics],
  );

  const faqSuggestions = useMemo(
    () => getSuggestedArticles(pathname, (menu) => permissions?.[menu]?.read ?? false, 6),
    [pathname, permissions],
  );

  // Simpan perubahan percakapan ke sessionStorage per user.
  useEffect(() => {
    if (!userId) return;
    saveChatSession(userId, { topic, messages });
  }, [userId, topic, messages]);

  // Auto-scroll ke pesan terbaru.
  useEffect(() => {
    if (!open) return;
    const node = endRef.current;
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, busy, open]);

  // Auto-focus ke kotak input saat dialog dibuka atau topik dipilih.
  useEffect(() => {
    if (open && !busy) {
      inputRef.current?.focus();
    }
  }, [open, topic, busy]);

  // Shortcut keyboard: Escape tutup dialog, Alt+H buka/tutup dialog.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
      } else if (event.altKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const push = (from: ChatMessage['from'], payload: ChatMessagePayload) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, from, payload }]);
  };

  const kbText = (id: string) => ({
    title: t(`chatbot.kb.${id}.title`),
    keywords: t(`chatbot.kb.${id}.keywords`),
    answer: t(`chatbot.kb.${id}.answer`),
  });

  const runTopicLookup = async (targetTopic: Topic, q: string) => {
    if (targetTopic === 'faq') {
      const [best, ...related] = searchKnowledge(q, KNOWLEDGE_ARTICLES, kbText);
      if (best) {
        push('bot', {
          kind: 'article',
          articleId: best.id,
          relatedIds: related.map((a) => a.id),
        });
      } else {
        push('bot', { kind: 'i18n', key: 'chatbot.faqNoAnswer' });
      }
      return;
    }

    if (!SHORT_QUERY_TOPICS.has(targetTopic) && q.length < 3) {
      push('bot', { kind: 'i18n', key: 'chatbot.minLength' });
      return;
    }

    const seq = ++requestSeq.current;
    setBusy(true);
    try {
      let payload: ChatMessagePayload;
      switch (targetTopic) {
        case 'pasien':
          payload = await lookupPasienData(q, {
            canPasien: can('master-pasien'),
            canAntrean: can('antrean'),
          });
          break;
        case 'tagihan':
          payload = await lookupTagihanData(q);
          break;
        case 'jadwal':
          payload = await lookupJadwalData(q);
          break;
        case 'obat':
          payload = await lookupObatData(q);
          break;
        case 'farmasi':
          payload = await lookupFarmasiData(q);
          break;
        case 'lab':
          payload = await lookupLabData(q);
          break;
        case 'ringkasan':
          payload = await lookupRingkasanData({
            canDashboard: can('dashboard'),
            canBilling: can('billing'),
          });
          break;
      }
      if (requestSeq.current !== seq) return;
      push('bot', payload);
    } catch (error) {
      if (requestSeq.current !== seq) return;
      push('bot', {
        kind: 'error',
        text: errorMessage(error, t('chatbot.lookupFailed')),
      });
    } finally {
      if (requestSeq.current === seq) setBusy(false);
    }
  };

  const chooseTopic = (next: Topic) => {
    requestSeq.current += 1;
    setBusy(false);
    setTopic(next);
    setInput('');
    if (next === 'ringkasan') {
      setMessages([
        { id: nextId.current++, from: 'bot', payload: { kind: 'i18n', key: 'chatbot.prompt.ringkasan' } },
      ]);
      void runTopicLookup('ringkasan', 'hari ini');
      return;
    }
    setMessages([
      { id: nextId.current++, from: 'bot', payload: { kind: 'i18n', key: `chatbot.prompt.${next}` } },
    ]);
  };

  const backToMenu = () => {
    requestSeq.current += 1;
    setBusy(false);
    setTopic(null);
    setMessages([]);
    setInput('');
  };

  const triggerQuickQuery = (targetTopic: Topic, q: string, label?: string) => {
    if (busy) return;
    setTopic(targetTopic);
    push('user', { kind: 'text', text: label ?? q });
    void runTopicLookup(targetTopic, q);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const raw = input.trim();
    if (!raw || busy) return;
    setInput('');

    if (!topic) {
      const detected = detectIntent(raw, allowedTopics);
      setTopic(detected.topic);
      push('user', { kind: 'text', text: raw });
      await runTopicLookup(detected.topic, detected.query);
      return;
    }

    push('user', { kind: 'text', text: raw });
    await runTopicLookup(topic, raw);
  };

  const renderArticle = (articleId: string, relatedIds: string[]): ReactNode => {
    const article = KNOWLEDGE_ARTICLES.find((a) => a.id === articleId);
    if (!article) return null;
    const text = kbText(article.id);
    const canOpen = article.path && (article.menu === null || can(article.menu));
    const related = relatedIds
      .map((id) => KNOWLEDGE_ARTICLES.find((a) => a.id === id))
      .filter((a): a is KnowledgeArticle => Boolean(a));

    return (
      <div className="space-y-2">
        <p className="font-semibold">{text.title}</p>
        <p>{text.answer}</p>
        {canOpen && (
          <Link
            to={article.path!}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
          >
            {t('chatbot.openPage')}
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
        {related.length > 0 && (
          <div className="border-t pt-2">
            <p className="mb-1 text-xs text-muted-foreground">{t('chatbot.related')}</p>
            <div className="flex flex-wrap gap-1">
              {related.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    push('user', { kind: 'articleTitle', articleId: item.id });
                    push('bot', { kind: 'article', articleId: item.id, relatedIds: [] });
                  }}
                  className="rounded border bg-background px-2 py-0.5 text-xs hover:bg-accent"
                >
                  {t(`chatbot.kb.${item.id}.title`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPayload = (payload: ChatMessagePayload): ReactNode => {
    switch (payload.kind) {
      case 'text':
        return payload.text;
      case 'articleTitle':
        return t(`chatbot.kb.${payload.articleId}.title`);
      case 'i18n':
        return payload.params ? t(payload.key, payload.params) : t(payload.key);
      case 'error':
        return payload.text;
      case 'article':
        return renderArticle(payload.articleId, payload.relatedIds);

      case 'pasien':
        return (
          <div className="space-y-2">
            {payload.pasien.length > 0 && (
              <div>
                <p className="font-semibold">{t('chatbot.result.pasien')}</p>
                <ul className="space-y-1 pl-4 list-disc">
                  {payload.pasien.map((p) => (
                    <li key={p.id}>
                      <span>
                        {p.no_rm} - {p.nama} ({p.jenis_kelamin}, {p.tgl_lahir})
                      </span>
                      {can('billing') && (
                        <button
                          type="button"
                          onClick={() =>
                            triggerQuickQuery(
                              'tagihan',
                              p.no_rm,
                              t('chatbot.action.checkBillFor', { code: p.no_rm }),
                            )
                          }
                          className="ml-1.5 inline-flex items-center text-xs font-medium text-primary underline underline-offset-2"
                        >
                          {t('chatbot.action.checkBill')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {payload.kunjungan.length > 0 && (
              <div>
                <p className="font-semibold">{t('chatbot.result.kunjungan')}</p>
                <ul className="space-y-1 pl-4 list-disc">
                  {payload.kunjungan.map((k) => (
                    <li key={k.id}>
                      <span>
                        {k.no_kunjungan} | {k.tgl_kunjungan} | {k.pasien_nama ?? '-'} |{' '}
                        {k.poli_nama ?? '-'} |{' '}
                        {t('chatbot.result.antreanNo', { no: k.no_antrean })} |{' '}
                        {t(`transaction.antrean.status.${k.status}`)}
                      </span>
                      {can('pemeriksaan') && (
                        <Link
                          to={`/transaction/pemeriksaan/${k.id}`}
                          onClick={() => setOpen(false)}
                          className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary underline underline-offset-2"
                        >
                          {t('chatbot.action.openExam')}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {payload.partialErrors.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('chatbot.partialWarning')}
              </p>
            )}
          </div>
        );

      case 'tagihan':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{t('chatbot.result.tagihan')}</p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.items.map((inv) => (
                <li key={inv.id}>
                  <span>
                    {inv.no_invoice} | {inv.no_kunjungan ?? '-'} | {inv.pasien_nama ?? '-'} |{' '}
                    {t('chatbot.result.total', { total: formatRupiah(inv.total) })} |{' '}
                    {t('chatbot.result.sisa', { sisa: formatRupiah(inv.sisa_tagihan) })} |{' '}
                    {t(`transaction.billing.statusLabel.${inv.status}`)}
                  </span>
                  <Link
                    to={`/transaction/billing/invoice/${inv.id}/cetak`}
                    onClick={() => setOpen(false)}
                    className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary underline underline-offset-2"
                  >
                    {t('chatbot.action.viewInvoice')}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'jadwal':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{t('chatbot.result.jadwal')}</p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.items.map((j) => (
                <li key={j.id}>
                  {j.hari_nama ?? j.hari} ({j.jam_mulai.slice(0, 5)}-{j.jam_selesai.slice(0, 5)}) |{' '}
                  {j.dokter_nama ?? '-'} | {j.poli_nama ?? '-'} |{' '}
                  {t('chatbot.result.quota', { count: j.kuota })}
                </li>
              ))}
            </ul>
            <Link
              to="/master/jadwal-dokter"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              {t('chatbot.openPage')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        );

      case 'obat':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{t('chatbot.result.obat')}</p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.items.map((o) => (
                <li key={o.id}>
                  {o.kode} - {o.nama} | {formatRupiah(o.harga)}/{o.satuan} |{' '}
                  {t('chatbot.result.stock', { count: o.stok })}
                  {o.stok === 0 && (
                    <span className="ml-1 font-semibold text-destructive">
                      ({t('chatbot.result.stockEmpty')})
                    </span>
                  )}
                  {o.stok > 0 && o.stok <= LOW_STOCK_THRESHOLD && (
                    <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                      ({t('chatbot.result.stockLow')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              to="/master/obat"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              {t('chatbot.openPage')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        );

      case 'farmasi':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{t('chatbot.result.farmasi')}</p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.items.map((r) => (
                <li key={r.id}>
                  {r.no_resep} | {r.pasien_nama ?? '-'} ({r.pasien_no_rm ?? '-'}) |{' '}
                  {r.poli_nama ?? '-'} | {t('chatbot.result.itemCount', { count: r.item_count })} |{' '}
                  {t(`transaction.resep.status.${r.status}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/transaction/farmasi"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              {t('chatbot.openPage')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        );

      case 'lab':
        return (
          <div className="space-y-2">
            <p className="font-semibold">{t('chatbot.result.lab')}</p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.items.map((o) => (
                <li key={o.id}>
                  {o.no_order} | {o.pasien_nama ?? '-'} ({o.pasien_no_rm ?? '-'}) |{' '}
                  {o.poli_nama ?? '-'} | {t('chatbot.result.itemCount', { count: o.item_count })} |{' '}
                  {t(`transaction.lab.status.${o.status}`)}
                </li>
              ))}
            </ul>
            <Link
              to="/transaction/laboratorium"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
            >
              {t('chatbot.openPage')}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        );

      case 'ringkasan':
        return (
          <div className="space-y-2">
            <p className="font-semibold">
              {t('chatbot.result.ringkasan', { date: payload.tanggal })}
            </p>
            <ul className="space-y-1 pl-4 list-disc">
              {payload.summary && (
                <>
                  <li>
                    {t('chatbot.result.visitCount', { count: payload.summary.total_kunjungan })}
                  </li>
                  <li>
                    {t('chatbot.result.actionCount', { count: payload.summary.total_tindakan })}
                  </li>
                  {payload.summary.total_pendapatan !== null && (
                    <li>
                      {t('chatbot.result.revenue', {
                        total: formatRupiah(payload.summary.total_pendapatan),
                      })}
                    </li>
                  )}
                  {payload.summary.invoice_per_status && (
                    <li>
                      {t('chatbot.result.invoiceStatus', {
                        unpaid: payload.summary.invoice_per_status.belum_dibayar,
                        partial: payload.summary.invoice_per_status.dibayar_sebagian,
                        paid: payload.summary.invoice_per_status.lunas,
                      })}
                    </li>
                  )}
                </>
              )}
              {payload.belumTagihCount !== null && (
                <li>{t('chatbot.result.unbilledCount', { count: payload.belumTagihCount })}</li>
              )}
            </ul>
            {payload.partialErrors.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('chatbot.partialWarning')}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {can('dashboard') && (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                >
                  {t('chatbot.action.openDashboard')}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {can('billing') && (
                <Link
                  to="/transaction/billing"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                >
                  {t('chatbot.action.openBilling')}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        );
    }
  };

  const quickChips: Array<{ label: string; query: string }> =
    topic === 'jadwal'
      ? [{ label: t('chatbot.quick.todaySchedule'), query: 'hari ini' }]
      : topic === 'farmasi'
        ? [{ label: t('chatbot.quick.activePharmacy'), query: 'aktif' }]
        : topic === 'lab'
          ? [{ label: t('chatbot.quick.activeLab'), query: 'aktif' }]
          : topic === 'ringkasan'
            ? [{ label: t('chatbot.quick.refreshSummary'), query: 'hari ini' }]
            : [];

  const inputPlaceholder = topic
    ? t(`chatbot.placeholder.${topic}`)
    : t('chatbot.placeholder.direct');

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label={t('chatbot.title')}
          className="mb-3 flex h-[520px] max-h-[75vh] w-[min(calc(100vw-2rem),390px)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold leading-none">{t('chatbot.title')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('chatbot.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {topic && (
                <Button type="button" variant="ghost" size="sm" onClick={backToMenu}>
                  {t('chatbot.backToMenu')}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={t('common.close')}
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm" aria-live="polite">
            {!topic ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">{t('chatbot.chooseTopic')}</p>
                {orderedTopics.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                    onClick={() => chooseTopic(item)}
                  >
                    {t(`chatbot.topic.${item}`)}
                  </Button>
                ))}
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={msg.from === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={
                        msg.from === 'user'
                          ? 'max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
                          : 'max-w-[90%] rounded-lg bg-muted px-3 py-2'
                      }
                    >
                      {renderPayload(msg.payload)}
                    </div>
                  </div>
                ))}
                {topic === 'faq' && messages.length <= 2 && (
                  <div className="flex flex-wrap gap-1">
                    {faqSuggestions.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-1 text-xs"
                        onClick={() => {
                          push('user', { kind: 'articleTitle', articleId: item.id });
                          push('bot', { kind: 'article', articleId: item.id, relatedIds: [] });
                        }}
                      >
                        {t(`chatbot.kb.${item.id}.title`)}
                      </Button>
                    ))}
                  </div>
                )}
                {quickChips.length > 0 && !busy && (
                  <div className="flex flex-wrap gap-1">
                    {quickChips.map((chip) => (
                      <Button
                        key={chip.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-1 text-xs"
                        onClick={() => triggerQuickQuery(topic, chip.query, chip.label)}
                      >
                        {chip.label}
                      </Button>
                    ))}
                  </div>
                )}
                {busy && <p className="text-xs text-muted-foreground">{t('chatbot.searching')}</p>}
                <div ref={endRef} />
              </>
            )}
          </div>

          <form className="flex gap-2 border-t p-3" onSubmit={handleSubmit}>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              aria-label={inputPlaceholder}
              maxLength={200}
              disabled={busy}
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !input.trim()}
              aria-label={t('chatbot.send')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-12 rounded-full px-4 shadow-lg"
          aria-label={t('chatbot.button')}
          title={`${t('chatbot.button')} (Alt+H)`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <Bot className="h-5 w-5" />
          <span className="text-xs font-medium">{t('chatbot.button')}</span>
        </Button>
      </div>
    </div>
  );
}

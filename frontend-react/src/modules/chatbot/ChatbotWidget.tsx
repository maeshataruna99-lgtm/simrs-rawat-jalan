/**
 * Chatbot bantuan berbasis menu tanpa LLM: user memilih kategori, mengisi input yang diminta,
 * lalu jawaban diambil dari API project (lookup pasien/tagihan) atau basis pengetahuan lokal.
 * Kategori lookup hanya tampil bila role punya izin baca menu terkait.
 *
 * Dipakai di: components/layout/AppLayout.tsx.
 */
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Bot, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { errorMessage } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { formatRupiah } from '@/lib/format';
import { listPasien } from '@/modules/master/pasien/pasien.api';
import { listInvoice } from '@/modules/transaction/pembayaran/pembayaran.api';
import { listAntrean } from '@/modules/transaction/pendaftaran/pendaftaran.api';
import { KNOWLEDGE_ARTICLES, searchKnowledge, type KnowledgeArticle } from './knowledge';

type Topic = 'pasien' | 'tagihan' | 'faq';

interface ChatMessage {
  id: number;
  from: 'bot' | 'user';
  body: ReactNode;
}

const MAX_ROWS = 5;

export function ChatbotWidget() {
  const { t } = useTranslation();
  const can = useAuthStore((s) => s.can);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const nextId = useRef(0);

  const topics: Topic[] = [
    ...(can('master-pasien') || can('antrean') ? (['pasien'] as const) : []),
    ...(can('billing') ? (['tagihan'] as const) : []),
    'faq',
  ];

  const push = (from: ChatMessage['from'], body: ReactNode) =>
    setMessages((prev) => [...prev, { id: nextId.current++, from, body }]);

  const chooseTopic = (next: Topic) => {
    setTopic(next);
    push('user', t(`chatbot.topic.${next}`));
    push('bot', t(`chatbot.prompt.${next}`));
  };

  const backToMenu = () => {
    setTopic(null);
    setMessages([]);
    setInput('');
  };

  const kbText = (id: string) => ({
    title: t(`chatbot.kb.${id}.title`),
    keywords: t(`chatbot.kb.${id}.keywords`),
    answer: t(`chatbot.kb.${id}.answer`),
  });

  const showArticle = (article: KnowledgeArticle, related: KnowledgeArticle[] = []) => {
    const canOpen = article.path && (article.menu === null || can(article.menu));
    push(
      'bot',
      <div className="space-y-2">
        <p className="font-semibold">{t(`chatbot.kb.${article.id}.title`)}</p>
        <p className="whitespace-pre-line">{t(`chatbot.kb.${article.id}.answer`)}</p>
        {canOpen && (
          <Link
            to={article.path!}
            className="inline-block text-xs font-medium text-primary underline"
            onClick={() => setOpen(false)}
          >
            {t('chatbot.openPage')}
          </Link>
        )}
        {related.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            <p className="text-xs text-muted-foreground">{t('chatbot.related')}</p>
            <div className="flex flex-wrap gap-1">
              {related.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto py-1 text-xs"
                  onClick={() => {
                    push('user', t(`chatbot.kb.${item.id}.title`));
                    showArticle(item);
                  }}
                >
                  {t(`chatbot.kb.${item.id}.title`)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>,
    );
  };

  const lookupPasien = async (q: string): Promise<ReactNode> => {
    const [pasien, kunjungan] = await Promise.all([
      can('master-pasien') ? listPasien({ q, per_page: MAX_ROWS }).then((r) => r.items) : null,
      can('antrean') ? listAntrean({ q }).then((rows) => rows.slice(0, MAX_ROWS)) : null,
    ]);
    if (!pasien?.length && !kunjungan?.length) return t('chatbot.notFound', { q });

    return (
      <div className="space-y-2">
        {pasien && pasien.length > 0 && (
          <div>
            <p className="font-semibold">{t('chatbot.result.pasien')}</p>
            <ul className="list-disc pl-4">
              {pasien.map((p) => (
                <li key={p.id}>
                  {p.no_rm} - {p.nama} ({p.jenis_kelamin}, {p.tgl_lahir})
                </li>
              ))}
            </ul>
          </div>
        )}
        {kunjungan && kunjungan.length > 0 && (
          <div>
            <p className="font-semibold">{t('chatbot.result.kunjungan')}</p>
            <ul className="list-disc pl-4">
              {kunjungan.map((k) => (
                <li key={k.id}>
                  {k.no_kunjungan} | {k.tgl_kunjungan} | {k.pasien?.nama ?? '-'} |{' '}
                  {k.poli?.nama ?? '-'} | {t('chatbot.result.antreanNo', { no: k.no_antrean })} |{' '}
                  {t(`transaction.antrean.status.${k.status}`)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const lookupTagihan = async (q: string): Promise<ReactNode> => {
    const { items } = await listInvoice({ q, per_page: MAX_ROWS });
    if (!items.length) return t('chatbot.notFound', { q });

    return (
      <div>
        <p className="font-semibold">{t('chatbot.result.tagihan')}</p>
        <ul className="list-disc pl-4">
          {items.map((inv) => (
            <li key={inv.id}>
              {inv.no_invoice} | {inv.kunjungan?.no_kunjungan ?? '-'} | {inv.pasien?.nama ?? '-'} |{' '}
              {t('chatbot.result.total', { total: formatRupiah(inv.total) })} |{' '}
              {t('chatbot.result.sisa', { sisa: formatRupiah(inv.sisa_tagihan) })} |{' '}
              {t(`transaction.billing.statusLabel.${inv.status}`)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const q = input.trim();
    if (!topic || !q || busy) return;
    setInput('');
    push('user', q);

    if (topic === 'faq') {
      const [best, ...related] = searchKnowledge(q, KNOWLEDGE_ARTICLES, kbText);
      if (best) showArticle(best, related);
      else push('bot', t('chatbot.faqNoAnswer'));
      return;
    }

    if (q.length < 3) {
      push('bot', t('chatbot.minLength'));
      return;
    }

    setBusy(true);
    try {
      push('bot', await (topic === 'pasien' ? lookupPasien(q) : lookupTagihan(q)));
    } catch (error) {
      push('bot', errorMessage(error, t('chatbot.lookupFailed')));
    } finally {
      setBusy(false);
    }
  };

  const faqSuggestions = KNOWLEDGE_ARTICLES.slice(0, 6);

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label={t('chatbot.title')}
          className="mb-3 flex h-[500px] max-h-[75vh] w-[min(calc(100vw-2rem),380px)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl"
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={backToMenu}
                >
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
                {topics.map((item) => (
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
                      {msg.body}
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
                          push('user', t(`chatbot.kb.${item.id}.title`));
                          showArticle(item);
                        }}
                      >
                        {t(`chatbot.kb.${item.id}.title`)}
                      </Button>
                    ))}
                  </div>
                )}
                {busy && <p className="text-xs text-muted-foreground">{t('chatbot.searching')}</p>}
              </>
            )}
          </div>

          {topic && (
            <form className="flex gap-2 border-t p-3" onSubmit={handleSubmit}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t(`chatbot.placeholder.${topic}`)}
                aria-label={t(`chatbot.placeholder.${topic}`)}
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
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          className="h-12 rounded-full px-4 shadow-lg"
          aria-label={t('chatbot.button')}
          title={t('chatbot.button')}
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

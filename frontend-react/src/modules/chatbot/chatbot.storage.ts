/**
 * Penyimpanan riwayat percakapan chatbot di sessionStorage per user agar percakapan
 * bertahan saat berpindah halaman atau refresh tab, dan dibersihkan saat logout.
 *
 * Dipakai di: ChatbotWidget.tsx, auth-store.ts.
 */
import type { StoredChatSession } from './chatbot.types';

const STORAGE_PREFIX = 'simrs.chatbot.v1.';
const MAX_STORED_MESSAGES = 30;

function keyFor(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadChatSession(userId: number | null | undefined): StoredChatSession | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChatSession;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return {
      topic: parsed.topic ?? null,
      messages: parsed.messages.slice(-MAX_STORED_MESSAGES),
    };
  } catch {
    return null;
  }
}

export function saveChatSession(
  userId: number | null | undefined,
  session: StoredChatSession,
): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const trimmed: StoredChatSession = {
      topic: session.topic,
      messages: session.messages.slice(-MAX_STORED_MESSAGES),
    };
    window.sessionStorage.setItem(keyFor(userId), JSON.stringify(trimmed));
  } catch {
    // Abaikan kegagalan quota atau mode private browsing.
  }
}

export function clearAllChatSessions(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) window.sessionStorage.removeItem(k);
  } catch {
    // Abaikan bila sessionStorage tidak tersedia.
  }
}

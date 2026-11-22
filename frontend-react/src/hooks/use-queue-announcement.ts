/**
 * Hook pengumuman suara nomor antrean memakai rekaman per kata/huruf di public/audio/VoiceA.
 * Browser memblokir audio sebelum ada interaksi pengguna, jadi enableAudio() harus dipanggil dari klik.
 *
 * Dipakai di: modules/transaction/antrean/DisplayAntreanPage.tsx.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const VOICE_BANK = '/audio/VoiceA';
const NUMBER_FILES: Record<string, string> = {
  '0': 'Nol',
  '1': 'satu',
  '2': 'dua',
  '3': 'tiga',
  '4': 'empat',
  '5': 'lima',
  '6': 'enam',
  '7': 'tujuh',
  '8': 'delapan',
  '9': 'sembilan',
};

function audioUrl(fileName: string) {
  return `${VOICE_BANK}/${encodeURIComponent(fileName)}.wav`;
}

/** Urutan file suara untuk satu nomor antrean, mis. "UMU-001" -> Nomor-Antrian U M U Nol Nol satu. */
export function getAnnouncementFiles(kodeAntrean: string): string[] {
  const files = ['Nomor-Antrian'];
  for (const character of kodeAntrean.trim().toUpperCase()) {
    if (NUMBER_FILES[character]) files.push(NUMBER_FILES[character]);
    else if (/^[A-Z]$/.test(character)) files.push(character);
  }
  return files;
}

export function useQueueAnnouncement() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const sequenceId = useRef(0);

  const stop = useCallback(() => {
    sequenceId.current += 1;
    currentAudio.current?.pause();
    currentAudio.current = null;
  }, []);

  const enableAudio = useCallback(async () => {
    stop();
    const audio = new Audio(audioUrl('dingdong'));
    currentAudio.current = audio;
    try {
      await audio.play();
      setAudioEnabled(true);
      return true;
    } catch {
      setAudioEnabled(false);
      currentAudio.current = null;
      return false;
    }
  }, [stop]);

  const announce = useCallback(
    async (kodeAntrean: string) => {
      if (!audioEnabled || !kodeAntrean.trim()) return;
      stop();
      const runId = sequenceId.current;
      for (const fileName of getAnnouncementFiles(kodeAntrean)) {
        if (runId !== sequenceId.current) return;
        await new Promise<void>((resolve) => {
          const audio = new Audio(audioUrl(fileName));
          currentAudio.current = audio;
          audio.addEventListener('ended', () => resolve(), { once: true });
          audio.addEventListener('error', () => resolve(), { once: true });
          void audio.play().catch(() => resolve());
        });
      }
      if (runId === sequenceId.current) currentAudio.current = null;
    },
    [audioEnabled, stop],
  );

  useEffect(() => stop, [stop]);

  return { announce, audioEnabled, enableAudio, stop };
}

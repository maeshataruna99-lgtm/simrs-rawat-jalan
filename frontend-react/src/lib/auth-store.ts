/**
 * State sesi login: token, profil user, pohon menu, dan izin.
 * Token disimpan di localStorage (token-storage.ts) agar sesi bertahan saat halaman dimuat ulang;
 * profil diambil ulang dari /system/auth/me saat aplikasi dibuka.
 *
 * Dipakai di: LoginPage, RequireAuth, PermissionGuard, usePermission, layout (poin 1.12).
 */
import axios from 'axios';
import { create } from 'zustand';
import { clearAllChatSessions } from '@/modules/chatbot/chatbot.storage';
import * as authApi from '@/modules/system/auth/auth.api';
import type { PermissionAction, UserProfile } from '@/modules/system/auth/auth.types';
import { setUnauthorizedHandler } from './api-client';
import { tokenStorage } from './token-storage';

type AuthStatus = 'checking' | 'authenticated' | 'guest';

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  /** Menahan penyimpanan lokasi asal saat logout agar user berikutnya tidak diarahkan ke route sesi sebelumnya. */
  suppressRedirect: boolean;
  /** Login lalu simpan token dan profil. Error dari API diteruskan ke pemanggil. */
  login: (username: string, password: string) => Promise<void>;
  /** Memuat profil dari token tersimpan; tanpa token atau token tidak sah menjadi guest. */
  restoreSession: () => Promise<void>;
  logout: () => void;
  /** Apakah user boleh melakukan aksi pada menu, contoh can('master-pasien', 'create'). */
  can: (menu: string, action?: PermissionAction) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: tokenStorage.get() ? 'checking' : 'guest',
  user: null,
  suppressRedirect: false,

  login: async (username, password) => {
    const result = await authApi.login(username, password);
    tokenStorage.set(result.token);
    set({ status: 'authenticated', user: result.user, suppressRedirect: false });
  },

  restoreSession: async () => {
    if (!tokenStorage.get()) {
      set({ status: 'guest', user: null });
      return;
    }
    try {
      set({ status: 'authenticated', user: await authApi.fetchProfile(), suppressRedirect: false });
    } catch (err) {
      // Token hanya dibuang bila server menolaknya (401); timeout/jaringan lambat tidak boleh membuat user ter-logout.
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        tokenStorage.clear();
      }
      set({ status: 'guest', user: null });
    }
  },

  logout: () => {
    tokenStorage.clear();
    clearAllChatSessions();
    set({ status: 'guest', user: null, suppressRedirect: true });
  },

  can: (menu, action = 'read') => get().user?.permissions[menu]?.[action] ?? false,
}));

// Token kedaluwarsa atau dicabut di tengah sesi: kembalikan user ke halaman login.
setUnauthorizedHandler(() => useAuthStore.getState().logout());

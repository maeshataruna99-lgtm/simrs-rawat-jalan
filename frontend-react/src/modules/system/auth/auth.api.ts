/**
 * Pemanggilan endpoint autentikasi backend Yii.
 *
 * Dipakai di: lib/auth-store.ts.
 */
import { yiiApi, type ApiResponse } from '@/lib/api-client';
import type { LoginResult, UserProfile } from './auth.types';

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data } = await yiiApi.post<ApiResponse<LoginResult>>('/system/auth/login', {
    username,
    password,
  });
  return data.data;
}

export async function fetchProfile(): Promise<UserProfile> {
  const { data } = await yiiApi.get<ApiResponse<UserProfile>>('/system/auth/me');
  return data.data;
}

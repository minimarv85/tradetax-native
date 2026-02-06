// Secure Auth Utilities for TradeTax

import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

// Keys for secure storage
const REFRESH_TOKEN_KEY = 'refreshToken';
const REMEMBER_ME_KEY = 'rememberMe';

/**
 * Store session securely (banking-grade encryption)
 */
export async function storeSession(session) {
  if (session?.refresh_token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
  }
  await SecureStore.setItemAsync(REMEMBER_ME_KEY, 'true');
}

/**
 * Clear all secure session data
 * Call this on logout
 */
export async function clearSession() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REMEMBER_ME_KEY);
  await supabase.auth.signOut();
}

/**
 * Check if Remember Me is enabled
 */
export async function isRememberMeEnabled() {
  const value = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
  return value === 'true';
}

/**
 * Get stored refresh token
 */
export async function getRefreshToken() {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Attempt to restore session from stored token
 */
export async function restoreSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    // Token invalid - clear it
    await clearSession();
    return null;
  }

  return data.session;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return true;
  
  // Try restoring from refresh token
  const restored = await restoreSession();
  return restored !== null;
}

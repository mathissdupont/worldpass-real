/**
 * Secure storage utilities using expo-secure-store
 * Provides encrypted storage for sensitive data like tokens
 */

import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, SESSION_KEY } from '../constants/config';

/**
 * Store authentication token securely
 */
export async function setToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error storing token:', error);
    throw error;
  }
}

/**
 * Retrieve authentication token
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
}

/**
 * Remove authentication token
 */
export async function removeToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
  }
}

/**
 * Store session data
 */
export async function setSession(session: { email: string; at: number }): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error storing session:', error);
    throw error;
  }
}

/**
 * Retrieve session data
 */
export async function getSession(): Promise<{ email: string; at: number } | null> {
  try {
    const sessionStr = await SecureStore.getItemAsync(SESSION_KEY);
    return sessionStr ? JSON.parse(sessionStr) : null;
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Remove session data
 */
export async function removeSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (error) {
    console.error('Error removing session:', error);
  }
}

/**
 * Clear all stored authentication data
 */
export async function clearAuth(): Promise<void> {
  await Promise.all([
    removeToken(),
    removeSession(),
  ]);
}

/**
 * Check if user is authenticated (has valid session)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  const session = await getSession();
  return !!(token && session?.email);
}

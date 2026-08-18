import * as SecureStore from 'expo-secure-store';

const ADMIN_PASSWORD_KEY = 'card-clash.content-admin.password';

export async function hasContentAdminPassword(): Promise<boolean> {
  return Boolean(await SecureStore.getItemAsync(ADMIN_PASSWORD_KEY));
}

export async function setContentAdminPassword(password: string): Promise<void> {
  const normalized = password.trim();
  if (normalized.length < 6) {
    throw new Error('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل.');
  }
  await SecureStore.setItemAsync(ADMIN_PASSWORD_KEY, normalized, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function verifyContentAdminPassword(password: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(ADMIN_PASSWORD_KEY);
  return Boolean(stored && password === stored);
}

export async function clearContentAdminPassword(): Promise<void> {
  await SecureStore.deleteItemAsync(ADMIN_PASSWORD_KEY);
}

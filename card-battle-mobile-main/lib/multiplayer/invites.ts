export const INVITE_CODE_MIN_LENGTH = 4;
export const INVITE_CODE_MAX_LENGTH = 8;
export const INVITE_CODE_PATTERN = /^[A-Z0-9]{4,8}$/;

/** يوحّد رمز الدعوة قبل عرضه أو إرساله إلى الخادم. */
export function normalizeInviteCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, INVITE_CODE_MAX_LENGTH);
}

export function isValidInviteCode(value: string): boolean {
  return INVITE_CODE_PATTERN.test(value);
}

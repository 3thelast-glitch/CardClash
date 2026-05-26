import { cardImageRegistry } from './cardImageRegistry';

export const getCardImage = (cardId: string, fallbackUrl?: string) => {
  // 1. البحث عن الصورة محلياً في ملف الريجستري
  const localImage = cardImageRegistry[cardId];

  if (localImage) {
    return localImage; // إرجاع الصورة المحلية إذا وجدت
  }

  // 2. إذا لم توجد صورة محلية، استخدم الرابط الخارجي
  if (fallbackUrl) {
    return { uri: fallbackUrl };
  }

  // 3. في حال عدم وجود أي صورة (احتياطي)
  return null;
};
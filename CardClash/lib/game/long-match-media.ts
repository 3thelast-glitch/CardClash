/**
 * شبكة ترتيب الجولات تعرض عدداً كبيراً من الكروت دفعة واحدة. بدء مشغل فيديو
 * لكل كرت في مباراة طويلة يستهلك ذاكرة وفك ترميز أكثر مما تحتمله بعض أجهزة Android.
 */
export const STATIC_MEDIA_ROUND_THRESHOLD = 12;
export const STATIC_MEDIA_VIDEO_CARD_THRESHOLD = 2;

/**
 * يكتفي عرض الشبكة بصورة/خلفية ثابتة في المباراة الطويلة أو عندما تحتوي الشبكة
 * على أكثر من كرت فيديو. تبقى وسائط الفيديو متاحة في معاينة الكرت المفردة وفي
 * ساحة المعركة التي تعرض كرتين فقط.
 */
export function shouldUseStaticCardMedia(totalRounds: number, videoCardCount = 0): boolean {
  if (!Number.isFinite(totalRounds) || Math.trunc(totalRounds) < 0) return false;
  if (Math.trunc(totalRounds) >= STATIC_MEDIA_ROUND_THRESHOLD) return true;
  return Number.isFinite(videoCardCount) && Math.trunc(videoCardCount) >= STATIC_MEDIA_VIDEO_CARD_THRESHOLD;
}

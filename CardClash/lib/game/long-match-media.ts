/**
 * شبكة ترتيب الجولات تعرض عدداً كبيراً من الكروت دفعة واحدة. بدء مشغل فيديو
 * لكل كرت في مباراة طويلة يستهلك ذاكرة وفك ترميز أكثر مما تحتمله بعض أجهزة Android.
 */
export const STATIC_MEDIA_ROUND_THRESHOLD = 12;

/**
 * يكتفي عرض الشبكة بصورة/خلفية ثابتة في المباراة الطويلة. تبقى وسائط الفيديو
 * متاحة في معاينة الكرت المفردة وفي ساحة المعركة التي تعرض كرتين فقط.
 */
export function shouldUseStaticCardMedia(totalRounds: number): boolean {
  return Number.isFinite(totalRounds) && Math.trunc(totalRounds) >= STATIC_MEDIA_ROUND_THRESHOLD;
}

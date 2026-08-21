import { describe, expect, it } from 'vitest';
import { STATIC_MEDIA_ROUND_THRESHOLD, shouldUseStaticCardMedia } from '../long-match-media';

describe('long-match media safety', () => {
  it('uses static card media for a twenty-round match to avoid concurrent video players', () => {
    expect(shouldUseStaticCardMedia(20)).toBe(true);
  });

  it('keeps animated media available below the long-match threshold', () => {
    expect(shouldUseStaticCardMedia(STATIC_MEDIA_ROUND_THRESHOLD - 1)).toBe(false);
  });

  it('does not enable the safety mode for invalid round values', () => {
    expect(shouldUseStaticCardMedia(Number.NaN)).toBe(false);
    expect(shouldUseStaticCardMedia(-1)).toBe(false);
  });
});

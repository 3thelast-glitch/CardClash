import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardComponentPath = resolve(process.cwd(), 'components/game/luxury-character-card-animated.tsx');

describe('Android card media renderer', () => {
  it('uses the current Expo video renderer configured for overlapping card views', () => {
    const source = readFileSync(cardComponentPath, 'utf8');

    expect(source).toContain("from 'expo-video'");
    expect(source).toContain('useVideoPlayer(source');
    expect(source).toContain('surfaceType="textureView"');
    expect(source).toContain('useExoShutter={false}');
  });

  it('keeps a visible loading layer until Android renders the first video frame', () => {
    const source = readFileSync(cardComponentPath, 'utf8');

    expect(source).toContain('onFirstFrameRender={() => setHasRenderedFirstFrame(true)}');
    expect(source).toContain('testID="card-video-loading"');
  });
});

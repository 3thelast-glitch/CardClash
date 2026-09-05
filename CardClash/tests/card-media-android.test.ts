import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const cardComponentPath = resolve(process.cwd(), 'components/cards/CardArtwork.tsx');

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

  it('does not add an extra unmount cleanup that touches a released video player', () => {
    const source = readFileSync(cardComponentPath, 'utf8');

    expect(source).not.toContain('player.volume = 0;\n      player.pause();');
    expect(source).toContain('if (active) player.play();');
    expect(source).toContain('else player.pause();');
  });
});

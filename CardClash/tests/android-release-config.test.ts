import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appConfigPath = resolve(process.cwd(), 'app.config.js');

describe('Android release configuration', () => {
  it('uses a newer Android build code for the released video-player crash fix', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("version: '1.0.4'");
    expect(source).toContain('versionCode: 20');
  });

  it('does not keep Card Clash video resources alive in the background or PiP', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]");
  });
});

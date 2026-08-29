import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appConfigPath = resolve(process.cwd(), 'app.config.js');

describe('Android release configuration', () => {
  it('uses the expected app version and Android build code for the release', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("version: '1.0.8'");
    expect(source).toContain('versionCode: 24');
  });

  it('does not keep Card Clash video resources alive in the background or PiP', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]");
  });
});

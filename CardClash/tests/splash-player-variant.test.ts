import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDeveloperBuild } from '../lib/build-variant';

const splashSource = () => readFileSync(resolve(process.cwd(), 'app/screens/splash.tsx'), 'utf8');

describe('Player home screen menu', () => {
  it('recognizes the developer and player build variants used by the home menu', () => {
    expect(isDeveloperBuild({ buildVariant: 'developer' })).toBe(true);
    expect(isDeveloperBuild({ buildVariant: 'player' })).toBe(false);
  });

  it('renders the collection navigation button only for developer builds', () => {
    const splash = splashSource();
    expect(splash).toContain('const isDeveloper = isDeveloperBuild(Constants.expoConfig?.extra);');
    expect(splash).toContain('{isDeveloper && <NavBtn icon="🃏" label="المجموعة"');
    expect(splash).toContain("router.push('/screens/cards-gallery'");
  });
});

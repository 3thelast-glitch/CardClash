import { GITHUB_RELEASES_LATEST_URL, isVersionNewer, resolvePlayerApk, toAppUpdate, type GithubRelease } from '../lib/releases/github-update';

const release: GithubRelease = {
  tag_name: 'v1.2.0',
  html_url: 'https://github.com/3thelast-glitch/CardClash/releases/tag/v1.2.0',
  assets: [
    { name: 'Card-Clash-Dev-v1.2.0.apk', browser_download_url: 'https://example.test/dev.apk' },
    { name: 'Card-Clash-v1.2.0.apk', browser_download_url: 'https://example.test/player.apk' },
  ],
};

describe('GitHub Releases update resolver', () => {
  it('uses the renamed CardClash repository for release checks', () => {
    expect(GITHUB_RELEASES_LATEST_URL).toBe('https://api.github.com/repos/3thelast-glitch/CardClash/releases/latest');
  });

  it('recognises a newer semantic version with or without v prefix', () => {
    expect(isVersionNewer('v1.2.0', '1.1.9')).toBe(true);
    expect(isVersionNewer('1.0.1', 'v1.0.0')).toBe(true);
  });

  it('does not offer equal or lower releases', () => {
    expect(isVersionNewer('v1.2.0', '1.2.0')).toBe(false);
    expect(isVersionNewer('v1.1.9', '1.2.0')).toBe(false);
  });

  it('selects the player APK rather than the developer build', () => {
    expect(resolvePlayerApk(release)?.name).toBe('Card-Clash-v1.2.0.apk');
  });

  it('creates a download update only for a newer tagged release with an APK', () => {
    expect(toAppUpdate(release, '1.1.0')).toEqual({
      version: '1.2.0',
      downloadUrl: 'https://example.test/player.apk',
      releaseUrl: release.html_url,
    });
    expect(toAppUpdate(release, '1.2.0')).toBeNull();
  });

  it('does not create an update when no player APK is published', () => {
    expect(toAppUpdate({ ...release, assets: [{ name: 'notes.txt', browser_download_url: 'https://example.test/notes' }] }, '1.0.0')).toBeNull();
  });
});

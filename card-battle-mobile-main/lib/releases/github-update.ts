export const GITHUB_RELEASES_LATEST_URL = 'https://api.github.com/repos/3thelast-glitch/card-battle-mobile-main/releases/latest';

export type GithubReleaseAsset = { name: string; browser_download_url: string };
export type GithubRelease = { tag_name: string; html_url: string; assets: GithubReleaseAsset[] };
export type AppUpdate = { version: string; downloadUrl: string; releaseUrl: string };

function versionParts(value: string): number[] {
  const cleaned = value.trim().replace(/^v/i, '').split('-')[0];
  return cleaned.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

/** يقارن الإصدارات الرقمية فقط؛ إصدار GitHub يجب أن يستخدم vX.Y.Z أو X.Y.Z. */
export function isVersionNewer(remote: string, current: string): boolean {
  const remoteParts = versionParts(remote);
  const currentParts = versionParts(current);
  const count = Math.max(remoteParts.length, currentParts.length);
  for (let index = 0; index < count; index += 1) {
    const difference = (remoteParts[index] ?? 0) - (currentParts[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export function resolvePlayerApk(release: GithubRelease): GithubReleaseAsset | undefined {
  return release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk') && !asset.name.toLowerCase().includes('dev'));
}

export function toAppUpdate(release: GithubRelease, currentVersion: string): AppUpdate | null {
  const asset = resolvePlayerApk(release);
  if (!asset || !isVersionNewer(release.tag_name, currentVersion)) return null;
  return { version: release.tag_name.replace(/^v/i, ''), downloadUrl: asset.browser_download_url, releaseUrl: release.html_url };
}

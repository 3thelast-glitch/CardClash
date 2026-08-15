import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AppUpdate, GithubRelease, GITHUB_RELEASES_LATEST_URL, toAppUpdate } from './github-update';

export function useGithubUpdate() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const controller = new AbortController();
    const currentVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.0.0';

    fetch(GITHUB_RELEASES_LATEST_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(async (response) => (response.ok ? (response.json() as Promise<GithubRelease>) : null))
      .then((release) => {
        if (release) setUpdate(toAppUpdate(release, currentVersion));
      })
      .catch(() => undefined); // يبقى التطبيق قابلاً للعب دون اتصال أو عند عدم وجود Release.

    return () => controller.abort();
  }, []);

  return { update, dismissUpdate: () => setUpdate(null) };
}

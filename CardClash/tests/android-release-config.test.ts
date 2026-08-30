import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appConfigPath = resolve(process.cwd(), 'app.config.js');
const packageJsonPath = resolve(process.cwd(), 'package.json');
const serverPackageJsonPath = resolve(process.cwd(), 'server/package.json');
const releaseWorkflowPath = resolve(process.cwd(), '../.github/workflows/publish-eas-apk.yml');

describe('Android release configuration', () => {
  it('uses the expected app version and Android build code for the release', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("version: '1.0.9'");
    expect(source).toContain('versionCode: 25');
    expect(JSON.parse(readFileSync(packageJsonPath, 'utf8')).version).toBe('1.0.9');
    expect(JSON.parse(readFileSync(serverPackageJsonPath, 'utf8')).version).toBe('1.0.9');
  });

  it('does not keep Card Clash video resources alive in the background or PiP', () => {
    const source = readFileSync(appConfigPath, 'utf8');

    expect(source).toContain("['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }]");
  });

  it('boots every release APK in an Android emulator before publishing it', () => {
    const workflow = readFileSync(releaseWorkflowPath, 'utf8');

    expect(workflow).toContain('EXPO_PUBLIC_MP_SERVER_URL: ${{ vars.EXPO_PUBLIC_MP_SERVER_URL }}');
    expect(workflow).toContain('reactivecircus/android-emulator-runner@v2');
    expect(workflow).toContain('adb shell am start -W');
    expect(workflow).toContain('Process: $PACKAGE,');
    expect(workflow).toContain('ANR in $PACKAGE');
  });
});

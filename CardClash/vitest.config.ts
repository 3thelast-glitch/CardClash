import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const gameUiMock = path.resolve(rootDir, 'test/mocks/game-ui.ts');

export default defineConfig({
  resolve: {
    alias: [
      { find: '../../components/game/EffectToast', replacement: gameUiMock },
      { find: '../../components/game/AbilityActivationOverlay', replacement: gameUiMock },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});

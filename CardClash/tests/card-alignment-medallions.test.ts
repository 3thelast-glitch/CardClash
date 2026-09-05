import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '..');
const alignmentAssets = [
  'good-medallion.png',
  'evil-medallion.png',
  'neutral-medallion.png',
];

describe('ميداليات تصنيف الكروت', () => {
  it('يوفر ميدالية PNG مستقلة لكل تصنيف بحجم مناسب للتطبيق', () => {
    for (const filename of alignmentAssets) {
      const assetPath = path.join(projectRoot, 'assets', 'icons', 'alignments', filename);
      expect(fs.existsSync(assetPath), `${filename} يجب أن تكون موجودة`).toBe(true);
      expect(fs.statSync(assetPath).size).toBeGreaterThan(1_000);
      expect(fs.statSync(assetPath).size).toBeLessThan(300_000);
    }
  });

  it('يربط القالب الموحد ميداليات الخير والشر والمحايد وتفوض له القوالب القديمة', () => {
    const unifiedSource = fs.readFileSync(path.join(projectRoot, 'components', 'cards', 'UnifiedCard.tsx'), 'utf8');
    const legacySource = fs.readFileSync(path.join(projectRoot, 'components', 'game', 'luxury-character-card-animated.tsx'), 'utf8');
    const itemSource = fs.readFileSync(path.join(projectRoot, 'components', 'game', 'card-item.tsx'), 'utf8');

    for (const filename of alignmentAssets) {
      expect(unifiedSource).toContain(filename);
    }
    expect(legacySource).toContain('UnifiedCard');
    expect(itemSource).toContain('UnifiedCard');
  });
});

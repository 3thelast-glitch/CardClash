/**
 * simulate-battle.ts
 * محاكي المعارك — شغّله من الـ terminal بدون تشغيل اللعبة
 *
 * الاستخدام:
 *   npx tsx scripts/simulate-battle.ts
 *   npx tsx scripts/simulate-battle.ts --card1 "ميهوك" --card2 "زورو" --rounds 5
 *   npx tsx scripts/simulate-battle.ts --list
 */

import { allCards } from '../lib/game/cards-data-exports';
import {
  resolveBattle,
  buildRageState,
  shouldTriggerRage,
  applyRageToCard,
  resolveSpecialAbility,
  isTurinForcedLoss,
} from '../lib/game/rage-engine';
import type { Card } from '../lib/game/types';

// ─── ANSI Colors ───────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
  bgRed:  '\x1b[41m',
  bgGreen:'\x1b[42m',
  bgBlue: '\x1b[44m',
};

const bold   = (s: string) => `${C.bold}${s}${C.reset}`;
const red    = (s: string) => `${C.red}${s}${C.reset}`;
const green  = (s: string) => `${C.green}${s}${C.reset}`;
const yellow = (s: string) => `${C.yellow}${s}${C.reset}`;
const cyan   = (s: string) => `${C.cyan}${s}${C.reset}`;
const gray   = (s: string) => `${C.gray}${s}${C.reset}`;
const magenta= (s: string) => `${C.magenta}${s}${C.reset}`;

// ─── Helpers ───────────────────────────────────

function findCard(query: string): Card | undefined {
  const q = query.trim().toLowerCase();
  return allCards.find(
    c =>
      c.nameAr?.toLowerCase().includes(q) ||
      (c as any).nameEn?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q),
  );
}

function rarityColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'legendary': return magenta(rarity);
    case 'epic':      return yellow(rarity);
    case 'rare':      return cyan(rarity);
    default:          return gray(rarity ?? 'common');
  }
}

function cardBox(card: Card, label: string): string {
  const name   = bold(card.nameAr ?? (card as any).nameEn ?? card.id);
  const nameEn = gray((card as any).nameEn ? `(${(card as any).nameEn})` : '');
  const atk    = green(`ATK: ${card.attack ?? 0}`);
  const def    = cyan(`DEF: ${card.defense ?? 0}`);
  const total  = bold(yellow(`TOTAL: ${(card.attack ?? 0) + (card.defense ?? 0)}`));
  const rarity = rarityColor((card as any).rarity ?? 'common');
  const tags   = (card as any).tags?.length
    ? gray(`[${(card as any).tags.join(', ')}]`)
    : '';
  const rage   = card.rageMode?.enabled
    ? magenta(`⚡ Rage: +${card.rageMode.rageAttackBoost ?? 0}ATK +${card.rageMode.rageDefenseBoost ?? 0}DEF`)
    : '';
  const ability = (card as any).ability ?? (card as any).abilityNameAr ?? '';

  return [
    `  ${bold(label)}`,
    `  ┌─────────────────────────────┐`,
    `  │ ${name} ${nameEn}`,
    `  │ ${rarity} ${tags}`,
    `  │ ${atk}  ${def}  ${total}`,
    rage   ? `  │ ${rage}` : null,
    ability? `  │ ${gray('قدرة: ' + ability)}` : null,
    `  └─────────────────────────────┘`,
  ].filter(Boolean).join('\n');
}

function separator(char = '─', len = 50): string {
  return gray(char.repeat(len));
}

// ─── List Mode ─────────────────────────────────

function listAllCards(): void {
  console.log(`\n${bold(cyan('═══ قائمة جميع البطاقات ═══'))}\n`);

  const grouped: Record<string, Card[]> = {};
  for (const card of allCards) {
    const rarity = (card as any).rarity ?? 'common';
    if (!grouped[rarity]) grouped[rarity] = [];
    grouped[rarity].push(card);
  }

  const order = ['legendary', 'epic', 'rare', 'common'];
  for (const rarity of order) {
    const group = grouped[rarity] ?? [];
    if (!group.length) continue;
    console.log(`${rarityColor(rarity.toUpperCase())} (${group.length} بطاقة)`);
    for (const card of group) {
      const nameAr = card.nameAr ?? '';
      const nameEn = (card as any).nameEn ? gray(` (${(card as any).nameEn})`) : '';
      const stats  = gray(`ATK:${card.attack ?? 0} DEF:${card.defense ?? 0}`);
      const tags   = (card as any).tags?.length ? gray(` [${(card as any).tags.join('/')}]`) : '';
      console.log(`  • ${nameAr}${nameEn}  ${stats}${tags}`);
    }
    console.log();
  }
  console.log(gray(`إجمالي: ${allCards.length} بطاقة`));
}

// ─── Simulate One Round ────────────────────────

interface RoundResult {
  round:    number;
  attacker: Card;
  defender: Card;
  result:   'win' | 'lose' | 'draw';
  reason:   string;
  rageTriggered?: string;
}

function simulateRound(
  attacker: Card,
  defender: Card,
  round: number,
  totalRounds: number,
  playerDeck: Card[],
  rageState: ReturnType<typeof buildRageState>,
): RoundResult {
  let currentAttacker = attacker;
  let rageTriggered: string | undefined;

  // Check rage trigger
  if (shouldTriggerRage(attacker, rageState)) {
    currentAttacker = applyRageToCard(attacker, rageState);
    rageTriggered = attacker.nameAr ?? '';
  }

  // Turin check
  if (isTurinForcedLoss(round, totalRounds, playerDeck)) {
    return {
      round, attacker: currentAttacker, defender,
      result: 'lose',
      reason: red('⚠️  تورين — خسارة إجبارية'),
      rageTriggered,
    };
  }

  // Special ability
  const special = resolveSpecialAbility(currentAttacker, defender);
  if (special) {
    const reasons: Record<string, string> = {
      win:  green('✨ قدرة خاصة — فوز مضمون'),
      lose: red('💔 قدرة خاصة — خسارة مضمونة'),
      draw: yellow('🤝 قدرة خاصة — تعادل'),
    };
    return {
      round, attacker: currentAttacker, defender,
      result: special,
      reason: reasons[special],
      rageTriggered,
    };
  }

  // Normal stat comparison
  const atkPower = (currentAttacker.attack ?? 0) + (currentAttacker.defense ?? 0);
  const defPower = (defender.attack   ?? 0) + (defender.defense   ?? 0);
  let result: 'win' | 'lose' | 'draw';
  let reason: string;

  if (atkPower > defPower) {
    result = 'win';
    reason = green(`✅ ${atkPower} > ${defPower} — فوز`);
  } else if (atkPower < defPower) {
    result = 'lose';
    reason = red(`❌ ${atkPower} < ${defPower} — خسارة`);
  } else {
    result = 'draw';
    reason = yellow(`🤝 ${atkPower} = ${defPower} — تعادل`);
  }

  return { round, attacker: currentAttacker, defender, result, reason, rageTriggered };
}

// ─── Full Match Simulation ─────────────────────

function simulateMatch(
  card1: Card,
  card2: Card,
  totalRounds: number,
): void {
  console.log(`\n${separator('═')}`);
  console.log(bold(cyan(`  ⚔️  محاكاة معركة — ${totalRounds} جولات`)));
  console.log(separator('═'));
  console.log();
  console.log(cardBox(card1, '🔵 اللاعب (المهاجم)'));
  console.log();
  console.log(cardBox(card2, '🔴 الخصم (المدافع)'));
  console.log();
  console.log(separator());

  const rageState = buildRageState();
  const playerDeck: Card[] = [card1];

  let wins = 0, losses = 0, draws = 0;
  const rounds: RoundResult[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const roundResult = simulateRound(card1, card2, r, totalRounds, playerDeck, rageState);
    rounds.push(roundResult);
    if (roundResult.result === 'win')  wins++;
    else if (roundResult.result === 'lose') losses++;
    else draws++;
  }

  // Print rounds
  console.log(bold('  📋 تفاصيل الجولات:'));
  console.log();
  for (const r of rounds) {
    const roundLabel = cyan(`  جولة ${r.round}/${totalRounds}`);
    const rage = r.rageTriggered ? magenta(` ⚡ RAGE: ${r.rageTriggered}`) : '';
    console.log(`${roundLabel}${rage}`);
    console.log(`    ${r.reason}`);
  }

  console.log();
  console.log(separator());

  // Summary
  const winRate = ((wins / totalRounds) * 100).toFixed(0);
  const winner  = wins > losses ? green('🏆 ' + (card1.nameAr ?? 'اللاعب') + ' يفوز!') :
                  losses > wins ? red('💀 ' + (card2.nameAr ?? 'الخصم') + ' يفوز!') :
                  yellow('🤝 تعادل!');

  console.log(bold('  📊 النتيجة النهائية:'));
  console.log(`    ${green('فوز:')} ${wins}  ${red('خسارة:')} ${losses}  ${yellow('تعادل:')} ${draws}`);
  console.log(`    معدل الفوز: ${winRate}%`);
  console.log(`    ${winner}`);
  console.log(separator('═'));
  console.log();

  // Special ability analysis
  console.log(bold(cyan('  🔍 تحليل القدرات الخاصة:')));
  console.log();

  const card1Tags = ((card1 as any).tags ?? []).join(', ') || gray('لا يوجد');
  const card2Tags = ((card2 as any).tags ?? []).join(', ') || gray('لا يوجد');
  console.log(`  ${bold(card1.nameAr ?? '')} tags: ${cyan(card1Tags)}`);
  console.log(`  ${bold(card2.nameAr ?? '')} tags: ${cyan(card2Tags)}`);
  console.log();

  // Check mutual special abilities
  const ab1vs2 = resolveSpecialAbility(card1, card2);
  const ab2vs1 = resolveSpecialAbility(card2, card1);

  if (ab1vs2) {
    console.log(`  ${bold(card1.nameAr ?? '')} vs ${bold(card2.nameAr ?? '')}: ${ab1vs2 === 'win' ? green('فوز مضمون ✅') : red('خسارة مضمونة ❌')}`);
  } else {
    console.log(`  ${gray('لا توجد قدرة خاصة بين هاتين البطاقتين')}`);
  }
  if (ab2vs1) {
    console.log(`  ${bold(card2.nameAr ?? '')} vs ${bold(card1.nameAr ?? '')}: ${ab2vs1 === 'win' ? green('فوز مضمون ✅') : red('خسارة مضمونة ❌')}`);
  }

  // Turin warning
  const hasTurin = playerDeck.some(
    c => (c as any).nameEn === 'Turin' || c.nameAr === 'تورين',
  );
  if (hasTurin) {
    console.log();
    console.log(red(`  ⚠️  تحذير: تورين في السطح — ${Math.max(1, Math.floor(totalRounds / 2))} جولات خسارة إجبارية!`));
  }

  console.log(separator('═'));
  console.log();
}

// ─── CLI Entry ─────────────────────────────────

function printUsage(): void {
  console.log(`
${bold(cyan('⚔️  Card Clash — Battle Simulator'))}

${bold('الاستخدام:')}
  npx tsx scripts/simulate-battle.ts
  npx tsx scripts/simulate-battle.ts ${cyan('--list')}
  npx tsx scripts/simulate-battle.ts ${cyan('--card1')} ${yellow('"اسم البطاقة"')} ${cyan('--card2')} ${yellow('"اسم البطاقة"')}
  npx tsx scripts/simulate-battle.ts ${cyan('--card1')} ${yellow('"ميهوك"')} ${cyan('--card2')} ${yellow('"زورو"')} ${cyan('--rounds')} ${yellow('10')}

${bold('الخيارات:')}
  ${cyan('--list')}           عرض جميع البطاقات المتاحة
  ${cyan('--card1')}  <اسم>   البطاقة الأولى (اللاعب) — عربي أو إنجليزي
  ${cyan('--card2')}  <اسم>   البطاقة الثانية (الخصم)
  ${cyan('--rounds')} <رقم>   عدد الجولات (افتراضي: 5)
  ${cyan('--help')}           عرض هذه الرسالة
`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.includes('--list')) {
    listAllCards();
    return;
  }

  // Parse args
  const card1Arg  = args[args.indexOf('--card1')  + 1];
  const card2Arg  = args[args.indexOf('--card2')  + 1];
  const roundsArg = args[args.indexOf('--rounds') + 1];

  const totalRounds = parseInt(roundsArg ?? '5', 10) || 5;

  // Default demo if no args
  if (!card1Arg && !card2Arg) {
    console.log(gray('\nلم يتم تحديد بطاقات — تشغيل معركة تجريبية افتراضية...\n'));
    const demos = [
      { c1: 'ميهوك', c2: 'زورو' },
      { c1: 'سانجي', c2: 'نامي' },
      { c1: 'تورين', c2: 'ناروتو' },
    ];
    for (const demo of demos) {
      const c1 = findCard(demo.c1);
      const c2 = findCard(demo.c2);
      if (c1 && c2) simulateMatch(c1, c2, totalRounds);
      else console.log(gray(`⚠️  لم يتم العثور على: ${demo.c1} أو ${demo.c2}`));
    }
    console.log(yellow(`\nجرّب: npx tsx scripts/simulate-battle.ts --list\n`));
    return;
  }

  // Look up specific cards
  if (!card1Arg) { console.error(red('❌ حدد البطاقة الأولى: --card1 "اسم"')); process.exit(1); }
  if (!card2Arg) { console.error(red('❌ حدد البطاقة الثانية: --card2 "اسم"')); process.exit(1); }

  const c1 = findCard(card1Arg);
  const c2 = findCard(card2Arg);

  if (!c1) {
    console.error(red(`❌ لم يتم العثور على بطاقة: "${card1Arg}"\nاستخدم --list لعرض الأسماء المتاحة`));
    process.exit(1);
  }
  if (!c2) {
    console.error(red(`❌ لم يتم العثور على بطاقة: "${card2Arg}"\nاستخدم --list لعرض الأسماء المتاحة`));
    process.exit(1);
  }

  simulateMatch(c1, c2, totalRounds);
}

main();

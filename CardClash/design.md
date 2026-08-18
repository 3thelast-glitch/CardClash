# 🎴 Card Battle Game — Design Document

> **Version:** 1.0 · **Platform:** Mobile (iOS / Android) · **Theme:** Dark Fantasy

---

## Overview

A strategic mobile card battle game where the player selects a team of heroes and competes in multi-round duels against an AI bot. Each round pitches one card from each team against the other, with winner determined by calculated damage output.

---

## Screen Architecture

```
Splash
  └─► Main Menu (Card Selection)
        └─► [Solo] Battle Arena ──► Results
        └─► [Multi] Multiplayer Lobby ──► Battle Arena ──► Results
```

---

## Screens

### 1. Main Menu — Card Selection

**Purpose:** Entry point and deck-building before battle.

**Layout:**
```
┌──────────────────────────────────┐
│            🎴 Card Clash          │
│         [ Solo ]  [ Multi ]       │
├──────────────────────────────────┤
│  Available Cards                  │
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ Card │ │ Card │ │ Card │     │
│  └──────┘ └──────┘ └──────┘     │
│  ┌──────┐ ┌──────┐ ┌──────┐     │
│  │ Card │ │ Card │ │ Card │     │
│  └──────┘ └──────┘ └──────┘     │
├──────────────────────────────────┤
│  Your Deck  [3 / 5]              │
│  ┌────┐ ┌────┐ ┌────┐ ░░ ░░     │
│  │ 1  │ │ 2  │ │ 3  │           │
│  └────┘ └────┘ └────┘           │
├──────────────────────────────────┤
│         ⚔️  Start Battle          │
└──────────────────────────────────┘
```

**Interactions:**
- Tap card → add to deck (max 5)
- Tap selected card → remove from deck
- Long press → view full card stats
- "Start Battle" appears only when 3+ cards selected

---

### 2. Battle Arena — HUD

**Purpose:** Main gameplay screen — round-by-round combat display.

**Layout:**
```
┌──────────────────────────────────┐
│  Round  1 / 3          P: 0  B: 0│
├──────────────────────────────────┤
│            BOT CARD               │
│         ┌──────────┐              │
│         │   🤖     │              │
│         │  ★★★☆☆   │              │
│         │ ATK  28  │              │
│         │ DEF  18  │              │
│         └──────────┘              │
│     HP  ████████░░  80 / 100      │
├──────────────────────────────────┤
│              ⚔️ VS ⚔️              │
├──────────────────────────────────┤
│           PLAYER CARD             │
│         ┌──────────┐              │
│         │   👤     │              │
│         │  ★★★★☆   │              │
│         │ ATK  32  │              │
│         │ DEF  12  │              │
│         └──────────┘              │
│     HP  ██████████  100 / 100     │
├──────────────────────────────────┤
│  ✅  Player Wins the Round!       │
│         [ Next Round → ]          │
└──────────────────────────────────┘
```

**Battle Logic:**
```
Net Damage  = Attacker.ATK − Defender.DEF
HP (new)    = Defender.HP  − max(Net Damage, 0)
Round Winner = highest net damage dealt
```

---

### 3. Results Screen

**Purpose:** Show final winner, score breakdown, and post-game options.

**Layout:**
```
┌──────────────────────────────────┐
│                                  │
│           🏆  Victory  🏆         │
│        ──────────────────        │
│         Player  2  —  1  Bot     │
│                                  │
├──────────────────────────────────┤
│  Round Summary                   │
│  Round 1   Player  ✓             │
│  Round 2   Bot     ✗             │
│  Round 3   Player  ✓             │
├──────────────────────────────────┤
│      [ 🔄  Play Again ]          │
│      [ 🏠  Main Menu  ]          │
└──────────────────────────────────┘
```

---

## UI Components

| Component | Description |
|---|---|
| `CardTile` | Card thumbnail shown in selection grid — displays name, rarity stars, ATK/DEF |
| `CardDetail` | Full-screen card view on long press — all stats + ability list |
| `BattleCard` | Enlarged card shown in arena — includes live HP bar |
| `HPBar` | Animated health bar with color shift (green → yellow → red) |
| `StatBadge` | ATK / DEF / HP icon + value badge used inside `BattleCard` |
| `RoundCounter` | "Round X / Y" indicator with animated transition |
| `ScoreBoard` | Player vs Bot live score strip at top of arena |
| `RoundResult` | Win / Loss / Draw banner with haptic feedback |
| `DeckSlot` | Empty / filled slot indicator in deck builder |

---

## Rarity System

| Tier | Stars | Border Color | Glow |
|---|---|---|---|
| Common | ★☆☆☆☆ | `#64748b` | None |
| Rare | ★★★☆☆ | `#3b82f6` | Blue |
| Epic | ★★★★☆ | `#a855f7` | Purple |
| Legendary | ★★★★★ | `#f59e0b` | Gold |

---

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#0f0f1a` | App background |
| `bg-surface` | `#1a1a2e` | Cards, panels |
| `bg-elevated` | `#16213e` | Modals, overlays |
| `accent-primary` | `#e94560` | Buttons, highlights |
| `accent-win` | `#22c55e` | Win state |
| `accent-loss` | `#ef4444` | Loss state |
| `accent-draw` | `#f59e0b` | Draw / neutral |
| `text-primary` | `#ffffff` | Headings |
| `text-secondary` | `#a0a0a0` | Labels, hints |
| `border-subtle` | `#1e293b` | Dividers |
| `rarity-rare` | `#3b82f6` | Rare card border |
| `rarity-epic` | `#a855f7` | Epic card border |
| `rarity-legendary` | `#f59e0b` | Legendary card border |

---

## User Flows

### Solo Battle Flow
```
Open App
  → Main Menu
    → Browse & select 3–5 cards
      → Tap "Start Battle"
        → Battle Arena (N rounds)
          → Results Screen
            → Play Again  →  Main Menu
            → Main Menu
```

### Multiplayer Flow
```
Main Menu → Multiplayer
  → Create Room  →  Share Room Code  →  Wait for opponent
  → Join Room    →  Enter Room Code  →  Wait for host
    → Both players select cards
      → Battle Arena (synchronized)
        → Results Screen
```

---

## Animation & Feedback

| Event | Animation | Haptic |
|---|---|---|
| Card selected | Scale up + glow pulse | Light |
| Card removed from deck | Scale down + fade | None |
| Round start | Cards slide in from sides | None |
| Round win | Green flash + confetti | Medium |
| Round loss | Red flash + shake | Heavy |
| Final win | Trophy drop + particle burst | Success |
| Final loss | Grey overlay + fade | Error |
| HP critical (< 20%) | HP bar red pulse | None |

---

## Design Principles

- **Dark-first:** Dark mode is the only theme — suits the game's fantasy combat tone
- **Information hierarchy:** Round > Score > Cards > Actions — always clear what matters
- **Minimal tap depth:** Core loop (select → battle → result → replay) is always 2 taps away
- **Readable stats:** ATK / DEF / HP values are legible at a glance — no hidden menus during battle
- **Haptics as feedback:** Every outcome has a matching physical response

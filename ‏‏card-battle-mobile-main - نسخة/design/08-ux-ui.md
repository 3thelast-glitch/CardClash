# 📱 UX / UI

> Every screen has one job. Don’t make it do two.

```
Splash
  └─► Game Mode
        ├─► [Solo]  Difficulty  →  Card Selection  →  Rounds Config  →  Battle  →  Results
        └─► [Multi] Multiplayer Lobby  →  Waiting  →  Battle  →  Results

Settings  (accessible from any menu screen)
Abilities / Edit Ability  (accessible from Settings)
Cards Gallery / Collection / Stats / Leaderboard  (accessible from menu)
```

---

## Screens

---

### 🌑 Splash
**File:** `splash.tsx`

> First thing the player sees. Sets the tone.

- Show the game logo.
- Animate in, then auto-navigate.
- No buttons. No decisions.
- Must feel premium in 2 seconds.

---

### 🎮 Game Mode
**File:** `game-mode.tsx`

> One question: Solo or Multi?

```
┌───────────────────────┐
│       Card Clash         │
├───────────────────────┤
│    [ 🤖  Solo Battle ]    │
│    [ 👥  Multiplayer  ]    │
└───────────────────────┘
```

- Two buttons. Nothing else on the critical path.
- Settings and other screens accessible but secondary.

---

### ⚔️ Difficulty
**File:** `difficulty.tsx`

> How hard does the player want it?

- Three clear options: Easy, Normal, Hard.
- Each option shows a brief description.
- Selection is immediate — no confirm step.

---

### 🎴 Card Selection
**File:** `card-selection.tsx`

> Where the player builds their deck.

```
┌───────────────────────┐
│  Select Your Deck        │
├───────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐  │
│  │    │ │    │ │    │  │
│  └────┘ └────┘ └────┘  │
│  ┌────┐ ┌────┐ ┌────┐  │
│  │    │ │    │ │    │  │
│  └────┘ └────┘ └────┘  │
├───────────────────────┤
│  Deck  [■ ■ ■ □ □]  3/5  │
├───────────────────────┤
│     [ Continue → ]       │
└───────────────────────┘
```

- Grid scrolls, deck bar stays fixed.
- Tap to add, tap again to remove.
- Long press → full card detail.
- Continue button active at 3+ cards only.

---

### ⚙️ Rounds Config
**File:** `rounds-config.tsx`

> How many rounds?

- Simple number selector: 1, 3, 5.
- Default is 3.
- One confirm button.

---

### ⚔️ Battle
**File:** `battle.tsx`

> The fight. Most important screen in the game.

```
┌───────────────────────┐
│  Round 2/3     P:1  B:0  │
├───────────────────────┤
│      [ BOT CARD ]        │
│      ATK 28  DEF 18      │
│      HP ██████░░░░ 60%   │
├───────────────────────┤
│         ⚔️ VS ⚔️          │
├───────────────────────┤
│     [ PLAYER CARD ]      │
│      ATK 32  DEF 12      │
│      HP ██████████ 100%  │
├───────────────────────┤
│  ✅ You Win the Round!   │
│      [ Next Round → ]    │
└───────────────────────┘
```

- Score and round pinned at top — always.
- Bot card above, player card below — always.
- HP bar changes color: green → yellow → red.
- Result banner after each round — clear and large.
- One button to continue.

---

### 🏆 Battle Results
**File:** `battle-results.tsx`

> The match is over. Make it feel final.

```
┌───────────────────────┐
│      🏆 Victory 🏆       │
│      Player 2  — 1 Bot   │
├───────────────────────┤
│  Round 1  Player  ✓      │
│  Round 2  Bot     ✗      │
│  Round 3  Player  ✓      │
├───────────────────────┤
│   [ 🔄 Play Again ]       │
│   [ 🏠 Main Menu  ]       │
└───────────────────────┘
```

- Outcome is the biggest element.
- Round summary below it.
- Replay is always first.

---

### 👥 Multiplayer Lobby
**File:** `multiplayer-lobby.tsx`

> Create a room or join one.

- Two clear actions: Create Room / Join Room.
- Join shows a code input field.
- No unnecessary steps.

---

### ⏳ Multiplayer Waiting
**File:** `multiplayer-waiting.tsx`

> Waiting for the opponent. Must not feel empty.

- Show room code prominently.
- Show connection status clearly.
- Animate the waiting state — not a frozen screen.
- Timeout message if connection takes too long.

---

### ⚔️ Multiplayer Battle
**File:** `multiplayer-battle.tsx`

> Same as solo battle. Same rules.

- Identical layout to solo `battle.tsx`.
- Opponent is a real player, not a bot.
- Sync state must be invisible to the player.

---

### 🏆 Multiplayer Results
**File:** `multiplayer-results.tsx`

> Same as solo results. Same rules.

- Show opponent name instead of “Bot”.
- Same layout, same actions.

---

## Supporting Screens

| Screen | File | Job |
|---|---|---|
| Settings | `settings.tsx` | App preferences and ability management |
| Abilities | `abilities.tsx` | View all abilities in the game |
| Edit Ability | `edit-ability.tsx` | Toggle or configure a specific ability |
| Cards Gallery | `cards-gallery.tsx` | Browse all cards with full stats |
| Collection | `collection.tsx` | Player’s owned or unlocked cards |
| Stats | `stats.tsx` | Player performance and history |
| Leaderboard | `leaderboard.tsx` | Top players ranking |

---

## UX Rules

```
✦  Every screen has one primary action.
✦  The player never needs to read to understand what to do.
✦  Back navigation is always available on non-battle screens.
✦  Battle screens block back navigation — no accidental exits.
✦  Loading states are short or hidden behind transitions.
✦  Error states are clear and actionable — never silent.
```

---

## UI Rules

```
✦  Use the color system from 06-colors.md — no one-off colors.
✦  Use the component system from 04-components.md — no duplicates.
✦  Stat values (ATK / DEF / HP) are always the largest text in battle.
✦  Buttons are large enough to tap without zooming.
✦  Card art is never cropped on any supported screen size.
✦  Dark surfaces only — no light mode.
```

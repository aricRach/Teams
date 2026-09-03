# League Mode - Design Document

## Goal

Add a **League** game mode that runs **two matches in parallel** on the same
match day. The admin assigns teams to *Game 1* and *Game 2*, then manages each
game independently - its own timer, its own scorers, its own end-game result -
while both feed the same day's statistics and a live league table.

Today the Game screen supports exactly one live match: a single `playingTeams`
pair, a single `StopwatchComponent`, and a single `liveMatchId`. League mode
generalizes that to N concurrent games (2 in the first version).

---

## Decisions (v1)

1. **Scope = parallel games + live table only.** The admin arranges each pair of
   games manually; the app does not schedule or suggest pairings. Round
   progression (auto pairings, round-robin generator, "round N of M" tracking)
   is deferred to v2.
2. **Mode is a free per-session choice, not a group setting.** A `Single |
   League` toggle sits at the top of the existing `/home/game` screen. It is
   **not** locked to the group - the group decides each time they play. The
   last-used mode is remembered per group only as the *default* the toggle
   opens on; switching is always one tap (when no game is live).
3. **League mode uses exactly 4 teams.** While the toggle is on **League**, the
   board shows 4 teams and the slot selector enforces 2 per game. Switching back
   to **Single** restores the group's normal team count. 3-/6-team leagues with
   rotation are v2 (they only make sense with round progression).
4. **Standings table in two places, one component.** `LeagueStandingsComponent`
   rendered on the Game screen in League mode (the running session's table) *and*
   in the read-only inner tab `home/matches/league` (all members). The tab has a
   **date selector** like the Timeline tab and shows the combined table for
   **all league games on the chosen day** (any/all sessions that day), defaulting
   to the most recent date.
5. **Independent start.** A game's Start enables as soon as its 2 teams are
   assigned - no need to set up both games first. Nav locks on the first start,
   unlocks when no game is live.
6. **Access split (mirrors Game vs Matches today).** The Game screen (both modes)
   stays admin-only (`groupAdminGuard`); the standings tab is read-only for all
   group members. Non-admins cannot run games.
7. **One mode live at a time.** Single and League share the same live-match
   state. Once a game is live in either mode, the toggle is disabled until every
   live game ends.

---

## Implementation status (v1 built)

| Area | Files |
| --- | --- |
| `MatchRecord` league fields (`mode`, `slot`, `sessionId`, `teamKeys`, `round`) | `match-event-manager/models/match-event.model.ts` |
| Per-slot live state (`liveMatches`, `liveMatchIdFor`, `liveSlots`, `hasAnyLiveMatch`, `liveMode`) + `slot` args | `match-event-manager/services/match-events-manager.service.ts` |
| `GameService.endGame(teams, slot)` + guard on `hasAnyLiveMatch` | `game/game.service.ts` |
| `StopwatchComponent.clear()` (zero without emitting) | `stopwatch/stopwatch.component.ts` |
| Drag-drop table league inputs (`leagueAssignMode`, `teamSlots`, `teamSlotChange`, `matchIdByTeam`, `lockedTeamKeys`, `isTeamLocked`, `isGoalTaggingEnabled`) | `players/players-drag-drop-table/` |
| `GameComponent` -> `Single | League` toggle shell (localStorage `gameMode-{groupId}`) | `game/game.component.*` |
| `SingleGameComponent` (classic view, moved verbatim) | `game/single-game/` |
| `LeagueGameComponent` + `LeagueGameService` + `LeagueGamePanelComponent` (all state derived from `matches`) | `game/league-game/` |
| `computeStandings(matches[])` + `LeagueStandingsComponent` | `game/league-standings/` |
| `home/matches/league` tab (`LeagueTableComponent`) - date selector, per-day table | `match-event-manager/league-table/`, `matches.service.ts`, `app.routes.ts` |

**No refresh-restore.** League state is in-memory only - reloading the page
mid-game abandons the on-screen session (the live match docs stay `live` in
Firestore but are ignored). Timer/session rehydration was built and then removed
as unwanted complexity.

Not yet done: unit tests (Phase 1 step 4), sticky status-bar / play-phase layout,
finishing a session on toggle-back to Single.

---

## Current single-game architecture (what we build on)

| Piece | File | Role |
| --- | --- | --- |
| `GameComponent` | `src/app/game/game.component.ts` | Teams screen. Holds `playingTeams` signal (max 2 keys), one stopwatch via `viewChild`. |
| `players-drag-drop-table` | `src/app/players/players-drag-drop-table/` | Renders teamA..teamD + allPlayers. One checkbox per team feeds `playingTeams`. `currentMatchId` input resets `liveSessionGoals`. Emits `recordGoalEvent {player, teamKey}`. |
| `StopwatchComponent` | `src/app/stopwatch/` | Self-contained mm:ss timer. `start/pause/reset/endGame` outputs. Already fully input/output driven. |
| `MatchEventsManagerService` | `src/app/match-event-manager/services/match-events-manager.service.ts` | `liveMatchId` signal (single). `onTimerStartedForMatch()` creates a `groups/{gid}/matches` doc `status:'live'`. `recordPlayerGoalFromTimer()` adds `player_goal` events. `abandonLiveMatchOnReset()` / `endGameAndPersist()`. |
| `GameService` | `src/app/game/game.service.ts` | `endGame({team1,team2})`: tallies goals from events, decides winner/loser/draw, calls `endGameAndPersist`, unlocks nav. |
| `ComputedStatisticsService` | `src/app/statistics/services/computed-statistics.service.ts` | Derives per-player/per-date stats purely from `completed`/`correction` matches + their events. Date key = `match.createdAt`. |

Key facts that make parallel games feasible:

- Each match is an **independent Firestore document** (`groups/{gid}/matches/{id}`)
  with its own `events` subcollection - no write contention between two games.
- Statistics are **recomputed from match docs**, keyed by date. Two matches on
  the same day already aggregate additively. Nothing date-level needs to change.
- `abandonAllLiveMatches()` exists but is **never called** - safe.
- Only three places read `liveMatchId`: `game.component.html`, `game.service.ts`,
  `match-events-manager.service.ts`. Small blast radius.

---

## Concepts

- **Mode** - `single` (today's behavior, one match) or `league` (two parallel
  matches). Chosen per session via a toggle on the Game screen; see Decision 2.
- **League session** - one match day of league play. Groups the parallel games
  and (later) multiple rounds. Identified by a `sessionId`.
- **Slot** - a "pitch". Slot `1` = Game 1, slot `2` = Game 2. Designed to
  generalize to more slots.
- **Round** (v2) - a set of games played back-to-back; after a round both slots
  free up and new pairings are chosen.

Rules:

- A team is assigned to **at most one slot** at a time.
- The two games' teams must **not share players** (they don't today - teams are
  disjoint), so no player is double-counted in a day's stats.

---

## User flow

### 1. Choose the mode

On `/home/game` (the existing Teams screen, no new route or nav entry), a toggle:

```text
Mode:  ( Single | League )
```

- Opens on the group's last-used mode (persisted in `localStorage`, key
  `gameMode-{groupId}`); defaults to `Single` if never set.
- Free to switch any time **no game is live**; disabled while a game is running.
- Selecting **League** sets `numberOfTeams = 4` for the screen and swaps the
  drag-drop board into slot-assignment mode. Selecting **Single** restores the
  group's normal count and the classic 2-checkbox flow.

### 2. Build and assign teams

Same drag-drop board as Game. Each team header gets a **slot selector** instead
of the single "playing" checkbox:

```text
Team A   [ G1 | G2 | - ]
Team B   [ G1 | G2 | - ]
Team C   [ G1 | G2 | - ]
Team D   [ G1 | G2 | - ]
```

Valid config: exactly 2 teams on G1 and exactly 2 on G2 enables that game's
timer. Each game can be started independently as soon as its 2 teams are set.

### 3. Run the two games

Once a game starts, the layout switches to the **play phase**: a sticky status
bar shows both timers + scores, and tapping a half expands that game's panel
below it (full layout in **League view layout**).

- Starting a game: locks that game's two teams (drag disabled), creates its live
  match doc, locks navigation (if not already locked).
- Goals: double-click a player in the expanded game's team list -> goal modal ->
  event written to **that game's** match id.
- The other game keeps ticking in the status bar; tap it to switch. Not-yet-
  started teams can still be edited via the collapsed board.

### 4. End each game

`End` on a game's timer completes just that game and frees its slot. The other
game is untouched. Full mechanics in **End-game flow (League)** below.

### 5. League table (read-only)

Shown both on the Game screen while in League mode and as the
`home/matches/league` tab, with standings computed from this session's completed
matches:

```text
      P  W  D  L  GF GA GD Pts
A     1  1  0  0   3  1  2   3
D     1  1  0  0   2  0  2   3
B     1  0  0  1   1  3 -2   0
C     1  0  0  1   0  2 -2   0
```

Points 3/1/0, GF/GA from `wonTeamScore`/`loseTeamScore`. Pure client-side
`computed()` over `AllMatchDataService.matchesWithEvents()` filtered by `sessionId`.

---

## Data model changes

### `MatchRecord` (`match-event.model.ts`) - additive, all optional

```ts
export interface MatchRecord {
  // ...existing...
  mode?: 'single' | 'league';   // default 'single' when absent
  sessionId?: string;           // client-generated key grouping a league session's matches
  slot?: number;                // 1 | 2 - which parallel pitch
  round?: number;               // v2 - 1-based round within the session
  teamKeys?: string[];          // ['teamA','teamB'] - lets a refresh rehydrate a live game
}
```

Nothing existing reads these; statistics computation is unchanged. Single-mode
match docs are written byte-identical to before - only league matches get tagged.

### No separate collection

An earlier draft added a `groups/{groupId}/leagueSessions` doc to persist live
state. It was removed: a **live league match doc already carries everything**
needed to rehydrate (`slot`, `sessionId`, `teamKeys`, `startedAt`), and the
standings only need matches sharing a `sessionId`. `sessionId` is generated
client-side (`crypto.randomUUID()`) on the first `Start` of a session. No new
Firestore rules are required.

Standings are **not** stored - always computed from matches tagged with
`sessionId`.

---

## Service changes

### `MatchEventsManagerService` - from one live match to a keyed set

Replace the single signal:

```ts
// before
readonly liveMatchId = signal<string | null>(null);

// after
readonly liveMatches = signal<Record<number, string | null>>({}); // slot -> matchId
liveMatchIdFor(slot = 1) { return this.liveMatches()[slot] ?? null; }
readonly hasAnyLiveMatch = computed(() =>
  Object.values(this.liveMatches()).some(Boolean));
readonly liveMode = signal<'single' | 'league' | null>(null); // set on first start, cleared when no game live
```

`liveMode` is what the Game screen's mode toggle reads to disable itself, and
what a future guard uses to keep the two modes from overlapping.

Add a `slot` parameter (default `1`, so single mode is untouched) to:

- `onTimerStartedForMatch(slot, opts?: { sessionId?; teamKeys? })` - writes
  `mode`, `sessionId`, `slot` onto the new match doc; stores id at
  `liveMatches()[slot]`.
- `recordPlayerGoalFromTimer(player, teamKey, elapsedMs, slot)` - targets
  `liveMatchIdFor(slot)`.
- `abandonLiveMatchOnReset(slot)` - clears only that slot.
- `endGameAndPersist(gameDetails, slot)` - reads/clears only that slot's id.

`liveMatchId` (no arg) can be kept as `liveMatchIdFor(1)` for a transition
period, or the three current callers updated in the same PR.

### `GameService.endGame` - parameterize by slot + explicit team keys

```ts
async endGame(teams: { team1: string; team2: string }, slot = 1) {
  const matchId = this.matchEventsService.liveMatchIdFor(slot);
  // ...tally goals from that match's events (unchanged logic)...
  await this.matchEventsService.endGameAndPersist(gameDetails, slot);

  if (!this.matchEventsService.hasAnyLiveMatch()) {
    await this.playersService.setFantasyMetaIsActive(false);
    this.navigationService.unlockNavigation();
  }
}
```

### New `LeagueGameService` (provided in `GameComponent`, used only in League mode)

Owns the per-slot orchestration so the component stays thin:

- `assignments: signal<Record<string, number>>` - teamKey -> slot (0/absent = bench).
- `slotTeams(slot): string[]`, `slotReady(slot): boolean` (exactly 2).
- `startGame(slot)`, `endGame(slot)`, `resetGame(slot)` - delegate to
  `MatchEventsManagerService` / `GameService` with the slot.
- `sessionId` generated client-side on first `startGame`; `hydrate()` rebuilds
  state from the group's live `mode:'league'` match docs on load.
- `standings = computed(...)` over `AllMatchDataService` filtered by `sessionId`.

---

## Component structure

`GameComponent` (route `/home/game`, unchanged) becomes a thin shell around the
mode toggle and one of two views:

```text
GameComponent  (route: home/game)
├── mode toggle  ( Single | League )   -- disabled while matchEvents.liveMode() != null
│
├── @if (mode() === 'single')          -- existing markup, moved verbatim
│   ├── players-drag-drop-table  [playingTeams ...]   (byte-for-byte as today)
│   └── StopwatchComponent
│
└── @if (mode() === 'league')  -> <app-league-game>
    LeagueGameComponent  (NOT routed - embedded child; providers: [LeagueGameService])
    ├── LeagueGamePanelComponent  x2    (one per slot)
    │   ├── header: "Game 1 — A vs B"
    │   ├── live score (from the slot's live-match events)
    │   ├── StopwatchComponent          (viewChild on the panel)
    │   └── scorer feed for that slot
    ├── players-drag-drop-table         (leagueAssignMode: G1 / G2 / – per team)
    ├── "Finish league" button          (when a session exists and no slot is live)
    ├── LeagueStandingsComponent        (read-only table, this session)
    └── stale-session modal             (Resume / Discard on refresh)
```

- Single mode keeps its exact current template and `viewChild(StopwatchComponent)`
  (moved verbatim into `SingleGameComponent`).
- `LeagueGameComponent` uses `viewChildren(LeagueGamePanelComponent)` and reaches
  each panel's stopwatch through `panel.stopwatch()`.
- Each `LeagueGamePanel` gets `[slot]`, `[teamKeys]`, `[ready]`, `[live]`,
  `[score]`, `[scorers]` and emits `start / reset / end` up to
  `LeagueGameService` via the component.
- `GameComponent` is purely the `Single | League` toggle + an `@if` switch.
- **v1 layout:** both panels render together (flex-wrap: stacked on a phone,
  side-by-side on a wide screen); the board sits below them and stays visible.
  The sticky status-bar + tap-to-switch "play phase" from an earlier draft is a
  follow-up (see **League view layout**).

### `players-drag-drop-table` changes

| Today | League |
| --- | --- |
| `playingTeams = input<string[]>([])` (max 2) | keep for single mode; add `teamSlots = input<Record<string, number>>({})` |
| `playingTeamsChange` output | add `teamSlotChange` output |
| checkbox per team header | when `teamSlots` provided, render a 3-way segmented control (`G1 / G2 / -`); enforce max 2 per slot |
| `currentMatchId = input<string \| null>()` (drives `liveSessionGoals` reset) | add `matchIdByTeam = input<Record<string, string \| null>>({})`; `liveSessionGoals` resets when the set of live match ids changes |
| `isLocked = input.required()` (whole board) | add `lockedTeamKeys = input<string[]>([])`; a team's drop list is disabled if globally locked **or** its key is in `lockedTeamKeys`. allPlayers stays draggable into not-yet-started teams |
| double-click enabled when `playingTeams.includes(teamKey)` | `leagueAssignMode` input flips the header UI; goal tagging (`isGoalTaggingEnabled`) enabled when `matchIdByTeam[teamKey]` is set (that slot is live) |

`recordGoalEvent` still emits `{player, teamKey}`; `LeagueGameService` maps
`teamKey -> slot -> matchId`. Goal keying stays by `playerId` (a player is in one
team, one game).

Single-mode props stay unchanged - league inputs are additive and opt-in. The
single-game *view* is moved into its own component but its markup and bindings
are not rewritten.

---

## League view layout

**v1 (shipped):** both `LeagueGamePanel`s render together in a `flex-wrap` row -
stacked on a phone, side-by-side on a wide screen - each with its own always-
visible timer and score. The `players-drag-drop-table` stays below them so
rosters and slot assignments can be edited at any time. No tab-switching, no
collapse. `activeSlot` exists in `LeagueGameService` (used to retarget focus
when a game ends) but does not drive layout yet.

**Follow-up (deferred):** the sticky status-bar + setup/play phases below, for
when two expanded panels plus the board get too tall on a phone.

### Setup phase (no game started)

The full 4-team `players-drag-drop-table` with the `G1 / G2 / -` selector on each
team header. This is the only time the whole board is needed - arranging rosters
and assigning pitches. Single scroll, everything visible. `LeagueGamePanel`s
render collapsed (team names + a disabled Start until `slotReady(slot)`).

### Play phase (one or both games live)

The drag-drop board collapses to a thin "edit rosters" disclosure. A **sticky
status bar** (`LeagueStatusBarComponent`) pins to the top with both games at a
glance - both timers tick here at all times:

```text
┌─────────────────────────────────────┐
│  ● GAME 1        │    GAME 2         │
│    12:04         │    08:30          │
│    A  2 – 1  B   │    C  0 – 0  D    │   <- tap either half
└─────────────────────────────────────┘
```

Tapping a half sets the **active slot** and expands that game's
`LeagueGamePanel` directly below the bar:

```text
│  GAME 1 — Team A vs Team B           │
│    [Start] [Pause] [Reset] [End]     │
│                                      │
│  Team A            Team B            │
│   • Cohen  ⚽ 12'   • Levi           │   <- double-tap a player = goal
│   • Mizrahi        • Peretz ⚽ 4'    │
│                                      │
│  Scorers:  Cohen 12', Peretz 4'     │
```

- Only the active slot's panel is expanded; the other stays in the status bar.
- **Both `StopwatchComponent`s stay mounted** - use `[hidden]`, never `@if`, so a
  background timer is not destroyed and re-created when you switch.
- `activeSlot = signal<number>(1)` in `LeagueGameComponent` drives which panel is
  expanded; defaults to the first started slot, follows the most recent start.

### Wide screens (>= ~900px)

No switching - both `LeagueGamePanel`s render side by side, fully expanded, and
the status bar is hidden (redundant). Same components, a CSS breakpoint.

---

## End-game flow (League)

Ending a game in League mode is the single-mode flow scoped to **one slot**. The
other slot's match, timer, and events are never read or touched.

### Per-game end (one slot)

1. **Trigger** - `End` on slot _s_'s `StopwatchComponent` (disabled while
   `time === 0`, same as today) -> `LeagueGamePanel` emits `end` with the slot ->
   `LeagueGameService.endGame(s)`.
2. **Resolve the game** - `teamKeys = slotTeams(s)` -> `{ team1, team2 }`;
   `matchId = matchEvents.liveMatchIdFor(s)`.
3. **Tally** - `GameService.endGame({ team1, team2 }, s)` fetches events for
   `matchId` only, counts non-deleted `player_goal` by `teamKey`, derives
   `GameStatus` (`decided` / `draw`) and `wonTeamScore` / `loseTeamScore`
   (unchanged logic, now slot-parameterised).
4. **Persist** - `matchEvents.endGameAndPersist(gameDetails, s)`:
   - patches that match doc -> `status: 'completed'`, `winner` / `loser` /
     scores / `winnerPlayerIds` / `loserPlayerIds` / `gameStatus` / `endedAt`.
     The doc already carries `mode: 'league'`, `sessionId`, `slot` from creation.
   - clears **only** `liveMatches()[s]` (leaves the other slot).
   - adds a `team_result` event; writes the audit-trail line.
5. **Global guards** - run only when `!matchEvents.hasAnyLiveMatch()`:
   `setFantasyMetaIsActive(false)`, `navigationService.unlockNavigation()`,
   `matchEvents.liveMode.set(null)` (re-enables the Single/League toggle).
   While the other game is still live, navigation stays locked and the toggle
   stays disabled.
6. **No session-doc write** - the match doc is now `completed` in `matches`;
   nothing else to persist. `sessionId` stays set locally so more games can join
   the same session (see *Ending the session*).
7. **UI reset for slot _s_** - `panel.stopwatch()?.clear()`, clear its slot
   assignments so the 2 teams return to the bench. If _s_ was the `activeSlot`,
   move focus to the other live slot.
8. **Standings** - recompute automatically. `LeagueStandingsComponent` is a
   `computed()` over `AllMatchDataService.matchesWithEvents()` filtered by
   `sessionId`; the new `completed` match flows in with no explicit call.

### Reset vs End

- **End** = complete the match (step 4 above), contributes to stats and standings.
- **Reset** = `abandonLiveMatchOnReset(s)` - soft-deletes that slot's goal
  events, marks the match `abandoned`, clears `liveMatches()[s]`. Only that slot;
  the other game keeps running. Nothing reaches statistics or standings.

### Re-using a freed slot (manual rounds, v1)

After a slot ends, the admin may assign 2 teams to it and press Start again. The
new match is created under the **same `sessionId`** (still held in
`LeagueGameService`), so standings keep accumulating. This is manual round
progression - the automated scheduler is v2.

### Ending the session

`sessionId` is held only in `LeagueGameService` (no persisted "session" record).
It is cleared - so the next `Start` opens a fresh session - when the admin
presses **Finish league** (shown when a session exists and no slot is live).

Known gap: switching the mode toggle back to **Single** without pressing
**Finish league** leaves `sessionId` set for that component instance; the next
navigation away and back re-creates the component clean. Wiring **Finish league**
into the toggle is a small follow-up.

Past standings stay viewable in the `home/matches/league` tab, which is
session-agnostic - it groups **all completed `mode:'league'` matches by day** and
shows the table for the selected date.

### End one, other still live - summary

| State after ending slot 1 | Behaviour |
| --- | --- |
| Slot 2 live | Nav locked, toggle disabled, slot 1 teams back on bench, board editable for slot 1 |
| Slot 2 also idle | Nav unlocked, toggle enabled, **Finish league** available, standings show both results |

---

## Refresh mid-session - not restored

League state (`assignments`, `sessionId`, the two timers, `liveMatches`) lives
only in memory. **Reloading the page mid-game abandons the on-screen session.**
The live match docs stay `status: 'live'` in Firestore but nothing reads them
back, so they are effectively orphaned (harmless - `completeGame` / stats ignore
non-completed matches).

A `matches`-driven rehydration was built (each live league match carries `slot`,
`sessionId`, `teamKeys`, `startedAt`) and then removed - it auto-adopted stale
`live` matches from earlier and blocked `Start`, and the value didn't justify the
complexity. If it comes back later, drive it entirely from the live match docs;
do **not** add a separate collection.

---

## Navigation lock

- Lock on the **first** game start (`navigationService.lockNavigation()`).
- Unlock only when `hasAnyLiveMatch()` is false (last game ended or both reset).
- `exitFormGuard` on the route already prompts on navigation away.

---

## Statistics impact

**None to the computation.** `ComputedStatisticsService` already:

- keys by `match.createdAt` date -> both games land on the same day,
- sums `player_goal` events and win/loss/draw per completed match,
- so two league matches contribute exactly like two sequential single matches.

The only requirement is the **disjoint-players rule** (already true) so nobody is
counted twice for the day.

---

## Risks & edge cases

| Risk | Mitigation |
| --- | --- |
| Refresh mid-session | Not handled - the on-screen session is abandoned (see **Refresh mid-session - not restored**). Orphaned `live` match docs are ignored by stats/standings. |
| A team moved between slots after its game started | Slot selector disabled once that slot is live (`lockedTeamKeys`). |
| One game reset while the other is live | `abandonLiveMatchOnReset(slot)` only touches that slot; nav stays locked for the other. |
| `endGame` unlocking nav / fantasy while another game still live | Guard both behind `!hasAnyLiveMatch()`. |
| `liveMatchId` (single) consumers break | Update the 3 callers, or alias `liveMatchIdFor(1)` during transition. |
| Same player accidentally on both games' teams | Validation before start: reject if `slotTeams(1)` and `slotTeams(2)` share any playerId. |
| League table shows stale/other-day matches | Filter strictly by `sessionId`. |
| Switching mode mid-session would split live state across modes | Toggle disabled whenever `matchEvents.liveMode() != null`; re-enabled only when no game is live. |
| Switching to League drops a half-built single-mode team layout | Toggle only allowed with no live game; team assignments (`playingTeams` / `teamSlots`) reset on switch, drag-drop rosters are kept. Confirm-prompt if the other mode had picks. |
| `numberOfTeams` is set on select-group, not the game screen | Entering League mode calls `playersService.setNumberOfTeams(4)`; leaving it restores the previous value. |

---

## Phased implementation plan

### Phase 1 - Service layer (no UI)
1. Add optional `mode/sessionId/slot/round` to `MatchRecord`.
2. `MatchEventsManagerService`: `liveMatchId` -> `liveMatches` map + `slot` args
   on the 4 methods; `hasAnyLiveMatch`; `liveMode`. Update the 3 current callers.
3. `GameService.endGame(teams, slot)`; guard nav/fantasy on `hasAnyLiveMatch`.
4. Unit tests: two independent matches, goals routed by slot, end one leaves the
   other live.

### Phase 2 - Drag-drop table opt-in league inputs
5. Add `teamSlots` / `teamSlotChange` / `matchIdByTeam` / `lockedTeamKeys`.
6. Segmented slot control; per-team lock; per-team goal enablement.
7. Verify existing single-mode usage unchanged.

### Phase 3 - Mode toggle + League view
8. Extract the current Game markup into `SingleGameComponent`; `GameComponent`
   becomes toggle + `@if` switch. Persist choice in `localStorage`
   (`gameMode-{groupId}`); disable toggle while `liveMode()` is set. No new route.
9. `LeagueGameComponent` (embedded, not routed) + `LeagueGameService`
   (assignments, `sessionId`, start/end/reset per slot - all derived from
   `matches`, no extra collection).
10. `LeagueGamePanelComponent` x2, each owning a `StopwatchComponent`
    (`panel.stopwatch()`); `activeSlot` signal; live score + scorer feed from an
    `rxResource` over the slot's match events. (Sticky status-bar / phase layout
    still deferred.)
11. `numberOfTeams = 4` on entering League mode, restore on leaving; disjoint-
    players validation before start.
12. Per-slot end-game flow (`LeagueGameService.endGame(slot)` -> slot-scoped
    `GameService.endGame` / `endGameAndPersist`); global guards behind
    `!hasAnyLiveMatch()`; freed-slot re-use; **Finish league** action.
    (Finalising the session on mode-toggle-back still deferred.)
13. ~~Refresh rehydration~~ - built then removed; League state is in-memory only.

### Phase 4 - League table
14. `computeStandings(matches[])` util (caller pre-filters) + presentational
    `LeagueStandingsComponent`.
15. League view: `LeagueGameService.standings` = the running session's matches
    (`sessionId`). `home/matches/league` tab (`LeagueTableComponent`, no admin
    guard): Timeline-style **date selector**, table for all `mode:'league'`
    completed matches on the selected day.

### Phase 5 (v2, later)
- Round progression: after both slots end, propose next pairings; full
  round-robin schedule generator for 4 teams (3 rounds x 2 games).
- Persist pause/resume gaps so a paused timer survives refresh accurately.
- Reveal snapshot grouped by game.
- More than 2 concurrent slots.

---

_All design questions resolved (see **Decisions (v1)** near the top). This
document is final for v1._

# Teams — project conventions

Angular (standalone components, signals, new control flow `@if`/`@for`) + Firebase (Firestore, Auth).
Shared UI lives in the `ui` library (`PopupsService`, `LandingPageComponent`, ...).

## Feature structure: component + service + api service

Every page follows the same three-layer split (see `create-group/`, `manage-group/`, `fantasy/manage-fantasy-meta`):

- `<feature>.component.ts` — **as clean as possible.** Injects only its page service and exposes it to
  the template (`protected <feature>Service = inject(<Feature>Service)`). No logic, no other services
  (not even `PlayersService` — wrap what the template needs, e.g. URLs, in the page service).
- `<feature>.service.ts` — `@Injectable()` (no `providedIn`), listed in the component's `providers: [...]`.
  Holds all page state (signals/computed), validation, and actions, and delegates pure logic to utils
  (see **Utils**). Injects `PlayersService`, `PopupsService`, the api service, etc.
- `<feature>-api.service.ts` — `@Injectable({ providedIn: 'root' })`. Only Firestore calls, no state,
  no popups. Keep a feature's Firestore calls in its own api service instead of adding to unrelated ones.

Templates call the service directly: `manageGroupService.addAdmin()`, `manageGroupService.admins()`.

## Writes: use the optimistic helpers, not hand-written try/catch

`src/app/shared/optimistic/run-optimistic.ts` already handles errors — don't wrap writes in try/catch
or add `saving` flags yourself.

- `runOptimistic({ apply, rollback, commit, onError })` — update the signal immediately, commit to
  Firestore, roll back + show an error popup on failure. Use for edits whose result shows instantly
  (lists, chips, aliases, colors). Examples: `PlayersService.setTeamAlias`, `ManageGroupService`.
- `createMutation({ run, onSuccess, onError })` — for save-then-react actions (navigate, success popup);
  gives a `pending` signal for disabling buttons. Example: `ManageFantasyMetaService.saveMeta`.

Error messages say what happened, e.g. `Could not update team name, so it was changed back.`
No success popup is needed when the UI change itself is the feedback.

## Group context

- Current group is `PlayersService.selectedGroup()` (`admins`, `members`, `createdBy`, ...). After a
  write that changes the group doc, update `selectedGroup` and reset `playersService.userGroups.set(null)`
  so the group picker refetches.
- Build in-group links with `playersService.groupUrl('segment')` → `/home/<groupId>/segment`.
- Admin-only routes use `groupAdminGuard`; admin-only nav tabs are in `main-page.component.ts`
  (`headerNavItems`, `show: ... && isAdmin()`).

## Templates

- No nested `@if` blocks. Combine the conditions into one service `computed`
  (e.g. `showRemove = computed(() => isAdmin() && !isOwner())`) or use flat `@if / @else if / @else`.
- No `@let` in templates. Put derived values in the service as `computed` signals and read them
  directly (`manageGroupService.admins()`).

## Utils

- Keep services thin: put pure calculations and transformations (no signals, no injection, no Firestore)
  in feature util files, e.g. `statistics/utils/performance.util.ts`, `statistics/utils/player-insights.util.ts`.
  The service calls the util and holds the state; the util is easy to unit-test.

## Naming

- Use clear, descriptive names that say what a thing is or does (`selectedPlayers`, `canRemoveAdmin`,
  `buildLeaderboard`). Avoid abbreviations and generic names like `data`, `item`, `tmp`, `res`.

## Style

Prefer plain, simple code — an `@if` over a clever abstraction. Lazy-load new routes with `loadComponent`.
Verify with `npx ng build --configuration development`.

# Player Notes Sync (Text Pad)

**Date:** 2026-05-23
**Status:** Approved

## Problem

Players need a text pad, synced with their character data, to record decisions that
persist across sessions: spells chosen on level-up, special abilities kept at creation,
and other notes. The data model already supports this — `Character.notes: string` exists,
is displayed/editable in `character-sheet.tsx`, persists in the session store's
localStorage, and rides along in `PlayerVisibleState.myCharacter`.

The wiring is broken in one place: the player **sends** a `player_character_update`
message on notes change, but the **GM never handles it**. The GM message dispatch in
`src/routes/gm/session.$sessionId.tsx` has handlers for `player_chat`, `player_roll`,
`player_inventory`, … `player_level_up`, but **no case for `player_character_update`**.
So player notes never reach the authoritative character state and never sync back or
persist. A secondary issue: an unthrottled send fires on every keystroke, and an incoming
state-sync can clobber the textarea while the player is typing.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Fix sync of the existing single freeform `notes` field — no schema change, no multi-section pad |
| GM authority | Notes are applied to authoritative state by the GM, then re-broadcast (consistent with the rest of the P2P model) |
| Send cadence | Debounce player sends (~500ms after typing stops) |
| Typing protection | Local draft; adopt incoming synced value only when the field is not focused/dirty |
| Visibility | Notes remain part of `myCharacter` (player sees own notes; GM sees them on the sheet) |

## Architecture

### GM handler — `src/routes/gm/session.$sessionId.tsx`

Add a case to the player-message dispatch, mirroring the existing `player_level_up`
handler:

```typescript
if (message.type === 'player_character_update') {
  const msg = message as PlayerCharacterUpdate
  const char = useSessionStore.getState().session?.characters[msg.characterId]
  if (!char) return
  updateCharacter(msg.characterId, (c) => {
    if (msg.updates.notes !== undefined) c.notes = msg.updates.notes
  })
  setTimeout(() => broadcastStateSyncRef.current(), 50)
}
```

`updateCharacter` already persists via the store's debounced localStorage save, so notes
survive reloads. `broadcastStateSync` re-sends `PlayerVisibleState` so other clients and
the player's own reconnect stay consistent.

### Debounced send — `src/routes/player/session.tsx`

The existing `onNotesChange` callback sends immediately. Wrap it in a ~500ms debounce so
a burst of keystrokes produces one message after the player pauses. Flush the pending
debounce on blur and on unmount so no edit is lost.

### Typing protection — `src/components/character/character-sheet.tsx`

The notes `<textarea>` currently binds `value={c.notes}` directly. When the GM
re-broadcasts state mid-typing, that prop can overwrite in-progress input. Introduce a
local draft:

- Keep `const [draft, setDraft] = useState(c.notes)` for the notes field.
- Render `value={draft}`; on change, `setDraft(...)` and call `onNotesChange(...)`.
- Sync `draft` from `c.notes` **only when the textarea is not focused** (i.e. on an
  external update the player isn't actively editing). Use a focused-ref or `onFocus`/
  `onBlur` guard.

This keeps the field responsive and authoritative-but-non-destructive: the player's live
edits win while focused; external updates apply when idle.

## Test Strategy

### Tier 1: Unit — `src/lib/peer/__tests__/character-update.test.ts`

| Test | What it verifies |
|------|-----------------|
| Handler applies notes | A `player_character_update` with `notes` updates the character in the store |
| Unknown character id | Handler is a no-op, no throw |
| Other update fields ignored | Only `notes` is applied (current schema) |

(If the dispatch logic is inline in the route and hard to unit-test, extract a pure
`applyPlayerCharacterUpdate(state, msg)` reducer into `src/lib/peer/` and test that; the
route calls it. Prefer extraction — it makes the handler testable and matches the
"small, well-bounded units" guidance.)

### Tier 2: Component — `src/components/character/__tests__/notes-textarea.test.tsx`

| Test | What it verifies |
|------|-----------------|
| Debounced emit | Rapid typing emits one `onNotesChange` after the debounce window |
| Flush on blur | Pending edit is emitted on blur |
| No clobber while focused | An external `c.notes` change does not overwrite the draft while focused |
| Adopt while idle | An external `c.notes` change updates the field when not focused |

### Tier 3: E2E — extend the peer integration tests

Two-peer test (player + GM): player edits notes → GM character state receives the notes →
GM re-broadcast returns them → reload persists them.

## File Changes

### Modified Files
| Path | Change |
|------|--------|
| `src/routes/gm/session.$sessionId.tsx` | Add `player_character_update` dispatch case |
| `src/routes/player/session.tsx` | Debounce the notes send; flush on blur/unmount |
| `src/components/character/character-sheet.tsx` | Local draft + focus-guarded sync for notes textarea |

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/peer/apply-character-update.ts` | Pure reducer for `player_character_update` (extracted for testability) |
| `src/lib/peer/__tests__/character-update.test.ts` | Tier 1 |
| `src/components/character/__tests__/notes-textarea.test.tsx` | Tier 2 |

### Unchanged Files
| Path | Why |
|------|-----|
| `src/schemas/messages.ts` | `PlayerCharacterUpdate` already defined |
| `src/schemas/character.ts` | `notes` field already exists |
| `src/stores/session-store.ts` | `updateCharacter` + debounced persistence already exist |

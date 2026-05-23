import { describe, it, expect } from 'vitest'
import { initNotesDraft, notesDraftReducer } from '../notes-draft.ts'

describe('notesDraftReducer', () => {
  it('updates the draft as the player types', () => {
    let s = initNotesDraft('')
    s = notesDraftReducer(s, { type: 'type', value: 'Took Magic Missile' })
    expect(s.draft).toBe('Took Magic Missile')
  })

  it('adopts an external value when not focused', () => {
    let s = initNotesDraft('local')
    s = notesDraftReducer(s, { type: 'external', value: 'from server' })
    expect(s.draft).toBe('from server')
  })

  it('does not clobber in-progress typing while focused', () => {
    let s = initNotesDraft('')
    s = notesDraftReducer(s, { type: 'focus' })
    s = notesDraftReducer(s, { type: 'type', value: 'half-written th' })
    s = notesDraftReducer(s, { type: 'external', value: 'stale server value' })
    expect(s.draft).toBe('half-written th')
  })

  it('adopts the latest external value after blur', () => {
    let s = initNotesDraft('')
    s = notesDraftReducer(s, { type: 'focus' })
    s = notesDraftReducer(s, { type: 'type', value: 'mine' })
    s = notesDraftReducer(s, { type: 'external', value: 'server wins after blur' })
    s = notesDraftReducer(s, { type: 'blur' })
    expect(s.draft).toBe('server wins after blur')
  })

  it('keeps the draft on blur when no external update arrived', () => {
    let s = initNotesDraft('start')
    s = notesDraftReducer(s, { type: 'focus' })
    s = notesDraftReducer(s, { type: 'type', value: 'edited' })
    s = notesDraftReducer(s, { type: 'blur' })
    expect(s.draft).toBe('edited')
  })
})

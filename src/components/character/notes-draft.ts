export interface NotesDraftState {
  draft: string
  focused: boolean
  /** Latest external value seen while focused, applied on blur. */
  pending: string | null
}

export type NotesDraftEvent =
  | { type: 'external'; value: string }
  | { type: 'type'; value: string }
  | { type: 'focus' }
  | { type: 'blur' }

export function initNotesDraft(value: string): NotesDraftState {
  return { draft: value, focused: false, pending: null }
}

/**
 * Resolves how the notes draft responds to typing, focus, and external updates.
 * Live edits win while focused; external updates apply when idle or, if they
 * arrive mid-typing, are deferred until blur.
 */
export function notesDraftReducer(state: NotesDraftState, event: NotesDraftEvent): NotesDraftState {
  switch (event.type) {
    case 'type':
      return { ...state, draft: event.value }
    case 'external':
      return state.focused
        ? { ...state, pending: event.value }
        : { ...state, draft: event.value }
    case 'focus':
      return { ...state, focused: true }
    case 'blur':
      return state.pending !== null
        ? { ...state, focused: false, draft: state.pending, pending: null }
        : { ...state, focused: false }
    default:
      return state
  }
}

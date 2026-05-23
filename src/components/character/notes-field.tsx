import { useEffect, useReducer } from 'react'
import { initNotesDraft, notesDraftReducer } from './notes-draft.ts'

interface NotesFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * A textarea whose live edits win while focused. External updates (e.g. a state
 * sync echoed back from the GM) are adopted only when the field is idle — or
 * deferred until blur if they arrive mid-typing — so they never clobber what the
 * player is actively writing. Behavior is defined by {@link notesDraftReducer}.
 */
export function NotesField({ value, onChange, disabled, placeholder, className }: NotesFieldProps) {
  const [state, dispatch] = useReducer(notesDraftReducer, value, initNotesDraft)

  useEffect(() => {
    dispatch({ type: 'external', value })
  }, [value])

  return (
    <textarea
      value={state.draft}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onFocus={() => dispatch({ type: 'focus' })}
      onBlur={() => dispatch({ type: 'blur' })}
      onChange={e => {
        dispatch({ type: 'type', value: e.target.value })
        onChange(e.target.value)
      }}
    />
  )
}

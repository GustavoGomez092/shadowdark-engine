import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import type { Character } from '@/schemas/character.ts'
import { parseCharacterImport } from '@/lib/character/import.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface CharacterImportButtonProps {
  onImported: (character: Character) => void
  label?: string
  className?: string
}

/**
 * A button that reads a character `.json` file, validates and normalizes it via
 * {@link parseCharacterImport}, and hands the resulting character to the parent.
 * Unresolved-reference warnings are shown inline; hard errors block the import.
 */
export function CharacterImportButton({ onImported, label, className }: CharacterImportButtonProps) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[] | null>(null)
  const [warnings, setWarnings] = useState<string[] | null>(null)

  function handleFile(file: File) {
    setErrors(null)
    setWarnings(null)
    const reader = new FileReader()
    reader.onload = () => {
      let json: unknown
      try {
        json = JSON.parse(String(reader.result))
      } catch {
        setErrors([`${t('character.importInvalid')}: invalid JSON`])
        return
      }
      const result = parseCharacterImport(json)
      if (result.valid && result.character) {
        if (result.warnings?.length) setWarnings(result.warnings)
        onImported(result.character)
      } else {
        setErrors(result.errors ?? [t('character.importInvalid')])
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = '' // allow re-importing the same file
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={className ?? 'flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50 transition'}
      >
        <Upload className="h-4 w-4" />
        {label ?? t('character.import')}
      </button>

      {errors && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
      {warnings && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <div className="font-semibold">{t('character.importWarnings')}</div>
          {warnings.map((w, i) => <div key={i}>{w}</div>)}
        </div>
      )}
    </div>
  )
}

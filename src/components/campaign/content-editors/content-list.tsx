import { useState } from 'react'
import { useLocale } from '@/hooks/use-locale.ts'

interface ContentListProps<T extends { id: string; name: string }> {
  items: T[]
  typeName: string
  onAdd: () => void
  onEdit: (item: T) => void
  onDelete: (id: string) => void
  renderSummary?: (item: T) => React.ReactNode
}

export function ContentList<T extends { id: string; name: string }>({
  items,
  typeName,
  onAdd,
  onEdit,
  onDelete,
  renderSummary,
}: ContentListProps<T>) {
  const { t } = useLocale()
  const [search, setSearch] = useState('')

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <input
          type="text"
          placeholder={`Search ${typeName}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-64"
        />
        <button
          onClick={onAdd}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          + {t('common.new')} {typeName}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">
            {items.length === 0 ? `No ${typeName.toLowerCase()}s yet` : 'No matches'}
          </p>
          {items.length === 0 && (
            <button
              onClick={onAdd}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Create First {typeName}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-border/80 transition cursor-pointer"
              onClick={() => onEdit(item)}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{item.name || `Unnamed ${typeName}`}</p>
                {renderSummary && (
                  <div className="text-xs text-muted-foreground mt-0.5">{renderSummary(item)}</div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 ml-3">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                  className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {items.length} {typeName.toLowerCase()}{items.length !== 1 ? 's' : ''} total
      </p>
    </div>
  )
}

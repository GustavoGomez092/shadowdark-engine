import type { PublicMonsterInfo } from '@/schemas/session.ts'
import type { Character } from '@/schemas/character.ts'

interface Props {
  monsters: PublicMonsterInfo[]
  myCharacter: Character | null
  otherCharacters: { id: string; name: string; class: string; level: number; hpStatus: string }[]
  activeTurnId: string | null
}

export function EncounterView({ monsters, myCharacter, otherCharacters, activeTurnId }: Props) {
  if (monsters.length === 0) return null

  // Resolve who has active turn
  const activeTurnMonster = activeTurnId ? monsters.find(m => m.id === activeTurnId) : null
  const activeTurnIsMe = activeTurnId && myCharacter ? activeTurnId === myCharacter.id : false
  const activeTurnOther = activeTurnId ? otherCharacters.find(c => c.id === activeTurnId) : null
  const activeTurnName = activeTurnMonster?.name ?? (activeTurnIsMe ? `${myCharacter!.name} (You!)` : activeTurnOther?.name) ?? null
  const isMonsterTurn = !!activeTurnMonster

  return (
    <div className="rounded-xl border border-red-500/20 bg-card p-4">
      {/* Active Turn Banner */}
      {activeTurnName && (
        <div className={`mb-3 rounded-lg p-2.5 text-center ${
          activeTurnIsMe ? 'bg-amber-500/15 border border-amber-500/30 animate-pulse' :
          isMonsterTurn ? 'bg-red-500/10 border border-red-500/20' :
          'bg-primary/10 border border-primary/20'
        }`}>
          <span className={`text-[10px] font-bold uppercase ${
            activeTurnIsMe ? 'text-amber-400' : isMonsterTurn ? 'text-red-400' : 'text-primary'
          }`}>
            Active Turn
          </span>
          <span className="ml-2 font-semibold">{activeTurnName}</span>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase animate-pulse">
          Encounter
        </span>
        <span className="text-sm text-muted-foreground">{monsters.length} threat{monsters.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Threats */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Threats</p>
          <div className="space-y-1.5">
            {monsters.map(m => (
              <div key={m.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className={`text-xs font-bold capitalize ${
                    m.hpStatus === 'healthy' ? 'text-red-400' :
                    m.hpStatus === 'wounded' ? 'text-amber-400' :
                    m.hpStatus === 'critical' ? 'text-green-400' :
                    'text-muted-foreground'
                  }`}>
                    {m.hpStatus}
                  </span>
                </div>
                {m.conditions.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {m.conditions.map(c => (
                      <span key={c.id} className="rounded bg-red-500/20 px-1 py-0.5 text-[9px] text-red-400 capitalize">{c.condition}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Party status */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your Party</p>
          <div className="space-y-1.5">
            {myCharacter && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-primary">{myCharacter.name} (You)</span>
                  <span className="text-xs text-muted-foreground">AC {myCharacter.computed.ac}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xs font-bold ${
                    myCharacter.currentHp > myCharacter.maxHp * 0.5 ? 'text-green-400' :
                    myCharacter.currentHp > myCharacter.maxHp * 0.25 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    HP {myCharacter.currentHp}/{myCharacter.maxHp}
                  </span>
                  <div className="flex-1 h-1 rounded-full bg-secondary">
                    <div
                      className={`h-1 rounded-full transition-all ${
                        myCharacter.currentHp > myCharacter.maxHp * 0.5 ? 'bg-green-500' :
                        myCharacter.currentHp > myCharacter.maxHp * 0.25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${(myCharacter.currentHp / myCharacter.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            {otherCharacters.map(c => (
              <div key={c.id} className="rounded-lg border border-border/50 p-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">Lv{c.level} {c.class}</span>
                </div>
                <span className={`text-xs font-medium capitalize ${
                  c.hpStatus === 'healthy' ? 'text-green-400' :
                  c.hpStatus === 'wounded' ? 'text-amber-400' :
                  c.hpStatus === 'critical' ? 'text-red-400' :
                  c.hpStatus === 'dying' ? 'text-red-500 animate-pulse' : 'text-muted-foreground'
                }`}>
                  {c.hpStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

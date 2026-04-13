import { createFileRoute, Link } from '@tanstack/react-router'
import { useLocale } from '@/hooks/use-locale.ts'
import { LOCALE_LABELS } from '@/i18n/index.ts'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { t, locale, setLocale, availableLocales } = useLocale()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-10">
        <select
          value={locale}
          onChange={e => setLocale(e.target.value as any)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none"
        >
          {availableLocales.map(l => (
            <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
          ))}
        </select>
      </div>
      <h1 className="mb-8 text-4xl font-bold tracking-tight">{t('landing.title')}</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        {t('landing.description')}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs sm:flex-row sm:w-auto sm:max-w-none sm:gap-4">
        <Link
          to="/gm/create"
          className="rounded-lg bg-primary px-6 py-3 text-center text-primary-foreground font-semibold hover:opacity-90 transition"
        >
          {t('landing.createGame')}
        </Link>
        <Link
          to="/player/join"
          className="rounded-lg border border-border px-6 py-3 text-center font-semibold hover:bg-accent transition"
        >
          {t('landing.joinGame')}
        </Link>
        <Link
          to="/campaign"
          className="rounded-lg border border-primary/30 bg-primary/10 px-6 py-3 text-center font-semibold text-primary hover:bg-primary/20 transition"
        >
          {t('landing.createCampaign')}
        </Link>
        <Link
          to="/reference"
          className="rounded-lg border border-border px-6 py-3 text-center font-semibold hover:bg-accent transition"
        >
          {t('landing.reference')}
        </Link>
      </div>
    </main>
  )
}

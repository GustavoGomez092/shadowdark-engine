import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { RollToastContainer } from '@/components/shared/roll-toast.tsx'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ShadowDark Engine' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Outlet />
        <RollToastContainer />
        <Scripts />
      </body>
    </html>
  )
}

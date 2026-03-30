export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  }

  return (
    <div
      className={`animate-spin rounded-full border-muted-foreground/30 border-t-primary ${sizeClasses[size]} ${className}`}
    />
  )
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  )
}

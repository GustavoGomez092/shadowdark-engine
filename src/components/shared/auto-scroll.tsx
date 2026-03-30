import { useRef, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  deps?: unknown[]
}

export function AutoScrollContainer({ children, className = '', deps = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [children, ...deps])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

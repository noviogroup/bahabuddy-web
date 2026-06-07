import BahaPageLoader from './BahaPageLoader'

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export interface PageLoadingProps {
  /** Optional caption below the spinner. */
  label?: string
  className?: string
  /** Minimum height of the loading region. */
  minHeight?: string
}

/**
 * Centered full-region loading state — use in `loading.tsx` files and
 * suspense fallbacks while route segments load.
 */
export default function PageLoading({
  label,
  className,
  minHeight = 'min-h-[50vh]',
}: PageLoadingProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 px-4', minHeight, className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <BahaPageLoader />
      {label ? <p className="text-sm font-medium text-grey">{label}</p> : null}
    </div>
  )
}

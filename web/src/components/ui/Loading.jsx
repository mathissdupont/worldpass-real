// web/src/components/ui/Loading.jsx
// Reusable Loading components (spinners and skeletons)

/**
 * Spinner component for loading states
 * @param {Object} props
 * @param {'sm' | 'md' | 'lg'} props.size - Spinner size
 * @param {string} props.className - Additional CSS classes
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 1-9 9" strokeWidth="3" />
    </svg>
  );
}

/**
 * Full page loading component
 */
export function PageLoader({ message }) {
  return (
    <div className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)] flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--brand)]" />
      {message && (
        <p className="text-sm text-[color:var(--muted)] animate-pulse">{message}</p>
      )}
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 * @param {Object} props
 * @param {'text' | 'circle' | 'rect'} props.variant - Skeleton shape
 * @param {string} props.className - Additional CSS classes
 */
export function Skeleton({ variant = 'text', className = '' }) {
  const baseClasses = `
    animate-pulse bg-[color:var(--panel-2)] 
  `.replace(/\s+/g, ' ').trim();

  const variantClasses = {
    text: 'h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
  };

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return <div className={combinedClasses} aria-hidden="true" />;
}

/**
 * Card skeleton for loading states
 */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-6 space-y-4">
      <Skeleton className="w-32 h-6" />
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-3/4 h-4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="w-20 h-9 rounded-xl" />
        <Skeleton className="w-20 h-9 rounded-xl" />
      </div>
    </div>
  );
}

export default Spinner;

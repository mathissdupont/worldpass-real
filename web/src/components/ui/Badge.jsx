// web/src/components/ui/Badge.jsx
// Reusable Badge component for status indicators

/**
 * Badge component for status and labels
 * @param {Object} props
 * @param {React.ReactNode} props.children - Badge content
 * @param {'success' | 'warning' | 'danger' | 'info' | 'neutral'} props.variant - Badge color variant
 * @param {'sm' | 'md' | 'lg'} props.size - Badge size
 * @param {string} props.className - Additional CSS classes
 */
export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) {
  const baseClasses = `
    inline-flex items-center gap-1.5 
    rounded-full border font-medium
    transition-colors duration-200
  `.replace(/\s+/g, ' ').trim();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const variantClasses = {
    success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-400',
    warning: 'border-amber-400/40 bg-amber-500/10 text-amber-400',
    danger: 'border-rose-400/40 bg-rose-500/10 text-rose-400',
    info: 'border-blue-400/40 bg-blue-500/10 text-blue-400',
    neutral: 'border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)]',
  };

  const combinedClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  );
}

/**
 * Pill variant with dot indicator
 */
export function Pill({
  children,
  variant = 'neutral',
  showDot = true,
  className = '',
}) {
  const variantClasses = {
    success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-400',
    warning: 'border-amber-400/40 bg-amber-500/10 text-amber-400',
    danger: 'border-rose-400/40 bg-rose-500/10 text-rose-400',
    info: 'border-blue-400/40 bg-blue-500/10 text-blue-400',
    neutral: 'border-[color:var(--border)] bg-[color:var(--panel-2)] text-[color:var(--muted)]',
  };

  const dotColors = {
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-blue-400',
    neutral: 'bg-[color:var(--muted)]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${variantClasses[variant]} ${className}`}>
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

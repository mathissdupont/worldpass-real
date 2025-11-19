// web/src/components/ui/Button.jsx
// Reusable Button component with consistent styling across the app

import { forwardRef } from 'react';

/**
 * Button component with multiple variants and sizes
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'} props.variant - Button style variant
 * @param {'sm' | 'md' | 'lg'} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler
 * @param {'button' | 'submit' | 'reset'} props.type - Button type
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
  title,
  ...props
}, ref) => {
  // Base classes - always applied
  const baseClasses = `
    inline-flex items-center justify-center gap-2 
    rounded-xl font-medium 
    transition-all duration-200 
    disabled:opacity-50 disabled:cursor-not-allowed 
    active:scale-[0.98]
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--brand-2)]
  `.replace(/\s+/g, ' ').trim();

  // Size variants
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Style variants
  const variantClasses = {
    primary: `
      bg-[color:var(--brand)] text-white 
      shadow-md hover:shadow-lg 
      hover:bg-[color:var(--brand)]/90
    `.replace(/\s+/g, ' ').trim(),
    
    secondary: `
      bg-[color:var(--panel-2)] 
      border border-[color:var(--border)] 
      text-[color:var(--text)] 
      hover:bg-[color:var(--panel)] 
      hover:border-[color:var(--brand-2)]
    `.replace(/\s+/g, ' ').trim(),
    
    ghost: `
      bg-transparent 
      text-[color:var(--muted)] 
      hover:text-[color:var(--text)] 
      hover:bg-[color:var(--panel-2)]
    `.replace(/\s+/g, ' ').trim(),
    
    outline: `
      border-2 border-[color:var(--border)] 
      hover:border-[color:var(--brand)] 
      text-[color:var(--muted)] 
      hover:text-[color:var(--brand)] 
      bg-transparent
    `.replace(/\s+/g, ' ').trim(),
    
    danger: `
      bg-[color:var(--danger)] text-white 
      shadow-md hover:shadow-lg 
      hover:bg-[color:var(--danger)]/90
    `.replace(/\s+/g, ' ').trim(),
  };

  const combinedClasses = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClasses}
      title={title}
      {...props}
    >
      {loading && (
        <svg 
          className="animate-spin h-4 w-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" opacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 1-9 9" strokeWidth="3" />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

// web/src/components/ui/Input.jsx
// Reusable Input component with validation states

import { forwardRef } from 'react';

/**
 * Input component with consistent styling and validation
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.error - Error message
 * @param {string} props.hint - Helper text
 * @param {boolean} props.required - Required field
 * @param {string} props.className - Additional CSS classes
 * @param {'text' | 'email' | 'password' | 'number' | 'tel' | 'url'} props.type - Input type
 */
const Input = forwardRef(({
  label,
  error,
  hint,
  required = false,
  className = '',
  type = 'text',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  
  const inputClasses = `
    w-full px-3 py-2.5 rounded-xl 
    border bg-[color:var(--panel)] text-[color:var(--text)] 
    transition-all duration-200
    placeholder:text-[color:var(--muted)]/50
    focus:outline-none focus:ring-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-[color:var(--danger)] focus:ring-[color:var(--danger)]/20 focus:border-[color:var(--danger)]' 
      : 'border-[color:var(--border)] focus:ring-[color:var(--brand-2)]/20 focus:border-[color:var(--brand-2)]'
    }
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-[color:var(--text)] mb-1.5"
        >
          {label}
          {required && <span className="text-[color:var(--danger)] ml-1" aria-label="required">*</span>}
        </label>
      )}
      
      <input
        ref={ref}
        id={inputId}
        type={type}
        className={inputClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      
      {hint && !error && (
        <p 
          id={`${inputId}-hint`}
          className="mt-1.5 text-xs text-[color:var(--muted)]"
        >
          {hint}
        </p>
      )}
      
      {error && (
        <p 
          id={`${inputId}-error`}
          className="mt-1.5 text-xs text-[color:var(--danger)] flex items-center gap-1"
          role="alert"
        >
          <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

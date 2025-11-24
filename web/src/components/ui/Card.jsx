// web/src/components/ui/Card.jsx
// Reusable Card component with consistent styling

/**
 * Card component for content sections
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.action - Action buttons/links
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.hoverable - Enable hover effect
 */
export default function Card({
  children,
  title,
  action,
  className = '',
  hoverable = false,
}) {
  const cardClasses = `
    rounded-2xl border border-[color:var(--border)] 
    bg-[color:var(--panel)] shadow-sm
    transition-all duration-200
    ${hoverable ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className={cardClasses}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-[color:var(--border)]">
          {title && (
            <h3 className="text-lg font-semibold text-[color:var(--text)]">
              {title}
            </h3>
          )}
          {action && (
            <div className="flex items-center gap-2">
              {action}
            </div>
          )}
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

/**
 * Simple card variant without header
 */
export function SimpleCard({ children, className = '', hoverable = false }) {
  const cardClasses = `
    rounded-2xl border border-[color:var(--border)] 
    bg-[color:var(--panel)] shadow-sm p-4
    transition-all duration-200
    ${hoverable ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
}

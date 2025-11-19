// web/src/components/ui/Section.jsx
// Reusable Section component for consistent page layouts

/**
 * Section component for page content organization
 * @param {Object} props
 * @param {React.ReactNode} props.children - Section content
 * @param {string} props.title - Section title
 * @param {string} props.description - Section description
 * @param {React.ReactNode} props.icon - Section icon
 * @param {React.ReactNode} props.action - Action buttons
 * @param {string} props.className - Additional CSS classes
 */
export default function Section({
  children,
  title,
  description,
  icon,
  action,
  className = '',
}) {
  const sectionClasses = `
    rounded-2xl border border-[color:var(--border)] 
    bg-[color:var(--panel)] shadow-sm p-6
    animate-in fade-in slide-in-from-bottom-2 duration-300
    hover:shadow-md transition-shadow duration-300
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <section className={sectionClasses}>
      {(title || description || icon || action) && (
        <div className="mb-6">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center transition-transform duration-300 hover:scale-110">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-[color:var(--text)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-[color:var(--muted)] mt-1">
                  {description}
                </p>
              )}
            </div>
            {action && (
              <div className="flex-shrink-0 flex items-center gap-2">
                {action}
              </div>
            )}
          </div>
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

/**
 * Simple section without header
 */
export function SimpleSection({ children, className = '' }) {
  const sectionClasses = `
    rounded-2xl border border-[color:var(--border)] 
    bg-[color:var(--panel)] shadow-sm p-4
    ${className}
  `.replace(/\s+/g, ' ').trim();

  return (
    <section className={sectionClasses}>
      {children}
    </section>
  );
}

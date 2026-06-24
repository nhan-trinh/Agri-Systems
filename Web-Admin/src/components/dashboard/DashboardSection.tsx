import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DashboardSectionProps {
  /** Optional section title shown in the header row. */
  title?: string;
  /** Optional icon rendered before the title. */
  icon?: LucideIcon;
  /** Right-aligned slot for actions (refresh button, year selector, etc.). */
  action?: ReactNode;
  /** Extra classes applied to the card (e.g. grid spans). */
  className?: string;
  /** Extra classes applied to the body padding container. */
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Reusable dashboard card / section wrapper.
 * Renders the standard surface (bg-white rounded-2xl border shadow-sm) with an
 * optional header row (icon + title + right-aligned action), keeping card
 * styling consistent across the dashboard instead of inline class strings.
 */
export function DashboardSection({
  title,
  icon: Icon,
  action,
  className,
  bodyClassName,
  children,
}: DashboardSectionProps) {
  return (
    <section
      className={cn(
        'bg-white rounded-2xl border border-[#e6ebe3] shadow-sm flex flex-col',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          {title && (
            <h3 className="font-serif text-sm font-bold text-stone-700 flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4 text-[#1b4332]" />}
              {title}
            </h3>
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-5 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

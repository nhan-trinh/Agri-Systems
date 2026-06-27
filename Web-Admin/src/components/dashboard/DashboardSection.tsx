import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DashboardSectionProps {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

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
        'bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col',
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-7 pt-6 pb-3">
          {title && (
            <h3 className="text-[13px] font-semibold text-stone-600 flex items-center gap-2.5 tracking-wide uppercase">
              {Icon && (
                <span className="text-emerald-600/70">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
              )}
              {title}
            </h3>
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('px-7 pb-7 flex-1', bodyClassName)}>{children}</div>
    </section>
  );
}

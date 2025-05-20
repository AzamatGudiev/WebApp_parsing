import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  icon?: LucideIcon;
  className?: string;
  iconClassName?: string;
  description?: string;
}

export function PageHeader({ title, description, icon: Icon, className, iconClassName }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-center space-x-3">
        {Icon && <Icon className={cn("h-8 w-8 text-primary", iconClassName)} />}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      </div>
      {description && (
        <p className="mt-1 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

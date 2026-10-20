import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

export function Spinner({ size = 'md', className, ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className={cn('inline-flex items-center justify-center text-primary', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export default Spinner;

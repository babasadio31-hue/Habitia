import React, { InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react';
import ReactDOM from 'react-dom/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// UTILS
export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// CARD
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ className, hoverEffect = false, children, ...props }) => {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-premium transition-all duration-200",
        hoverEffect && "hover:shadow-premium-hover hover:border-primary-100 dark:hover:border-primary-900/40 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// BUTTON
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
        // Variants
        variant === 'primary' && "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md shadow-primary-500/10",
        variant === 'secondary' && "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50",
        variant === 'success' && "bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white shadow-md shadow-success-500/10",
        variant === 'danger' && "bg-gradient-to-r from-danger-500 to-danger-600 hover:from-danger-600 hover:to-danger-700 text-white shadow-md shadow-danger-500/10",
        variant === 'ghost' && "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300",
        // Sizes
        size === 'sm' && "px-3 py-1.5 text-xs",
        size === 'md' && "px-4 py-2 text-sm",
        size === 'lg' && "px-6 py-3 text-base",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// INPUT
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            "w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all",
            error && "border-danger-500 focus:ring-danger-500/20 focus:border-danger-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-danger-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// SELECT
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          className={cn(
            "w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer",
            error && "border-danger-500 focus:ring-danger-500/20",
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-danger-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// BADGE
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'primary',
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        variant === 'primary' && "bg-primary-50 text-primary-500 border-primary-100 dark:bg-primary-950/20 dark:text-primary-400 dark:border-primary-900/30",
        variant === 'success' && "bg-success-50 text-success-500 border-success-100 dark:bg-success-950/20 dark:text-success-400 dark:border-success-900/30",
        variant === 'warning' && "bg-warning-50 text-warning-500 border-warning-100 dark:bg-warning-950/20 dark:text-warning-400 dark:border-warning-900/30",
        variant === 'danger' && "bg-danger-50 text-danger-500 border-danger-100 dark:bg-danger-950/20 dark:text-danger-400 dark:border-danger-900/30",
        variant === 'neutral' && "bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// TABLE
export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  headers: string[];
}

export const Table: React.FC<TableProps> = ({ className, headers, children, ...props }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-premium">
      <table className={cn("w-full text-left border-collapse", className)} {...props}>
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/80">
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {children}
        </tbody>
      </table>
    </div>
  );
};

// MODAL
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Content Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden animate-fade-in z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="py-4 overflow-y-auto flex-1 min-h-0 pr-1">
          {children}
        </div>
      </div>
    </div>
  );
};

// EMPTY STATE
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = "🔍",
  ctaText,
  onCtaClick
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-premium">
      <div className="text-4xl mb-4 animate-bounce">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mb-6">{description}</p>
      {ctaText && onCtaClick && (
        <Button onClick={onCtaClick} variant="primary">
          {ctaText}
        </Button>
      )}
    </div>
  );
};

// CUSTOM CONFIRM MODAL ON-THE-FLY
export const customConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    const cleanup = (result: boolean) => {
      resolve(result);
      setTimeout(() => {
        root.unmount();
        container.remove();
      }, 300);
    };

    const ConfirmDialog = () => {
      const [isOpen, setIsOpen] = React.useState(true);

      const handleConfirm = () => {
        setIsOpen(false);
        cleanup(true);
      };

      const handleCancel = () => {
        setIsOpen(false);
        cleanup(false);
      };

      return (
        <Modal isOpen={isOpen} onClose={handleCancel} title="Confirmation requise">
          <div className="space-y-5 text-left">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {message}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={handleCancel}>
                Annuler
              </Button>
              <Button variant="danger" type="button" onClick={handleConfirm}>
                Confirmer
              </Button>
            </div>
          </div>
        </Modal>
      );
    };

    root.render(<ConfirmDialog />);
  });
};

// SKELETON
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  ...props
}) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200 dark:bg-slate-700",
        variant === 'text' && "h-4 w-full rounded",
        variant === 'rect' && "rounded-xl",
        variant === 'circle' && "rounded-full",
        className
      )}
      {...props}
    />
  );
};

// TABLE SKELETON
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-premium p-5 space-y-4">
      <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 items-center py-2.5">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

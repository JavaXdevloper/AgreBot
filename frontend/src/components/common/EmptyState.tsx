import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

export default EmptyState;

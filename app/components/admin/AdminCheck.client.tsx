import { getNutIsAdmin } from '~/lib/replay/Problems.client';

interface AdminCheckProps {
  children: React.ReactNode;
}

export function AdminCheck({ children }: AdminCheckProps) {
  if (!getNutIsAdmin()) {
    return null;
  }
  
  return <>{children}</>;
} 
import { SessionContext } from './SessionContext.js';
import { useSession } from '../hooks/useSession';

export function SessionProvider({ children }) {
  const value = useSession();
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

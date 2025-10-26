import { useContext } from 'react';
import { SessionContext } from '../context/SessionContext.js';

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}

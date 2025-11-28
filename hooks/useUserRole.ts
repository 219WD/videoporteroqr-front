// hooks/useUserRole.ts
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useUserRole() {
  const { user } = useContext(AuthContext);
  
  // Para debugging
  console.log('User role hook:', user?.role);
  
  return user?.role || 'guest';
}
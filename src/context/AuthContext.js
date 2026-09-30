import { createContext, useContext } from 'react'

/**
 * Session context plus the hook components use to read it.
 * Kept in a .js file so AuthProvider.jsx exports only a component and
 * fast refresh keeps working.
 */
export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }

  return context
}

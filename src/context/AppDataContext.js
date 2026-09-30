import { createContext, useContext } from 'react'

/**
 * Context object plus the single hook components use to read it.
 * Kept in a .js file so AppDataProvider.jsx can export only a
 * component and fast refresh keeps working.
 */
export const AppDataContext = createContext(null)

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData must be used inside <AppDataProvider>')
  }

  return context
}

import { createContext, useContext, useEffect } from 'react'
import { useBuilderStore } from '../store/builderStore'

export const DEFAULT_THEME = {
  primaryColor:   '#6366f1',
  secondaryColor: '#10b981',
  fontFamily:     '"Inter", system-ui, sans-serif',
  borderRadius:   '0.75rem',
  headingColor:   '#0f172a',
  bodyColor:      '#64748b',
  pageBg:         '#ffffff',
  darkBg:         '#0f172a',
}

export const ThemeContext = createContext(DEFAULT_THEME)
export const useTheme = () => useContext(ThemeContext)

// Extracts the first font name from a CSS font-family string
function extractFontName(fontFamily) {
  const match = fontFamily?.match(/"([^"]+)"/) || fontFamily?.match(/([^,]+)/)
  return match?.[1]?.trim() || 'Inter'
}

export function ThemeProvider({ children }) {
  const theme = useBuilderStore(s => s.schema.theme)

  // Dynamically load Google Font when font family changes
  useEffect(() => {
    const fontName = extractFontName(theme.fontFamily)
    const encoded = fontName.replace(/ /g, '+')
    const id = 'builder-theme-font'
    const existing = document.getElementById(id)
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap`
    document.head.appendChild(link)
    return () => { document.getElementById(id)?.remove() }
  }, [theme.fontFamily])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_LOCALE } from './languages'

// ── Locale dictionary lazy-loader ─────────────────────────────────────────────
// All JSON files are bundled at build time for instant, zero-network loads.
import en from '../locales/en.json'
import tg from '../locales/tg.json'
import es from '../locales/es.json'
import pt from '../locales/pt.json'
import fr from '../locales/fr.json'
import hi from '../locales/hi.json'
import ar from '../locales/ar.json'
import zh from '../locales/zh.json'
import de from '../locales/de.json'
import ja from '../locales/ja.json'
import am from '../locales/am.json'

const DICTS = { en, tg, es, pt, fr, hi, ar, zh, de, ja, am }

const STORAGE_KEY = 'zf_locale'

const I18nContext = createContext(null)

// ── Admin override store — allows runtime edits without touching JSON files ───
let ADMIN_OVERRIDES = {}
try {
  ADMIN_OVERRIDES = JSON.parse(localStorage.getItem('zf_locale_overrides') ?? '{}')
} catch {}

export function saveAdminOverride(locale, key, value) {
  if (!ADMIN_OVERRIDES[locale]) ADMIN_OVERRIDES[locale] = {}
  ADMIN_OVERRIDES[locale][key] = value
  localStorage.setItem('zf_locale_overrides', JSON.stringify(ADMIN_OVERRIDES))
}

export function resetAdminOverrides() {
  ADMIN_OVERRIDES = {}
  localStorage.removeItem('zf_locale_overrides')
}

export function exportLocaleJSON(locale) {
  const dict = { ...(DICTS[locale] ?? DICTS.en), ...(ADMIN_OVERRIDES[locale] ?? {}) }
  const blob = new Blob([JSON.stringify(dict, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${locale}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function getBaseDict(locale) {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE]
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOCALE
  )

  // Flip <html lang="..."> and text direction for RTL languages
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir  = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  const setLocale = useCallback((code) => {
    localStorage.setItem(STORAGE_KEY, code)
    setLocaleState(code)
  }, [])

  // t(key, vars?) — resolves key through: admin overrides → active locale → en → key itself
  const t = useCallback((key, vars) => {
    const override = ADMIN_OVERRIDES[locale]?.[key]
    const base     = override ?? DICTS[locale]?.[key] ?? DICTS[DEFAULT_LOCALE]?.[key] ?? key
    if (!vars) return base
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
      base
    )
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useTranslation must be used inside <I18nProvider>')
  return ctx
}

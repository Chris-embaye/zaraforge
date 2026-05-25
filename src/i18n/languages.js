// Ordered language registry — anchored entries always appear first in selectors.
// `anchor: true` pins Tigrinya and English above the divider.
export const LANGUAGES = [
  { code: 'tg', flag: '🇪🇷', native: 'ትግርኛ',           label: 'Tigrinya',   anchor: true },
  { code: 'en', flag: '🇺🇸', native: 'English (US)',    label: 'English',    anchor: true },
  // ── divider ──
  { code: 'es', flag: '🇪🇸', native: 'Español',         label: 'Spanish'   },
  { code: 'pt', flag: '🇧🇷', native: 'Português (BR)',  label: 'Portuguese' },
  { code: 'hi', flag: '🇮🇳', native: 'हिन्दी',           label: 'Hindi'     },
  { code: 'ar', flag: '🇸🇦', native: 'العربية',         label: 'Arabic'    },
  { code: 'fr', flag: '🇫🇷', native: 'Français',        label: 'French'    },
  { code: 'zh', flag: '🇨🇳', native: '中文 (简体)',       label: 'Chinese'   },
  { code: 'de', flag: '🇩🇪', native: 'Deutsch',         label: 'German'    },
  { code: 'ja', flag: '🇯🇵', native: '日本語',            label: 'Japanese'  },
  { code: 'ko', flag: '🇰🇷', native: '한국어',            label: 'Korean'    },
  { code: 'ru', flag: '🇷🇺', native: 'Русский',         label: 'Russian'   },
  { code: 'tr', flag: '🇹🇷', native: 'Türkçe',          label: 'Turkish'   },
  { code: 'it', flag: '🇮🇹', native: 'Italiano',        label: 'Italian'   },
  { code: 'nl', flag: '🇳🇱', native: 'Nederlands',      label: 'Dutch'     },
  { code: 'am', flag: '🇪🇹', native: 'አማርኛ',           label: 'Amharic'   },
  { code: 'so', flag: '🇸🇴', native: 'Soomaali',        label: 'Somali'    },
  { code: 'sw', flag: '🇰🇪', native: 'Kiswahili',       label: 'Swahili'   },
  { code: 'pl', flag: '🇵🇱', native: 'Polski',          label: 'Polish'    },
]

export const DEFAULT_LOCALE = 'en'

export function getLanguage(code) {
  return LANGUAGES.find(l => l.code === code) ?? LANGUAGES.find(l => l.code === DEFAULT_LOCALE)
}

import { useBuilderStore } from '../store/builderStore'
import { Palette } from 'lucide-react'
import { useTranslation } from '../i18n'

const FONT_OPTIONS = [
  { label: 'Inter (Modern)',             value: '"Inter", system-ui, sans-serif' },
  { label: 'Poppins (Friendly)',         value: '"Poppins", sans-serif' },
  { label: 'Roboto (Clean)',             value: '"Roboto", sans-serif' },
  { label: 'Lato (Professional)',        value: '"Lato", sans-serif' },
  { label: 'Playfair Display (Elegant)', value: '"Playfair Display", serif' },
  { label: 'JetBrains Mono (Tech)',      value: '"JetBrains Mono", monospace' },
]

const RADIUS_OPTIONS = [
  { label: 'None', value: '0' },
  { label: 'SM',   value: '0.25rem' },
  { label: 'MD',   value: '0.5rem' },
  { label: 'LG',   value: '0.75rem' },
  { label: 'XL',   value: '1rem' },
  { label: 'Full', value: '9999px' },
]

export default function ThemePanel() {
  const { schema, updateTheme } = useBuilderStore()
  const { t: tr }               = useTranslation()
  const t = schema.theme

  return (
    <aside className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-purple-600/20 flex items-center justify-center">
          <Palette size={12} className="text-purple-400" />
        </div>
        <span className="text-xs font-bold text-white">{tr('theme_title')}</span>
        <span className="text-[10px] text-gray-600 ml-auto">{tr('theme_all_components')}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {/* Brand Colors */}
        <Group label={tr('theme_brand_colors')}>
          <ColorField label={tr('theme_primary')}   value={t.primaryColor}   onChange={v => updateTheme({ primaryColor: v })} />
          <ColorField label={tr('theme_secondary')} value={t.secondaryColor} onChange={v => updateTheme({ secondaryColor: v })} />
        </Group>

        {/* Typography */}
        <Group label={tr('theme_typography')}>
          <div>
            <label className={labelClass}>{tr('theme_font_family')}</label>
            <select
              value={t.fontFamily}
              onChange={e => updateTheme({ fontFamily: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors">
              {FONT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <ColorField label={tr('theme_heading_color')} value={t.headingColor} onChange={v => updateTheme({ headingColor: v })} />
          <ColorField label={tr('theme_body_color')}    value={t.bodyColor}    onChange={v => updateTheme({ bodyColor: v })} />
        </Group>

        {/* Shape */}
        <Group label={tr('theme_border_radius')}>
          <div className="grid grid-cols-3 gap-1">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => updateTheme({ borderRadius: opt.value })}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-colors ${
                  t.borderRadius === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </Group>

        {/* Backgrounds */}
        <Group label={tr('theme_backgrounds')}>
          <ColorField label={tr('theme_page_bg')} value={t.pageBg} onChange={v => updateTheme({ pageBg: v })} />
          <ColorField label={tr('theme_dark_bg')} value={t.darkBg} onChange={v => updateTheme({ darkBg: v })} />
        </Group>

        {/* Live preview swatch */}
        <Group label={tr('theme_live_preview')}>
          <div className="rounded-xl overflow-hidden border border-gray-700 text-[11px]">
            <div style={{ backgroundColor: t.darkBg, fontFamily: t.fontFamily }} className="p-3 space-y-2">
              <div className="py-1.5 px-3 text-center font-bold text-white"
                style={{ backgroundColor: t.primaryColor, borderRadius: t.borderRadius }}>
                {tr('theme_primary_btn')}
              </div>
              <div className="py-1.5 px-3 text-center font-semibold text-white"
                style={{ backgroundColor: t.secondaryColor, borderRadius: t.borderRadius }}>
                {tr('theme_secondary_btn')}
              </div>
            </div>
            <div style={{ backgroundColor: t.pageBg, fontFamily: t.fontFamily }} className="p-3">
              <p className="font-bold text-sm mb-1" style={{ color: t.headingColor }}>{tr('theme_heading_text')}</p>
              <p style={{ color: t.bodyColor }}>{tr('theme_body_preview')}</p>
            </div>
          </div>
        </Group>
      </div>
    </aside>
  )
}

function Group({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 px-0.5">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

const labelClass = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 px-0.5'

function ColorField({ label, value, onChange }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer border border-gray-700 bg-gray-800 p-0.5 flex-shrink-0" />
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors" />
      </div>
    </div>
  )
}

import { useBuilderStore } from '../store/builderStore'
import { useTheme } from '../context/ThemeContext'
import { INSPECTOR_FIELDS } from '../lib/componentDefs'
import ThemePanel from './ThemePanel'
import { X, Plus, Trash2 } from 'lucide-react'

export default function RightSidebar() {
  const { getSelected, updateProps } = useBuilderStore()
  const selected = getSelected()

  // Nothing selected → show global theme editor
  if (!selected) return <ThemePanel />

  const groups = INSPECTOR_FIELDS[selected.type] || []
  const p = selected.props
  const set = (key, value) => updateProps(selected.id, { [key]: value })

  return (
    <aside className="w-64 flex flex-col overflow-hidden flex-shrink-0"
      style={{
        background: 'rgba(6,6,18,0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
      }}>
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-bold text-white">{selected.type}</span>
        <span className="text-[10px] text-gray-600 ml-auto">Properties</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {groups.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2 px-1">
              {group.group}
            </p>
            <div className="space-y-2">
              {group.fields.map((field) => (
                <FieldEditor
                  key={field.key}
                  field={field}
                  value={p[field.key]}
                  onChange={(val) => set(field.key, val)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

// ─── Field editors ────────────────────────────────────────────────────────────

function FieldEditor({ field, value, onChange }) {
  const theme = useTheme()
  const labelClass = 'block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 px-0.5'
  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors'

  switch (field.type) {
    case 'color': {
      const isThemeDefault = value === null || value === undefined
      const themeColor = field.themeKey ? theme[field.themeKey] : null
      return (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass.replace('mb-1', '')}>{field.label}</label>
            {themeColor && (
              isThemeDefault
                ? <button onClick={() => onChange(themeColor)}
                    className="text-[9px] text-purple-400 hover:text-purple-300 transition-colors">Override ↗</button>
                : <button onClick={() => onChange(null)}
                    className="text-[9px] text-gray-500 hover:text-gray-300 transition-colors">↺ theme</button>
            )}
          </div>
          {(isThemeDefault && themeColor) ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-600 flex-shrink-0"
                style={{ backgroundColor: themeColor }} />
              <span className="text-[10px] text-gray-500 italic">Using theme default</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-gray-700 bg-gray-800 p-0.5 flex-shrink-0" />
              <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
                className={`${inputClass} flex-1`} />
            </div>
          )}
        </div>
      )
    }

    case 'textarea':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <textarea rows={3} value={value || ''} onChange={e => onChange(e.target.value)}
            className={`${inputClass} resize-none`} />
        </div>
      )

    case 'toggle':
      return (
        <div className="flex items-center justify-between py-0.5">
          <label className="text-xs text-gray-400">{field.label}</label>
          <button onClick={() => onChange(!value)}
            className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-700'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      )

    case 'select':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <select value={value ?? ''} onChange={e => {
            const v = e.target.value
            // Cast back to number if original options were numbers
            const isNum = typeof (field.options?.[0]) === 'number'
            onChange(isNum ? Number(v) : v)
          }} className={inputClass}>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )

    case 'number':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))}
            className={inputClass} />
        </div>
      )

    case 'tags':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <TagsEditor value={value || []} onChange={onChange} />
        </div>
      )

    case 'feature-list':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <FeatureListEditor value={value || []} onChange={onChange} />
        </div>
      )

    case 'testimonial-list':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <TestimonialListEditor value={value || []} onChange={onChange} />
        </div>
      )

    case 'plan-list':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <PlanListEditor value={value || []} onChange={onChange} />
        </div>
      )

    case 'columns-map':
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <ColumnsMapEditor value={value || {}} onChange={onChange} />
        </div>
      )

    default:
      return (
        <div>
          <label className={labelClass}>{field.label}</label>
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            className={inputClass} />
        </div>
      )
  }
}

// ─── Complex editors ──────────────────────────────────────────────────────────

function TagsEditor({ value, onChange }) {
  const add    = ()        => onChange([...value, 'New Item'])
  const remove = (i)       => onChange(value.filter((_, idx) => idx !== i))
  const update = (i, v)    => onChange(value.map((x, idx) => idx === i ? v : x))
  return (
    <div className="space-y-1">
      {value.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <input type="text" value={item} onChange={e => update(i, e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
          <button onClick={() => remove(i)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
            <X size={11} />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-1">
        <Plus size={11} /> Add item
      </button>
    </div>
  )
}

function FeatureListEditor({ value, onChange }) {
  const add    = () => onChange([...value, { id: Date.now(), icon: '⚡', title: 'Feature', desc: 'Description' }])
  const remove = (id) => onChange(value.filter(f => f.id !== id))
  const update = (id, key, v) => onChange(value.map(f => f.id === id ? { ...f, [key]: v } : f))
  const ic = 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 mb-1'
  return (
    <div className="space-y-2">
      {value.map(feat => (
        <div key={feat.id} className="bg-gray-800/60 rounded-lg p-2 border border-gray-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500">Feature</span>
            <button onClick={() => remove(feat.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
          </div>
          <input className={ic} placeholder="Icon (emoji)" value={feat.icon} onChange={e => update(feat.id, 'icon', e.target.value)} />
          <input className={ic} placeholder="Title" value={feat.title} onChange={e => update(feat.id, 'title', e.target.value)} />
          <input className={ic.replace('mb-1', '')} placeholder="Description" value={feat.desc} onChange={e => update(feat.id, 'desc', e.target.value)} />
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
        <Plus size={11} /> Add feature
      </button>
    </div>
  )
}

function TestimonialListEditor({ value, onChange }) {
  const add    = () => onChange([...value, { id: Date.now(), name: 'New User', role: 'Role', avatar: '👤', text: 'Quote here', rating: 5 }])
  const remove = (id) => onChange(value.filter(t => t.id !== id))
  const update = (id, key, v) => onChange(value.map(t => t.id === id ? { ...t, [key]: v } : t))
  const ic = 'w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 mb-1'
  return (
    <div className="space-y-2">
      {value.map(t => (
        <div key={t.id} className="bg-gray-800/60 rounded-lg p-2 border border-gray-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500">Testimonial</span>
            <button onClick={() => remove(t.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
          </div>
          <input className={ic} placeholder="Name" value={t.name} onChange={e => update(t.id, 'name', e.target.value)} />
          <input className={ic} placeholder="Role" value={t.role} onChange={e => update(t.id, 'role', e.target.value)} />
          <input className={ic.replace('mb-1', '')} placeholder="Quote" value={t.text} onChange={e => update(t.id, 'text', e.target.value)} />
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
        <Plus size={11} /> Add testimonial
      </button>
    </div>
  )
}

function PlanListEditor({ value, onChange }) {
  const add    = () => onChange([...value, { id: Date.now(), name: 'Plan', description: 'Plan desc', price: '$0', period: '/mo', features: ['Feature 1'], cta: 'Get Started', highlighted: false }])
  const remove = (id) => onChange(value.filter(p => p.id !== id))
  const update = (id, key, v) => onChange(value.map(p => p.id === id ? { ...p, [key]: v } : p))
  const ic = 'flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500'
  return (
    <div className="space-y-2">
      {value.map(plan => (
        <div key={plan.id} className="bg-gray-800/60 rounded-lg p-2 border border-gray-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500">{plan.name}</span>
            <button onClick={() => remove(plan.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
          </div>
          <div className="mb-1">
            <input className={`${ic} w-full`} placeholder="Plan Name" value={plan.name} onChange={e => update(plan.id, 'name', e.target.value)} />
          </div>
          <div className="flex gap-1 mb-1">
            <input className={ic} placeholder="Price" value={plan.price} onChange={e => update(plan.id, 'price', e.target.value)} />
            <input className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" placeholder="/mo" value={plan.period} onChange={e => update(plan.id, 'period', e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Highlighted</span>
            <button onClick={() => update(plan.id, 'highlighted', !plan.highlighted)}
              className={`relative w-8 h-4 rounded-full transition-colors ${plan.highlighted ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${plan.highlighted ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
        <Plus size={11} /> Add plan
      </button>
    </div>
  )
}

function ColumnsMapEditor({ value, onChange }) {
  const entries   = Object.entries(value)
  const addCol    = () => { const k = `Column ${entries.length + 1}`; onChange({ ...value, [k]: ['Link 1'] }) }
  const removeCol = (k) => { const n = { ...value }; delete n[k]; onChange(n) }
  const addLink   = (k) => onChange({ ...value, [k]: [...(value[k] || []), 'New Link'] })
  const updateLink= (k, i, v) => { const links = [...(value[k] || [])]; links[i] = v; onChange({ ...value, [k]: links }) }
  const removeLink= (k, i) => onChange({ ...value, [k]: value[k].filter((_, idx) => idx !== i) })
  return (
    <div className="space-y-2">
      {entries.map(([colKey, links]) => (
        <div key={colKey} className="bg-gray-800/60 rounded-lg p-2 border border-gray-700/60">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-400">{colKey}</span>
            <button onClick={() => removeCol(colKey)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
          </div>
          {(links || []).map((link, i) => (
            <div key={i} className="flex items-center gap-1 mb-1">
              <input type="text" value={link} onChange={e => updateLink(colKey, i, e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
              <button onClick={() => removeLink(colKey, i)} className="text-gray-600 hover:text-red-400 p-0.5"><X size={10} /></button>
            </div>
          ))}
          <button onClick={() => addLink(colKey)} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 mt-0.5">
            <Plus size={9} /> Add link
          </button>
        </div>
      ))}
      <button onClick={addCol} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
        <Plus size={11} /> Add column
      </button>
    </div>
  )
}

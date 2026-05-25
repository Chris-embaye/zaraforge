import { Trash2, Type, Image as ImageIcon, MousePointer2, Plus } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'
import { useTheme } from '../context/ThemeContext'
import { HeadingComp, ImageComp, ButtonComp } from './AtomicComps'

const ATOMIC_COMPS = {
  Heading: HeadingComp,
  Image:   ImageComp,
  Button:  ButtonComp,
}

const ATOM_ICONS = {
  Heading: Type,
  Image:   ImageIcon,
  Button:  MousePointer2,
}

// ─── Atomic element selection / delete wrapper ────────────────────────────────
function AtomicWrapper({ child, parentId }) {
  const { selectedId, selectComponent, removeComponent } = useBuilderStore()
  const isSelected = selectedId === child.id
  const Comp = ATOMIC_COMPS[child.type]
  if (!Comp) return null

  return (
    <div
      className={`relative rounded-lg transition-all duration-100 ${
        isSelected
          ? 'ring-2 ring-purple-500 ring-offset-1'
          : 'ring-1 ring-transparent hover:ring-purple-400/40'
      }`}
      onClick={(e) => { e.stopPropagation(); selectComponent(child.id) }}>

      {/* Type badge + delete */}
      <div className={`absolute -top-2 left-0 right-0 z-20 flex items-center justify-between px-1 transition-opacity ${
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
          style={{ backgroundColor: '#7c3aed' }}>
          {child.type}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); removeComponent(child.id) }}
          className="w-5 h-5 rounded bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors">
          <Trash2 size={9} className="text-white" />
        </button>
      </div>

      <div className="p-2">
        <Comp props={child.props} />
      </div>
    </div>
  )
}

// ─── Row container ────────────────────────────────────────────────────────────
export default function RowComp({ props: p, component }) {
  const { selectedId, addChildToRow } = useBuilderStore()
  const theme = useTheme()

  const bgColor  = p.bgColor ?? theme.pageBg
  const children = component?.children || []

  // Show controls when the Row itself OR any of its children is selected
  const isActive = selectedId === component?.id ||
    children.some(ch => ch.id === selectedId)

  const colsStyle = {
    display:               'grid',
    gridTemplateColumns:   `repeat(${p.columns || 2}, 1fr)`,
    gap:                   `${(p.gap || 6) * 4}px`,
    alignItems:            p.align || 'center',
  }

  return (
    <div style={{
      backgroundColor: bgColor,
      paddingTop:    `${p.paddingY || 48}px`,
      paddingBottom: `${p.paddingY || 48}px`,
      paddingLeft:   `${p.paddingX || 24}px`,
      paddingRight:  `${p.paddingX || 24}px`,
    }}>
      <div className="max-w-7xl mx-auto group">
        <div style={colsStyle}>
          {children.map(child => (
            <AtomicWrapper key={child.id} child={child} parentId={component?.id} />
          ))}

          {/* Empty slot placeholder */}
          {children.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-8 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 text-sm">
              Add elements below ↓
            </div>
          )}
        </div>

        {/* Add-atom toolbar — visible when Row or a child is active */}
        {isActive && (
          <div
            className="mt-4 flex items-center justify-center gap-2"
            onClick={e => e.stopPropagation()}>
            {['Heading', 'Image', 'Button'].map(type => {
              const Icon = ATOM_ICONS[type]
              return (
                <button
                  key={type}
                  onClick={() => addChildToRow(component.id, type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                    bg-purple-900/20 border-purple-700/40 text-purple-300 hover:bg-purple-600 hover:text-white hover:border-purple-600">
                  <Icon size={11} />
                  <Plus size={9} />
                  {type}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

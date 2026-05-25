import { useBuilderStore } from '../store/builderStore'
import { COMPONENT_LIBRARY } from '../lib/componentDefs'
import { Plus, BarChart3 } from 'lucide-react'

export default function LeftSidebar() {
  const { addComponent, formSubmissions, setShowFormAnalytics } = useBuilderStore()

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 px-1">Components</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {COMPONENT_LIBRARY.map((category) => (
          <div key={category.category}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-2 mb-1.5">
              {category.category}
            </p>
            <div className="space-y-0.5">
              {category.items.map((item) => (
                <button
                  key={item.type}
                  onClick={() => addComponent(item.type)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-gray-800 group transition-colors">
                  <item.icon size={15} className="text-gray-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors truncate">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-gray-600 truncate">{item.description}</p>
                  </div>
                  <Plus size={12} className="text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form Analytics shortcut */}
      <div className="flex-shrink-0 px-2 py-2 border-t border-gray-800">
        <button
          onClick={() => setShowFormAnalytics(true)}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-gray-800 group transition-colors">
          <BarChart3 size={15} className="text-gray-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
          <span className="flex-1 text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
            Form Data
          </span>
          {formSubmissions.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-600/30 text-indigo-400">
              {formSubmissions.length}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

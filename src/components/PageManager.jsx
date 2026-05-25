import { useState, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { useBuilderStore } from '../store/builderStore'

export default function PageManager() {
  const { pages, activePageId, setActivePage, addPage, removePage, renamePage } = useBuilderStore()
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  const startEdit = (page, e) => {
    e.stopPropagation()
    setEditingId(page.id)
    setEditValue(page.name)
    setTimeout(() => inputRef.current?.select(), 30)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) renamePage(editingId, editValue.trim())
    setEditingId(null)
  }

  return (
    <div
      className="flex items-center flex-shrink-0 px-3 gap-1 overflow-x-auto"
      style={{ height: 36, background: '#07070f', borderBottom: '1px solid #111118' }}>

      {pages.map(page => {
        const isActive  = page.id === activePageId
        const isEditing = editingId === page.id

        return (
          <div
            key={page.id}
            onClick={() => !isEditing && setActivePage(page.id)}
            onDoubleClick={e => startEdit(page, e)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md cursor-pointer flex-shrink-0 group transition-all"
            style={{
              background: isActive ? '#1e293b' : 'transparent',
              border:     `1px solid ${isActive ? '#334155' : 'transparent'}`,
              color:      isActive ? '#e2e8f0' : '#64748b',
            }}>

            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter')  commitEdit()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={e => e.stopPropagation()}
                className="text-xs font-medium bg-transparent outline-none border-b border-indigo-500 text-gray-200"
                style={{ width: Math.max(60, editValue.length * 7) + 'px' }}
                autoFocus
              />
            ) : (
              <span className="text-xs font-medium select-none">{page.name}</span>
            )}

            {isActive && pages.length > 1 && !isEditing && (
              <button
                onClick={e => { e.stopPropagation(); removePage(page.id) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-900/40 hover:text-red-400 text-gray-600 flex-shrink-0">
                <X size={9} />
              </button>
            )}
          </div>
        )
      })}

      <button
        onClick={() => addPage()}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 hover:text-gray-300 hover:bg-gray-800/50 transition-colors flex-shrink-0">
        <Plus size={11} />
        Page
      </button>
    </div>
  )
}

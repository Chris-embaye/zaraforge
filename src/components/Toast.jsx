import { useToastStore } from '../store/toastStore'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function Toast() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 min-w-72 max-w-sm
            bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3.5 shadow-2xl
            animate-toast-in">

          {toast.type === 'error'
            ? <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            : <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          }

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
            {toast.body && (
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{toast.body}</p>
            )}
          </div>

          <button
            onClick={() => dismiss(toast.id)}
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

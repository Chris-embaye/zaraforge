import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],

  showToast: ({ title, body, type = 'success', duration = 4000 }) => {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, title, body, type }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duration)
  },

  dismiss: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

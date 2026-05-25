import { useEffect, useCallback } from 'react'
import { useAuthStore }    from '../store/authStore'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore }   from '../store/toastStore'
import { promptToSchema }  from '../lib/promptEngine'

/**
 * useZaraForgeSession
 *
 * - Watches the builder schema for changes and fires the cloud-sync
 *   animation whenever the logged-in user edits their canvas.
 * - Provides `openProject(project)` which loads a cloud project into
 *   the builder (or switches to the correct mode for studio/logo types).
 * - The session-restore overlay (sessionRestoring flag in authStore) is
 *   driven by authStore.login() — this hook handles the actual data fetch
 *   simulation and canvas population on the first load after login.
 */
export function useZaraForgeSession() {
  const { isLoggedIn, triggerSync, projects, sessionRestoring } = useAuthStore()
  const { setSchema, setAppMode }  = useBuilderStore()
  const { showToast }              = useToastStore()

  // ── Subscribe to canvas changes → fire cloud-sync animation ──────────────
  useEffect(() => {
    if (!isLoggedIn) return

    let prev = useBuilderStore.getState().schema
    const unsub = useBuilderStore.subscribe(state => {
      if (state.schema !== prev) {
        prev = state.schema
        triggerSync()
      }
    })
    return unsub
  }, [isLoggedIn, triggerSync])

  // ── Auto-restore most recent builder project after login ──────────────────
  useEffect(() => {
    if (!sessionRestoring) return

    const mostRecent = [...projects]
      .filter(p => p.type === 'builder' && p.prompt)
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))[0]

    if (!mostRecent) return

    // Simulate async cloud fetch with a short delay so the overlay is visible
    const t = setTimeout(() => {
      try {
        const { schema } = promptToSchema(mostRecent.prompt)
        setSchema(schema)
        setAppMode('builder')
      } catch { /* noop – canvas stays empty */ }
    }, 1800)

    return () => clearTimeout(t)
  }, [sessionRestoring, projects, setSchema, setAppMode])

  // ── openProject — called from ProjectsDrawer ──────────────────────────────
  const openProject = useCallback((project) => {
    if (project.type === 'builder' && project.prompt) {
      try {
        const { schema, meta } = promptToSchema(project.prompt)
        setSchema(schema)
        setAppMode('builder')
        showToast({
          title: `📂 ${project.name}`,
          body:  `${meta.count} components loaded from cloud`,
          type:  'success',
        })
      } catch {
        showToast({ title: 'Load failed', body: 'Could not restore project', type: 'error' })
      }
    } else if (project.type === 'studio') {
      setAppMode('studio')
      showToast({ title: `🎛 ${project.name}`, body: 'Studio session restored', type: 'success' })
    } else if (project.type === 'logo') {
      setAppMode('logo')
      showToast({ title: `🎨 ${project.name}`, body: 'Logo workspace restored', type: 'success' })
    }

    useAuthStore.getState().setShowProjectsDrawer(false)
  }, [setSchema, setAppMode, showToast])

  return { openProject }
}

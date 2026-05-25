import { useState, useMemo } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { compileProject } from '../lib/compiler'
import { generateHTML } from '../lib/codeGenerator'
import {
  X, Copy, Download, Check, Code2, FileJson,
  ExternalLink, FileCode2, Layers, ChevronRight,
} from 'lucide-react'

// ─── Stat chip ────────────────────────────────────────────────────────────────
function Stat({ label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 rounded-lg">
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  )
}

// ─── Line-numbered code viewer ────────────────────────────────────────────────
function CodeViewer({ content }) {
  const lines = useMemo(() => content.split('\n'), [content])
  return (
    <div className="flex-1 overflow-auto bg-[#0d1117] rounded-xl border border-gray-800 font-mono text-xs leading-5">
      <table className="w-full border-collapse min-w-0">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="group hover:bg-white/[0.02]">
              <td className="select-none text-right pr-4 pl-3 py-0 text-gray-600 border-r border-gray-800/60 w-12 align-top group-hover:text-gray-500 transition-colors">
                {i + 1}
              </td>
              <td className="px-5 py-0 text-gray-300 whitespace-pre align-top">
                <TokenisedLine line={line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Lightweight single-pass tokeniser — no dependencies, no regex hell
function TokenisedLine({ line }) {
  // Quick detection for common HTML patterns
  if (!line.trim()) return <span>{line || ' '}</span>

  const trimmed = line.trim()

  // Comment
  if (trimmed.startsWith('<!--')) {
    return <span className="text-gray-600 italic">{line}</span>
  }
  // Doctype
  if (trimmed.startsWith('<!')) {
    return <span className="text-gray-500">{line}</span>
  }
  // CSS variable inside :root or style tag
  if (trimmed.startsWith('--')) {
    const [prop, ...rest] = line.split(':')
    return <><span className="text-sky-400">{prop}</span><span className="text-gray-400">:{rest.join(':')}</span></>
  }
  // CSS property: value; (single indent, colon with no angle bracket)
  if (!trimmed.includes('<') && trimmed.includes(':') && !trimmed.startsWith('@')) {
    const colonIdx = trimmed.indexOf(':')
    const prop = trimmed.substring(0, colonIdx)
    const val = trimmed.substring(colonIdx)
    const indent = line.substring(0, line.indexOf(trimmed[0]))
    return <><span>{indent}</span><span className="text-violet-400">{prop}</span><span className="text-gray-400">{val}</span></>
  }
  // Closing tag
  if (trimmed.startsWith('</')) {
    return <span className="text-pink-400">{line}</span>
  }
  // Opening / self-closing tag — color tag name differently from attributes
  if (trimmed.startsWith('<')) {
    const indent = line.substring(0, line.indexOf('<'))
    const inner  = line.substring(line.indexOf('<'))
    // Tag name
    const tagMatch = inner.match(/^<(\/?[\w-]+)/)
    if (tagMatch) {
      const tagName = tagMatch[1]
      const afterTag = inner.substring(tagMatch[0].length)
      // Attributes region — crude but effective
      const attrColored = afterTag.replace(/([\w-]+=)(["'][^"']*["'])/g,
        (_, attr, val) =>
          `<span style="color:#86efac">${attr}</span><span style="color:#fde68a">${val}</span>`
      )
      return (
        <span>
          <span>{indent}&lt;</span>
          <span className="text-pink-400">{tagName}</span>
          <span dangerouslySetInnerHTML={{ __html: attrColored }} />
        </span>
      )
    }
  }
  return <span>{line}</span>
}

// ─── Component tree sidebar ───────────────────────────────────────────────────
function ComponentTree({ pages }) {
  const TYPE_COLORS = {
    Navbar: 'text-sky-400', Hero: 'text-violet-400', Features: 'text-emerald-400',
    Testimonials: 'text-amber-400', Pricing: 'text-pink-400', CTA: 'text-orange-400',
    ContactForm: 'text-teal-400', Footer: 'text-gray-400',
    Row: 'text-purple-400', Heading: 'text-blue-400', Image: 'text-green-400', Button: 'text-red-400',
  }

  return (
    <div className="w-44 flex-shrink-0 border-r border-gray-800 flex flex-col">
      <div className="px-3 pt-3 pb-2 border-b border-gray-800/60">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 flex items-center gap-1.5">
          <Layers size={9} /> Structure
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {pages.map(page => (
          <div key={page.id}>
            <div className="px-3 py-1.5 border-b border-gray-800/40">
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">{page.name}</p>
            </div>
            {(page.schema?.components ?? []).map(comp => (
              <div key={comp.id}>
                <div className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-800/40 group">
                  <ChevronRight size={9} className="text-gray-700 flex-shrink-0" />
                  <span className={`text-[10px] font-semibold truncate ${TYPE_COLORS[comp.type] || 'text-gray-400'}`}>
                    {comp.type}
                  </span>
                </div>
                {comp.children?.map(child => (
                  <div key={child.id} className="flex items-center gap-1.5 pl-6 pr-3 py-0.5 hover:bg-gray-800/40">
                    <span className="text-gray-700">└</span>
                    <span className={`text-[10px] truncate ${TYPE_COLORS[child.type] || 'text-gray-500'}`}>
                      {child.type}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ExportModal() {
  const { schema, pages, setShowExport } = useBuilderStore()
  const [tab, setTab]       = useState('html')
  const [copied, setCopied] = useState(false)

  const htmlCode = useMemo(() => compileProject(pages), [pages])
  const jsonCode = useMemo(() => JSON.stringify({ pages }, null, 2), [pages])
  const content  = tab === 'html' ? htmlCode : jsonCode

  // Stats
  const lineCount = content.split('\n').length
  const sizeBytes = new TextEncoder().encode(htmlCode).length
  const sizeKB    = (sizeBytes / 1024).toFixed(1)
  const compCount = pages.reduce((n, p) => n + (p.schema?.components?.length ?? 0), 0)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const download = () => {
    const ext  = tab === 'html' ? 'html' : 'json'
    const mime = tab === 'html' ? 'text/html' : 'application/json'
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `website.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const openPreview = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && setShowExport(false)}>

      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl w-full max-w-5xl flex flex-col shadow-2xl"
        style={{ height: 'min(88vh, 760px)' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
            <FileCode2 size={16} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white leading-none">Export & Deploy</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Production-ready, self-contained HTML</p>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-1.5">
            <Stat label="components" value={compCount} color="text-indigo-400" />
            <Stat label="lines" value={lineCount.toLocaleString()} color="text-violet-400" />
            <Stat label="size" value={`${sizeKB} KB`} color="text-emerald-400" />
          </div>

          <button
            onClick={() => setShowExport(false)}
            className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-1">
            <X size={15} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">
          {/* Component tree */}
          <ComponentTree pages={pages} />

          {/* Code panel */}
          <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
            {/* Tab bar + action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Tabs */}
              <div className="flex items-center bg-gray-800 rounded-lg p-0.5 gap-0.5">
                <button
                  onClick={() => setTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    tab === 'html'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}>
                  <Code2 size={11} />
                  HTML
                  {tab === 'html' && (
                    <span className="bg-white/20 text-white text-[9px] font-bold px-1 rounded ml-0.5">
                      DEPLOY
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTab('json')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    tab === 'json'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}>
                  <FileJson size={11} />
                  JSON
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={openPreview}
                  title="Open rendered site in new tab"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors">
                  <ExternalLink size={11} />
                  <span className="hidden sm:block">Preview</span>
                </button>
                <button
                  onClick={copy}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                  }`}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={download}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm">
                  <Download size={11} />
                  Download {tab === 'html' ? 'index.html' : 'schema.json'}
                </button>
              </div>
            </div>

            {/* Code viewer */}
            <CodeViewer content={content} />

            {/* Footer note */}
            {tab === 'html' && (
              <p className="text-[10px] text-gray-600 flex-shrink-0">
                ✓ Self-contained · ✓ Tailwind CDN · ✓ Google Fonts · ✓ CSS theme variables · Open in any browser, host on any CDN.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

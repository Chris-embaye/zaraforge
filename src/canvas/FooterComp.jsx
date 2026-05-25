export default function FooterComp({ props: p }) {
  const cols = Object.entries(p.columns || {})

  return (
    <footer style={{ backgroundColor: p.bgColor }} className="pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: p.accentColor }}>
                {(p.brand || 'M').charAt(0)}
              </div>
              <span className="font-bold text-white">{p.brand}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: p.textColor }}>{p.tagline}</p>
            <div className="flex gap-3 mt-6">
              {['𝕏', 'in', '⌥'].map((icon, i) => (
                <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: `${p.textColor}20`, color: p.textColor }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          {/* Link columns */}
          {cols.map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4 text-white">{title}</h4>
              <ul className="space-y-3">
                {(links || []).map((link) => (
                  <li key={link}>
                    <a href="#" onClick={e => e.preventDefault()}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color: p.textColor }}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderColor: `${p.textColor}20` }}>
          <p className="text-sm" style={{ color: p.textColor }}>{p.copyright}</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs" style={{ color: `${p.textColor}88` }}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

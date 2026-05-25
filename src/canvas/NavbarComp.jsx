export default function NavbarComp({ props: p }) {
  return (
    <nav style={{ backgroundColor: p.bgColor }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
            style={{ backgroundColor: p.accentColor }}>
            {(p.brand || 'M').charAt(0)}
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: p.textColor }}>{p.brand}</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {(p.links || []).map((link, i) => (
            <a key={i} href="#" onClick={e => e.preventDefault()}
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: p.textColor }}>{link}</a>
          ))}
        </div>
        {p.showCTA && (
          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: p.accentColor }}>
            {p.ctaText}
          </button>
        )}
      </div>
    </nav>
  )
}

function shiftColor(hex, amt) {
  try {
    const n = parseInt(hex.replace('#',''), 16)
    const c = v => Math.min(255, Math.max(0, v))
    const r = c((n>>16)+amt), g = c(((n>>8)&0xff)+amt), b = c((n&0xff)+amt)
    return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
  } catch { return hex }
}

export default function HeroComp({ props: p }) {
  const bgStyle = p.bgGradient
    ? { background: `linear-gradient(135deg, ${p.bgColor} 0%, ${shiftColor(p.bgColor, 25)} 100%)` }
    : { backgroundColor: p.bgColor }

  return (
    <section style={bgStyle} className="py-24 px-6">
      <div className="max-w-5xl mx-auto text-center">
        {p.showBadge && p.badge && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
            style={{ backgroundColor: `${p.accentColor}20`, color: p.accentColor, border: `1px solid ${p.accentColor}40` }}>
            {p.badge}
          </div>
        )}
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight"
          style={{ color: p.textColor }}>
          {p.headline}
        </h1>
        <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ color: `${p.textColor}99` }}>
          {p.subheadline}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="px-8 py-4 rounded-xl font-bold text-white text-lg shadow-xl hover:opacity-90 transition-all"
            style={{ backgroundColor: p.accentColor }}>
            {p.primaryCTA}
          </button>
          {p.secondaryCTA && (
            <button className="px-8 py-4 rounded-xl font-bold text-lg hover:opacity-80 transition-opacity"
              style={{ color: p.textColor, border: `2px solid ${p.textColor}30` }}>
              {p.secondaryCTA}
            </button>
          )}
        </div>
        {/* Decorative dots */}
        <div className="flex items-center justify-center gap-2 mt-16 opacity-30">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-full" style={{
              width: i === 2 ? 10 : 6,
              height: i === 2 ? 10 : 6,
              backgroundColor: p.accentColor
            }} />
          ))}
        </div>
      </div>
    </section>
  )
}

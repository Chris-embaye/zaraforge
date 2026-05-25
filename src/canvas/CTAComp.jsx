function shiftColor(hex, amt) {
  try {
    const n = parseInt(hex.replace('#',''), 16)
    const c = v => Math.min(255, Math.max(0, v))
    const r = c((n>>16)+amt), g = c(((n>>8)&0xff)+amt), b = c((n&0xff)+amt)
    return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
  } catch { return hex }
}

export default function CTAComp({ props: p }) {
  const bgStyle = p.bgGradient
    ? { background: `linear-gradient(135deg, ${p.bgColor} 0%, ${shiftColor(p.bgColor, 30)} 100%)` }
    : { backgroundColor: p.bgColor }

  return (
    <section style={bgStyle} className="py-24 px-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2"
        style={{ backgroundColor: p.accentColor }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10 translate-x-1/2 translate-y-1/2"
        style={{ backgroundColor: p.accentColor }} />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight"
          style={{ color: p.textColor }}>
          {p.headline}
        </h2>
        <p className="text-xl mb-10 leading-relaxed" style={{ color: `${p.textColor}cc` }}>
          {p.subheadline}
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: p.accentColor, color: '#fff' }}>
            {p.primaryCTA}
          </button>
          {p.secondaryCTA && (
            <button className="px-8 py-4 rounded-xl font-bold text-lg hover:opacity-80 transition-opacity"
              style={{ color: p.textColor, border: `2px solid ${p.textColor}44` }}>
              {p.secondaryCTA}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

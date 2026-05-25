export default function TestimonialsComp({ props: p }) {
  return (
    <section style={{ backgroundColor: p.bgColor }} className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4" style={{ color: p.textColor }}>{p.sectionTitle}</h2>
          <p className="text-lg" style={{ color: `${p.textColor}88` }}>{p.sectionSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(p.testimonials || []).map((t) => (
            <div key={t.id} className="p-6 rounded-2xl bg-white shadow-sm border flex flex-col"
              style={{ borderColor: `${p.textColor}10` }}>
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating || 5)].map((_, i) => (
                  <span key={i} style={{ color: p.accentColor }} className="text-lg">★</span>
                ))}
              </div>
              <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: `${p.textColor}bb` }}>
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: `${p.textColor}10` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: t.avatarColor }}>
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: p.textColor }}>{t.name}</div>
                  <div className="text-xs" style={{ color: `${p.textColor}66` }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function PricingComp({ props: p }) {
  return (
    <section style={{ backgroundColor: p.bgColor }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4" style={{ color: p.textColor }}>{p.sectionTitle}</h2>
          <p className="text-lg" style={{ color: `${p.textColor}88` }}>{p.sectionSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {(p.plans || []).map((plan) => {
            const isHL = plan.highlighted
            return (
              <div key={plan.id}
                className={`relative p-8 rounded-2xl flex flex-col transition-all ${isHL ? 'shadow-2xl scale-105' : 'border'}`}
                style={{
                  backgroundColor: isHL ? p.accentColor : p.bgColor === '#ffffff' ? '#f8fafc' : `${p.textColor}05`,
                  borderColor: `${p.textColor}12`
                }}>
                {isHL && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                    style={{ backgroundColor: '#4f46e5' }}>
                    ✦ Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1" style={{ color: isHL ? '#fff' : p.textColor }}>{plan.name}</h3>
                  <p className="text-sm" style={{ color: isHL ? '#ffffffaa' : `${p.textColor}77` }}>{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-extrabold" style={{ color: isHL ? '#fff' : p.textColor }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: isHL ? '#ffffffaa' : `${p.textColor}66` }}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm"
                      style={{ color: isHL ? '#ffffffcc' : `${p.textColor}aa` }}>
                      <span className="text-base flex-shrink-0" style={{ color: isHL ? '#a5b4fc' : p.accentColor }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{
                    backgroundColor: isHL ? '#fff' : p.accentColor,
                    color: isHL ? p.accentColor : '#fff'
                  }}>
                  {plan.cta}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

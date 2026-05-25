export default function FeaturesComp({ props: p }) {
  return (
    <section style={{ backgroundColor: p.bgColor }} className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight" style={{ color: p.textColor }}>
            {p.sectionTitle}
          </h2>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: `${p.textColor}88` }}>
            {p.sectionSubtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(p.features || []).map((f) => (
            <div key={f.id} className="group p-6 rounded-2xl border transition-all hover:shadow-lg"
              style={{
                backgroundColor: p.bgColor === '#ffffff' ? '#f8fafc' : `${p.textColor}08`,
                borderColor: `${p.textColor}10`
              }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: `${p.accentColor}18` }}>
                {f.icon}
              </div>
              <h3 className="text-base font-bold mb-2" style={{ color: p.textColor }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: `${p.textColor}77` }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

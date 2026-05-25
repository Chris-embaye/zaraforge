import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useToastStore } from '../store/toastStore'

export default function ContactFormComp({ props: p }) {
  const previewMode = useBuilderStore(s => s.previewMode)
  const { showToast } = useToastStore()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', subject: '', message: ''
  })

  const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!previewMode) return
    showToast({
      title: '🎉 Message sent!',
      body: `Thanks ${form.firstName || 'there'}, we'll be in touch within 24 hours.`,
      type: 'success',
    })
    setForm({ firstName: '', lastName: '', email: '', subject: '', message: '' })
  }

  const inputStyle = {
    backgroundColor: p.bgColor === '#ffffff' ? '#fff' : `${p.textColor}06`,
    borderColor: `${p.textColor}20`,
    color: p.textColor,
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition-colors'

  return (
    <section style={{ backgroundColor: p.bgColor }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold mb-4" style={{ color: p.textColor }}>{p.sectionTitle}</h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: `${p.textColor}88` }}>{p.sectionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact info */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-6" style={{ color: p.textColor }}>Contact Information</h3>
            {[
              { icon: '✉️', label: 'Email',   value: p.email },
              { icon: '📞', label: 'Phone',   value: p.phone },
              { icon: '📍', label: 'Address', value: p.address },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${p.accentColor}18` }}>
                  {icon}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-0.5"
                    style={{ color: `${p.textColor}66` }}>{label}</div>
                  <div className="text-sm font-medium" style={{ color: p.textColor }}>{value}</div>
                </div>
              </div>
            ))}

            {/* Preview mode note */}
            {previewMode && (
              <div className="mt-6 p-3 rounded-xl border border-dashed text-xs"
                style={{ borderColor: `${p.accentColor}44`, color: `${p.textColor}77` }}>
                ✨ Form is live in preview mode — fill it out and click Submit!
              </div>
            )}
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={previewMode ? form.firstName : ''}
                onChange={handleChange('firstName')}
                readOnly={!previewMode}
                className={inputClass}
                style={{ ...inputStyle, '--tw-ring-color': p.accentColor }} />
              <input
                type="text"
                placeholder="Last Name"
                value={previewMode ? form.lastName : ''}
                onChange={handleChange('lastName')}
                readOnly={!previewMode}
                className={inputClass}
                style={inputStyle} />
            </div>
            <input
              type="email"
              placeholder="Email Address"
              value={previewMode ? form.email : ''}
              onChange={handleChange('email')}
              readOnly={!previewMode}
              className={inputClass}
              style={inputStyle} />
            <input
              type="text"
              placeholder="Subject"
              value={previewMode ? form.subject : ''}
              onChange={handleChange('subject')}
              readOnly={!previewMode}
              className={inputClass}
              style={inputStyle} />
            <textarea
              rows={4}
              placeholder="Your message..."
              value={previewMode ? form.message : ''}
              onChange={handleChange('message')}
              readOnly={!previewMode}
              className={`${inputClass} resize-none`}
              style={inputStyle} />
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: p.accentColor }}>
              {p.submitText}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

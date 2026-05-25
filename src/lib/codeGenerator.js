export function generateHTML(schema) {
  const theme = schema.theme || {}
  const sections = (schema.components || []).map(c => renderComponent(c)).join('\n\n')

  // Derive Google Fonts URL from theme font family
  const fontName = (theme.fontFamily || 'Inter').match(/"([^"]+)"/)?.[1] || 'Inter'
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Website</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="${googleFontUrl}" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --theme-primary:   ${theme.primaryColor   || '#6366f1'};
      --theme-secondary: ${theme.secondaryColor || '#10b981'};
      --theme-font:      ${theme.fontFamily     || 'Inter, system-ui, sans-serif'};
      --theme-radius:    ${theme.borderRadius   || '0.75rem'};
      --theme-heading:   ${theme.headingColor   || '#0f172a'};
      --theme-body:      ${theme.bodyColor      || '#64748b'};
      --theme-bg:        ${theme.pageBg         || '#ffffff'};
      --theme-dark-bg:   ${theme.darkBg         || '#0f172a'};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { font-family: var(--theme-font); margin: 0; }
  </style>
</head>
<body>
${sections}
</body>
</html>`
}

function renderComponent(comp) {
  const { type } = comp
  switch (type) {
    case 'Navbar':      return renderNavbar(comp.props)
    case 'Hero':        return renderHero(comp.props)
    case 'Features':    return renderFeatures(comp.props)
    case 'Testimonials':return renderTestimonials(comp.props)
    case 'Pricing':     return renderPricing(comp.props)
    case 'CTA':         return renderCTA(comp.props)
    case 'ContactForm': return renderContactForm(comp.props)
    case 'Footer':      return renderFooter(comp.props)
    case 'Row':         return renderRow(comp)
    case 'VocalStudio': return renderVocalStudio(comp.props)
    default:            return `<!-- Unknown component: ${type} -->`
  }
}

// ─── Section renderers ────────────────────────────────────────────────────────

function renderNavbar(p) {
  const links = (p.links || []).map(l =>
    `<a href="#" class="text-sm font-medium hover:opacity-70 transition-opacity" style="color:${p.textColor}">${l}</a>`
  ).join('\n      ')
  const cta = p.showCTA
    ? `<a href="${p.ctaUrl}" class="px-4 py-2 rounded-lg text-sm font-semibold text-white" style="background-color:${p.accentColor};border-radius:var(--theme-radius)">${p.ctaText}</a>`
    : ''
  return `<nav style="background-color:${p.bgColor}">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style="background-color:${p.accentColor};border-radius:var(--theme-radius)">${(p.brand || 'M').charAt(0)}</div>
      <span class="text-lg font-bold" style="color:${p.textColor}">${p.brand}</span>
    </div>
    <div class="hidden md:flex items-center gap-8">
      ${links}
    </div>
    ${cta}
  </div>
</nav>`
}

function renderHero(p) {
  const bg = p.bgGradient
    ? `background: linear-gradient(135deg, ${p.bgColor} 0%, ${shiftColor(p.bgColor, 30)} 100%)`
    : `background-color: ${p.bgColor}`
  const badge = (p.showBadge && p.badge)
    ? `<div class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium mb-6" style="background-color:${p.accentColor}22;color:${p.accentColor};border:1px solid ${p.accentColor}44">${p.badge}</div>`
    : ''
  return `<section style="${bg}" class="py-24 px-6">
  <div class="max-w-5xl mx-auto text-center">
    ${badge}
    <h1 class="text-5xl md:text-6xl font-extrabold mb-6 leading-tight" style="color:${p.textColor}">${p.headline}</h1>
    <p class="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style="color:${p.textColor}aa">${p.subheadline}</p>
    <div class="flex items-center justify-center gap-4 flex-wrap">
      <a href="${p.primaryCTAUrl}" class="px-8 py-4 rounded-xl font-bold text-white text-lg" style="background-color:${p.accentColor};border-radius:var(--theme-radius)">${p.primaryCTA}</a>
      ${p.secondaryCTA ? `<a href="${p.secondaryCTAUrl || '#'}" class="px-8 py-4 rounded-xl font-bold text-lg" style="color:${p.textColor};border:2px solid ${p.textColor}33;border-radius:var(--theme-radius)">${p.secondaryCTA}</a>` : ''}
    </div>
  </div>
</section>`
}

function renderFeatures(p) {
  const cards = (p.features || []).map(f => `
    <div class="p-6 rounded-2xl" style="background-color:${shiftColor(p.bgColor, p.bgColor === '#ffffff' ? -5 : 5)};border:1px solid ${p.textColor}11;border-radius:var(--theme-radius)">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style="background-color:${p.accentColor}18;border-radius:var(--theme-radius)">${f.icon}</div>
      <h3 class="text-lg font-bold mb-2" style="color:${p.textColor}">${f.title}</h3>
      <p class="text-sm leading-relaxed" style="color:${p.textColor}88">${f.desc || f.description}</p>
    </div>`).join('')
  return `<section style="background-color:${p.bgColor}" class="py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4" style="color:${p.textColor}">${p.sectionTitle}</h2>
      <p class="text-lg max-w-2xl mx-auto" style="color:${p.textColor}88">${p.sectionSubtitle}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
  </div>
</section>`
}

function renderTestimonials(p) {
  const cards = (p.testimonials || []).map(t => `
    <div class="p-6 rounded-2xl bg-white shadow-sm border" style="border-color:${p.textColor}11;border-radius:var(--theme-radius)">
      <div class="flex gap-1 mb-4" style="color:${p.accentColor}">${'★'.repeat(t.rating || 5)}</div>
      <p class="text-sm leading-relaxed mb-6" style="color:${p.textColor}bb">"${t.text}"</p>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style="background-color:${t.avatarColor}">${t.avatar}</div>
        <div>
          <div class="font-semibold text-sm" style="color:${p.textColor}">${t.name}</div>
          <div class="text-xs" style="color:${p.textColor}77">${t.role}</div>
        </div>
      </div>
    </div>`).join('')
  return `<section style="background-color:${p.bgColor}" class="py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4" style="color:${p.textColor}">${p.sectionTitle}</h2>
      <p class="text-lg" style="color:${p.textColor}88">${p.sectionSubtitle}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cards}</div>
  </div>
</section>`
}

function renderPricing(p) {
  const cards = (p.plans || []).map(plan => {
    const feats = (plan.features || []).map(f => `
      <li class="flex items-center gap-2 text-sm" style="color:${plan.highlighted ? '#ffffffcc' : p.textColor + 'bb'}">
        <span style="color:${plan.highlighted ? '#a5b4fc' : p.accentColor}">✓</span> ${f}
      </li>`).join('')
    const bg    = plan.highlighted ? p.accentColor : p.bgColor
    const border= plan.highlighted ? 'none' : `1px solid ${p.textColor}15`
    const text  = plan.highlighted ? '#fff' : p.textColor
    return `<div class="p-8 relative" style="background-color:${bg};border:${border};border-radius:var(--theme-radius)">
      ${plan.highlighted ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style="background-color:${shiftColor(p.accentColor, 20)}">✦ Most Popular</div>` : ''}
      <h3 class="text-xl font-bold mb-2" style="color:${text}">${plan.name}</h3>
      <p class="text-sm mb-6" style="color:${text}aa">${plan.description}</p>
      <div class="flex items-baseline gap-1 mb-6">
        <span class="text-4xl font-extrabold" style="color:${text}">${plan.price}</span>
        <span class="text-sm" style="color:${text}88">${plan.period}</span>
      </div>
      <ul class="space-y-3 mb-8">${feats}</ul>
      <a href="#" class="block text-center py-3 font-bold text-sm" style="background-color:${plan.highlighted ? '#fff' : p.accentColor};color:${plan.highlighted ? p.accentColor : '#fff'};border-radius:var(--theme-radius)">${plan.cta}</a>
    </div>`
  }).join('')
  return `<section style="background-color:${p.bgColor}" class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-16">
      <h2 class="text-4xl font-extrabold mb-4" style="color:${p.textColor}">${p.sectionTitle}</h2>
      <p class="text-lg" style="color:${p.textColor}88">${p.sectionSubtitle}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">${cards}</div>
  </div>
</section>`
}

function renderCTA(p) {
  const bg = p.bgGradient
    ? `background: linear-gradient(135deg, ${p.bgColor} 0%, ${shiftColor(p.bgColor, 30)} 100%)`
    : `background-color:${p.bgColor}`
  return `<section style="${bg}" class="py-24 px-6">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-4xl md:text-5xl font-extrabold mb-6" style="color:${p.textColor}">${p.headline}</h2>
    <p class="text-xl mb-10" style="color:${p.textColor}cc">${p.subheadline}</p>
    <div class="flex items-center justify-center gap-4 flex-wrap">
      <a href="${p.primaryCTAUrl}" class="px-8 py-4 font-bold text-lg" style="background-color:${p.accentColor};color:#fff;border-radius:var(--theme-radius)">${p.primaryCTA}</a>
      ${p.secondaryCTA ? `<a href="${p.secondaryCTAUrl || '#'}" class="px-8 py-4 font-bold text-lg" style="color:${p.textColor};border:2px solid ${p.textColor}44;border-radius:var(--theme-radius)">${p.secondaryCTA}</a>` : ''}
    </div>
  </div>
</section>`
}

function renderContactForm(p) {
  return `<section style="background-color:${p.bgColor}" class="py-24 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-4xl font-extrabold mb-4" style="color:${p.textColor}">${p.sectionTitle}</h2>
      <p class="text-lg" style="color:${p.textColor}88">${p.sectionSubtitle}</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
      <div class="space-y-6">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 flex items-center justify-center" style="background-color:${p.accentColor}18;border-radius:var(--theme-radius)">✉️</div>
          <span style="color:${p.textColor}">${p.email}</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 flex items-center justify-center" style="background-color:${p.accentColor}18;border-radius:var(--theme-radius)">📞</div>
          <span style="color:${p.textColor}">${p.phone}</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 flex items-center justify-center" style="background-color:${p.accentColor}18;border-radius:var(--theme-radius)">📍</div>
          <span style="color:${p.textColor}">${p.address}</span>
        </div>
      </div>
      <form class="space-y-4" data-endpoint="${p.formEndpoint || ''}" onsubmit="event.preventDefault(); window.parent.postMessage({type:'FORM_SUBMIT',page:document.querySelector('.zf-tab.active')?.textContent?.trim()||'',endpoint:this.dataset.endpoint||'',data:Object.fromEntries(new FormData(this)),ts:new Date().toISOString()},'*')">
        <div class="grid grid-cols-2 gap-4">
          <input type="text" placeholder="First Name" class="w-full px-4 py-3 text-sm border" style="border-color:${p.textColor}22;color:${p.textColor};border-radius:var(--theme-radius);outline:none" />
          <input type="text" placeholder="Last Name" class="w-full px-4 py-3 text-sm border" style="border-color:${p.textColor}22;color:${p.textColor};border-radius:var(--theme-radius);outline:none" />
        </div>
        <input type="email" placeholder="Email" class="w-full px-4 py-3 text-sm border" style="border-color:${p.textColor}22;color:${p.textColor};border-radius:var(--theme-radius);outline:none" />
        <textarea rows="4" placeholder="Your message..." class="w-full px-4 py-3 text-sm border resize-none" style="border-color:${p.textColor}22;color:${p.textColor};border-radius:var(--theme-radius);outline:none"></textarea>
        <button type="submit" class="w-full py-3 font-bold text-white" style="background-color:${p.accentColor};border-radius:var(--theme-radius)">${p.submitText}</button>
      </form>
    </div>
  </div>
</section>`
}

function renderFooter(p) {
  const cols = Object.entries(p.columns || {}).map(([title, links]) => `
    <div>
      <h4 class="font-semibold text-sm mb-4" style="color:${shiftColor(p.textColor, 60)}">${title}</h4>
      <ul class="space-y-3">
        ${links.map(l => `<li><a href="#" class="text-sm hover:opacity-80 transition-opacity" style="color:${p.textColor}">${l}</a></li>`).join('')}
      </ul>
    </div>`).join('')
  return `<footer style="background-color:${p.bgColor}" class="pt-16 pb-8 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
      <div class="col-span-2 md:col-span-1">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 flex items-center justify-center text-white font-bold" style="background-color:${p.accentColor};border-radius:var(--theme-radius)">${(p.brand || 'M').charAt(0)}</div>
          <span class="font-bold" style="color:${shiftColor(p.textColor, 60)}">${p.brand}</span>
        </div>
        <p class="text-sm leading-relaxed" style="color:${p.textColor}">${p.tagline}</p>
      </div>
      ${cols}
    </div>
    <div class="pt-8 border-t text-center" style="border-color:${p.textColor}22">
      <p class="text-sm" style="color:${p.textColor}">${p.copyright}</p>
    </div>
  </div>
</footer>`
}

// ─── Row / atomic renderers ───────────────────────────────────────────────────

function renderRow(comp) {
  const p = comp.props
  const children = (comp.children || []).map(renderAtom).join('\n    ')
  const bgColor = p.bgColor || 'var(--theme-bg)'
  return `<div style="background-color:${bgColor};padding:${p.paddingY || 48}px ${p.paddingX || 24}px">
  <div style="max-width:80rem;margin:0 auto;display:grid;grid-template-columns:repeat(${p.columns || 2},1fr);gap:${(p.gap || 6) * 4}px;align-items:${p.align || 'center'}">
    ${children}
  </div>
</div>`
}

function renderAtom(child) {
  switch (child.type) {
    case 'Heading': return renderHeadingAtom(child.props)
    case 'Image':   return renderImageAtom(child.props)
    case 'Button':  return renderButtonAtom(child.props)
    default:        return ''
  }
}

function renderHeadingAtom(p) {
  const sizeMap = {
    sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem',
    '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem',
  }
  const weightMap = { normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' }
  const Tag    = p.level  || 'h2'
  const color  = p.color  || 'var(--theme-heading)'
  const fs     = sizeMap[p.size || '3xl']  || '1.875rem'
  const fw     = weightMap[p.weight || 'bold'] || '700'
  return `<${Tag} style="color:${color};font-size:${fs};font-weight:${fw};text-align:${p.align || 'left'};margin:0;line-height:1.2">${p.text || ''}</${Tag}>`
}

function renderImageAtom(p) {
  const radius      = p.borderRadius || 'var(--theme-radius)'
  const aspectRatio = p.aspectRatio !== 'auto' ? `aspect-ratio:${p.aspectRatio};` : ''
  return `<div style="width:100%;${aspectRatio}overflow:hidden;border-radius:${radius}">
  <img src="${p.src}" alt="${p.alt || ''}" style="width:100%;height:100%;object-fit:${p.objectFit || 'cover'};display:block" />
</div>`
}

function renderButtonAtom(p) {
  const radius = p.borderRadius || 'var(--theme-radius)'
  const sizeMap = { sm: '0.5rem 1rem', md: '0.75rem 1.5rem', lg: '1rem 2rem' }
  const padding = sizeMap[p.size || 'md']
  const width   = p.fullWidth ? '100%' : 'auto'
  let bg, color, border
  switch (p.variant) {
    case 'secondary': bg = 'var(--theme-secondary)'; color = '#fff';                            border = 'none'; break
    case 'ghost':     bg = 'transparent';            color = p.bgColor || 'var(--theme-primary)'; border = 'none'; break
    case 'outline':   bg = 'transparent';            color = p.bgColor || 'var(--theme-primary)'; border = `2px solid ${p.bgColor || 'var(--theme-primary)'}`; break
    default:          bg = p.bgColor || 'var(--theme-primary)'; color = p.textColor || '#fff'; border = 'none'; break
  }
  const navAttr = p.targetPage ? ` data-nav-page="${p.targetPage}"` : ''
  return `<a href="${p.targetPage ? '#' + p.targetPage : (p.href || '#')}"${navAttr} style="display:inline-flex;align-items:center;justify-content:center;width:${width};padding:${padding};background-color:${bg};color:${color};border:${border};border-radius:${radius};font-weight:600;font-size:0.875rem;text-decoration:none">${p.text || 'Button'}</a>`
}

function renderVocalStudio(p) {
  const bg     = p.bgColor     || '#07070d'
  const accent = p.accentColor || '#00ff88'
  const title  = p.title       || 'Vocal Studio'
  const pn     = `background:#0d0d1a;border:1px solid #1a1a2e;border-radius:12px;padding:1rem`
  const lbl    = `font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569`
  const intensity = p.defaultIntensity ?? 50
  const key       = p.defaultKey || 'C Major'

  const vocalSVG   = staticWaveformSVG(accent,    0)
  const backingSVG = staticWaveformSVG('#a78bfa', 1.5)

  const reverbButtons = [
    ['Dry Studio', 0], ['Live Stage', 28], ['Plate Verb', 35], ['Cathedral', 52],
  ].map(([lbl2, wet]) => `
    <div style="padding:7px 6px;border-radius:8px;font-size:0.65rem;font-weight:700;text-align:center;background:#111118;color:#6b7280;border:1px solid #1a1a2e">
      ${lbl2}${wet ? `<div style="font-size:0.55rem;font-weight:400;margin-top:1px;opacity:0.7">${wet}% wet</div>` : ''}
    </div>`).join('')

  const chipRow = (color, items) => items.map(k =>
    `<div style="flex:1;padding:4px 0;border-radius:6px;text-align:center;font-size:0.6rem;font-weight:700;background:#111118;color:#374151;border:1px solid #1a1a2e">${k}</div>`
  ).join('')

  return `<section style="background-color:${bg};padding:4rem 1.5rem;font-family:system-ui,sans-serif">
  <div style="max-width:52rem;margin:0 auto;display:flex;flex-direction:column;gap:0.875rem">

    <!-- ZaraForge live notice -->
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 14px;border-radius:10px;background:${accent}08;border:1px solid ${accent}1a;margin-bottom:2px">
      <span style="font-size:0.58rem;font-weight:700;letter-spacing:0.06em;color:${accent}99">⚡ ZARAFORGE ENGINE</span>
      <span style="color:#1e293b">·</span>
      <span style="font-size:0.58rem;color:#334155">Full interactive controls are live inside the ZaraForge builder</span>
    </div>

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
      <div style="width:40px;height:40px;border-radius:12px;background:${accent}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.25rem">🎙</div>
      <div>
        <h2 style="color:#fff;font-weight:700;font-size:1.25rem;margin:0;line-height:1.2">${title}</h2>
        <p style="color:#475569;font-size:0.68rem;margin:2px 0 0">Recording · Auto-Tune · Studio Enhance · Smart Reverb · Beat-Match</p>
        <p style="color:#1e3a2f;font-size:0.56rem;font-weight:600;letter-spacing:0.06em;margin:3px 0 0">Powered by <span style="color:${accent}aa;font-weight:700">ZaraForge Engine</span></p>
      </div>
    </div>

    <!-- Key + Intensity -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div style="${pn}">
        <div style="${lbl};margin-bottom:8px">Key / Scale</div>
        <div style="color:${accent};font-size:0.875rem;font-weight:600">${key}</div>
      </div>
      <div style="${pn}">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="${lbl}">Auto-Tune Intensity</span>
          <span style="font-size:0.7rem;font-weight:700;font-family:monospace;color:${accent}">${intensity}%</span>
        </div>
        <div style="width:100%;height:4px;background:#1a1a2e;border-radius:999px;overflow:hidden">
          <div style="width:${intensity}%;height:100%;background:${accent};border-radius:999px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px">
          <span style="font-size:0.58rem;color:#374151">Natural</span>
          <span style="font-size:0.58rem;color:#374151">Robot</span>
        </div>
      </div>
    </div>

    <!-- Studio Enhance + Smart Reverb -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
      <div style="${pn}">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div style="${lbl};display:block;margin-bottom:2px">Studio Enhance</div>
            <span style="font-size:0.62rem;color:#374151">HPF 80 Hz · HShelf +3.5 dB · Compressor</span>
          </div>
          <div style="width:44px;height:24px;border-radius:99px;background:#1a1a2e;position:relative;flex-shrink:0">
            <span style="position:absolute;top:3px;left:4px;width:18px;height:18px;border-radius:50%;background:#374151;display:block"></span>
          </div>
        </div>
        <div style="display:flex;gap:6px">${chipRow(accent, ['HPF','EQ','CMP'])}</div>
      </div>
      <div style="${pn}">
        <div style="${lbl};margin-bottom:8px">Studio Space (Smart Reverb)</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">${reverbButtons}</div>
      </div>
    </div>

    <!-- Vocal Track -->
    <div style="${pn}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="color:#d1d5db;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">🎤 Vocal Track</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <div style="width:28px;height:28px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6b7280">M</div>
          <div style="width:28px;height:28px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6b7280">S</div>
        </div>
      </div>
      ${vocalSVG}
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
        <div style="flex:1;height:4px;background:#1a1a2e;border-radius:999px;overflow:hidden"><div style="width:80%;height:100%;background:${accent}55;border-radius:999px"></div></div>
        <span style="font-size:0.6rem;color:#6b7280">80%</span>
        <div style="padding:6px 12px;border-radius:8px;background:${accent};font-size:0.7rem;font-weight:700;color:#000">🎙 Record</div>
        <div style="padding:6px 12px;border-radius:8px;background:#1f2937;font-size:0.7rem;font-weight:600;color:#d1d5db">↑ Upload</div>
      </div>
    </div>

    <!-- Backing Track -->
    <div style="${pn}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="color:#d1d5db;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">🎵 Backing Track</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <div style="width:28px;height:28px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6b7280">M</div>
          <div style="width:28px;height:28px;border-radius:8px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#6b7280">S</div>
        </div>
      </div>
      ${backingSVG}
      <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
        <div style="flex:1;height:4px;background:#1a1a2e;border-radius:999px;overflow:hidden"><div style="width:60%;height:100%;background:#a78bfa55;border-radius:999px"></div></div>
        <span style="font-size:0.6rem;color:#6b7280">60%</span>
        <div style="padding:6px 12px;border-radius:8px;background:#1f2937;font-size:0.7rem;font-weight:600;color:#d1d5db">↑ Upload</div>
      </div>
    </div>

    <!-- Offset panel -->
    <div style="${pn}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="${lbl}">Vocal Delay / Beat-Match Offset</span>
        <span style="font-size:0.68rem;font-weight:700;font-family:monospace;color:#374151">0 ms</span>
      </div>
      <div style="width:100%;height:4px;background:#1a1a2e;border-radius:999px;overflow:hidden">
        <div style="width:50%;height:100%;background:#374151;border-radius:999px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="font-size:0.58rem;color:#374151">← Vocal early (−1s)</span>
        <span style="font-size:0.58rem;color:#475569">⟵ drag to sync ⟶</span>
        <span style="font-size:0.58rem;color:#374151">Vocal late (+1s) →</span>
      </div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #1a1a2e;display:flex;align-items:center;gap:10px">
        <div style="padding:6px 14px;border-radius:8px;background:#111118;color:#374151;font-size:0.7rem;font-weight:700;border:1px solid #1a1a2e">⚡ Sync Voice to Beat</div>
        <span style="font-size:0.6rem;color:#374151">Requires both tracks to be loaded in the ZaraForge builder</span>
      </div>
    </div>

    <!-- Transport -->
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:${accent};font-size:0.75rem;font-weight:700;color:#000;opacity:0.35">⚡ Apply Auto-Tune</div>
      <div style="display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:#1f2937;font-size:0.75rem;font-weight:700;color:#fff;opacity:0.35">▶ Play Mix</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px;padding:9px 18px;border-radius:10px;background:#059669;font-size:0.75rem;font-weight:700;color:#fff;opacity:0.35">↓ Render &amp; Download WAV</div>
    </div>

  </div>
</section>`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Generates a static SVG waveform bar graphic — runs at export time so the
// bars are baked directly into the HTML output (no client-side JS required).
function staticWaveformSVG(color, seed = 0) {
  const W = 600, H = 52, barW = 2, gap = 1
  const rects = []
  for (let x = 0; x < W; x += barW + gap) {
    const t = x / W
    const amp =
      Math.abs(Math.sin(t * Math.PI * 13 + 0.5 + seed)) * 0.55 +
      Math.abs(Math.sin(t * Math.PI * 31 + 1.1 + seed)) * 0.28 +
      Math.abs(Math.sin(t * Math.PI * 7  + 2.3 + seed)) * 0.17
    const h = amp * H * 0.88
    const y = (H - h) / 2
    rects.push(`<rect x="${x}" y="${y.toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" fill="${color}" opacity="0.22"/>`)
  }
  // Hairline center guide
  rects.push(`<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="${color}" stroke-width="0.5" opacity="0.07"/>`)
  return `<svg width="100%" height="52" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;border-radius:8px;background:#07070d">${rects.join('')}</svg>`
}

function shiftColor(hex, amount) {
  try {
    const n = parseInt(hex.replace('#', ''), 16)
    const clamp = v => Math.min(255, Math.max(0, v))
    const r = clamp((n >> 16) + amount)
    const g = clamp(((n >> 8) & 0xff) + amount)
    const b = clamp((n & 0xff) + amount)
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
  } catch { return hex }
}

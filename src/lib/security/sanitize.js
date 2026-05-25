// ── Input Sanitization ────────────────────────────────────────────────────────
// Strips malicious payloads from admin-injected tracking HTML.
// Uses the browser's own parser as a sandboxed DOM (same approach as DOMPurify).

const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data):/i

const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /document\.write\s*\(/i,
  /eval\s*\(/i,
  /setTimeout\s*\(\s*["'`]/i,
  /setInterval\s*\(\s*["'`]/i,
  /new\s+Function\s*\(/i,
  /window\s*\[/i,
  /location\s*\.\s*href\s*=/i,
  /localStorage\s*\./i,
  /sessionStorage\s*\./i,
  /document\.cookie/i,
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /import\s*\(/i,
]

export function sanitizeTrackingHTML(raw) {
  if (!raw || typeof raw !== 'string') return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<html><head>${raw}</head></html>`, 'text/html')

  const approved = []
  doc.querySelectorAll('script').forEach(s => {
    if (s.src) {
      const url = s.src.trim()
      if (DANGEROUS_PROTOCOLS.test(url)) return
      if (!url.startsWith('https://')) return  // HTTPS only
    }

    if (s.textContent) {
      for (const pat of DANGEROUS_PATTERNS) {
        if (pat.test(s.textContent)) return  // reject on any dangerous pattern
      }
    }

    // Build clean output as string — no document.createElement needed
    const SAFE_ATTRS = ['data-cookieconsent', 'id', 'nonce']
    let tag = '<script'
    if (s.src) {
      tag += ` src="${escAttr(s.src)}" async`
    }
    // Safe attributes only
    if (s.attributes) {
      Array.from(s.attributes).forEach(a => {
        if (SAFE_ATTRS.includes(a.name)) tag += ` ${a.name}="${escAttr(a.value)}"`
      })
    }
    if (s.src) {
      tag += '></script>'
    } else {
      tag += `>${s.textContent}<\/script>`
    }
    approved.push(tag)
  })

  return approved.join('\n')
}

function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function sanitizeText(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

import { generateHTML } from './codeGenerator'

function extractBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return m ? m[1].trim() : html
}

function extractStyle(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/i)
  return m ? m[1] : ''
}

function extractLinks(html) {
  const links = []
  const re = /<link[^>]*>/gi
  let m
  while ((m = re.exec(html)) !== null) links.push(m[0])
  return links.join('\n  ')
}

export function compileProject(pages) {
  if (!pages || pages.length === 0) return ''
  if (pages.length === 1) return generateHTML(pages[0].schema)

  const pageHTMLs = pages.map(page => ({
    id:   page.id,
    name: page.name,
    body: extractBody(generateHTML(page.schema)),
  }))

  const firstHTML = generateHTML(pages[0].schema)
  const baseLinks = extractLinks(firstHTML)
  const baseStyle = extractStyle(firstHTML)

  const pageNavLinks = pages.map(page =>
    `<a href="#${page.id}" class="zf-tab" data-page="${page.id}">${page.name}</a>`
  ).join('\n        ')

  const pageDivs = pageHTMLs.map((p, i) =>
    `<div id="${p.id}" class="zf-page"${i !== 0 ? ' style="display:none"' : ''}>\n${p.body}\n</div>`
  ).join('\n\n')

  const pageIds = JSON.stringify(pages.map(p => p.id))
  const firstId = pages[0].id

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Website</title>
  ${baseLinks}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${baseStyle}
    .zf-nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      display: flex; align-items: center; gap: 4px;
      padding: 8px 20px;
      background: rgba(6,6,16,0.94); backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      font-family: system-ui, -apple-system, sans-serif;
    }
    .zf-brand { font-size: 13px; font-weight: 700; color: #00e5ff; margin-right: 10px; letter-spacing: -0.3px; }
    .zf-tab {
      padding: 5px 14px; border-radius: 8px;
      font-size: 12px; font-weight: 600; text-decoration: none;
      color: #94a3b8; transition: all 0.15s;
      border: 1px solid transparent;
    }
    .zf-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.06); }
    .zf-tab.active {
      color: #fff; background: rgba(99,102,241,0.22);
      border-color: rgba(99,102,241,0.4);
    }
    body { padding-top: 48px; }
  </style>
</head>
<body>

  <nav class="zf-nav">
    <span class="zf-brand">&#9889; ZaraForge</span>
        ${pageNavLinks}
  </nav>

${pageDivs}

<script>
(function () {
  var pages = ${pageIds};
  var first = '${firstId}';

  function show(id) {
    if (!pages.includes(id)) id = first;
    pages.forEach(function (pid) {
      var el = document.getElementById(pid);
      if (el) el.style.display = pid === id ? 'block' : 'none';
    });
    document.querySelectorAll('.zf-tab').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === id);
    });
  }

  function hash() { return location.hash.slice(1) || first; }

  window.addEventListener('hashchange', function () { show(hash()); });
  show(hash());

  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    var active = document.querySelector('.zf-tab.active');
    window.parent.postMessage({
      type: 'FORM_SUBMIT',
      page: active ? active.textContent.trim() : '',
      endpoint: form.dataset.endpoint || '',
      data: data,
      ts: new Date().toISOString(),
    }, '*');
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-nav-page]');
    if (!btn) return;
    var target = btn.dataset.navPage;
    if (pages.includes(target)) { location.hash = target; e.preventDefault(); }
  });
})();
</script>

</body>
</html>`
}

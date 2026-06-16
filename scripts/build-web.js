const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function joinUrl(baseUrl, pathname = '') {
  const base = normalizeBaseUrl(baseUrl);
  const pathPart = String(pathname || '').replace(/^\/+/, '');
  return pathPart ? `${base}/${pathPart}` : base;
}

function getDefaultLocale(data) {
  return data.site?.default_locale || 'en_US';
}

function getLocaleView(data, locale) {
  const localeData = data.locales?.[locale] || {};
  return {
    header: {
      ...data.header,
      ...(localeData.header || {})
    },
    site: {
      ...data.site,
      ...(localeData.site || {})
    },
    labels: localeData.labels || {},
    summary: localeData.summary || '',
    resume_summary: localeData.resume_summary || localeData.summary || ''
  };
}

function buildHtmlShell({ title, description, canonicalUrl, locale, pageMode, scriptName }) {
  return `<!DOCTYPE html>
<html lang="${escapeHtml(String(locale || 'en_US').split('_')[0] || 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Elielson Machado Silva">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="stylesheet" href="./styles/main.css">
  <script defer src="./assets/${scriptName}.js"></script>
</head>
<body class="page-${escapeHtml(pageMode)}">
  <div id="root"></div>
</body>
</html>
`;
}

async function main() {
  const data = readJson('src/generated/portfolio-data.json');
  const defaultLocale = getDefaultLocale(data);
  const defaultView = getLocaleView(data, defaultLocale);
  const baseCanonicalUrl = normalizeBaseUrl(defaultView.site.url || defaultView.header.portfolio || '');

  await esbuild.build({
    entryPoints: {
      index: 'src/main.jsx',
      portfolio: 'src/portfolio.jsx'
    },
    bundle: true,
    outdir: 'dist/assets',
    format: 'iife',
    platform: 'browser',
    target: ['es2019'],
    entryNames: '[name]',
    splitting: false,
    minify: true,
    sourcemap: false,
    jsx: 'automatic',
    loader: {
      '.json': 'json'
    }
  });

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync(
    path.join('dist', 'index.html'),
    buildHtmlShell({
      title: defaultView.site.title || `${defaultView.header.name} - Resume`,
      description: defaultView.site.description || defaultView.resume_summary || '',
      canonicalUrl: baseCanonicalUrl,
      locale: defaultLocale,
      pageMode: 'resume',
      scriptName: 'index'
    })
  );
  fs.writeFileSync(
    path.join('dist', 'portfolio.html'),
    buildHtmlShell({
      title: defaultView.labels.technical_page_title || `${defaultView.header.name} | Technical Portfolio`,
      description: defaultView.labels.technical_page_description || defaultView.summary || '',
      canonicalUrl: joinUrl(baseCanonicalUrl, 'portfolio.html'),
      locale: defaultLocale,
      pageMode: 'portfolio',
      scriptName: 'portfolio'
    })
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

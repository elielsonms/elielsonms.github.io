const fs = require('fs');
const path = require('path');

function loadData() {
  const filePath = path.join(process.cwd(), 'src/generated/portfolio-data.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function joinUrl(baseUrl, pathname = '') {
  const base = normalizeBaseUrl(baseUrl);
  const pathPart = String(pathname || '').replace(/^\/+/, '');
  return pathPart ? `${base}/${pathPart}` : base;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderRobotsTxt(data) {
  const siteUrl = normalizeBaseUrl(data.site?.url || data.header.portfolio);
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function renderSitemapXml(data) {
  const siteUrl = normalizeBaseUrl(data.site?.url || data.header.portfolio);
  const pages = ['', 'portfolio.html'];

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url>\n    <loc>${escapeHtml(joinUrl(siteUrl, page))}</loc>\n  </url>`).join('\n')}\n</urlset>\n`;
}

function writeOutput(relativePath, content) {
  const targetPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}

const data = loadData();
writeOutput('dist/robots.txt', renderRobotsTxt(data));
writeOutput('dist/sitemap.xml', renderSitemapXml(data));

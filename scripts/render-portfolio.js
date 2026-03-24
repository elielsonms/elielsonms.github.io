const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function loadData() {
  const output = execFileSync(
    'sh',
    ['scripts/run-python.sh', 'scripts/print_data_json.py'],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  return JSON.parse(output);
}

function readTemplate(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function ensureDir(relativePath) {
  fs.mkdirSync(path.join(process.cwd(), relativePath), { recursive: true });
}

function writeOutput(relativePath, content) {
  fs.writeFileSync(path.join(process.cwd(), relativePath), content);
}

function copyFile(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(process.cwd(), sourceRelativePath);
  const targetPath = path.join(process.cwd(), targetRelativePath);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function copyStaticAssets() {
  copyFile('styles/main.css', 'dist/styles/main.css');
  copyFile('scripts/email-reveal.js', 'dist/scripts/email-reveal.js');
}

function injectContent(html, id, content) {
  const elementRegex = new RegExp(
    `(<[^>]+id="${id}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`
  );

  if (!elementRegex.test(html)) {
    throw new Error(`Template marker not found: ${id}`);
  }

  return html.replace(elementRegex, `$1${content}$3`);
}

function slugifyFileName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPdfFileName(name) {
  return `${slugifyFileName(name)}.pdf`;
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function joinUrl(baseUrl, pathname = '') {
  const base = normalizeBaseUrl(baseUrl);
  const pathPart = String(pathname || '').replace(/^\/+/, '');
  return pathPart ? `${base}/${pathPart}` : base;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function applyTemplateReplacements(template, replacements) {
  return Object.entries(replacements).reduce((html, [token, value]) => {
    return html.split(token).join(value);
  }, template);
}

function obfuscateEmail(parts) {
  const [localPart, domain] = parts;
  const email = `${localPart}@${domain}`;
  const obfuscatedEmail = email.split('').join('&#8203;');
  const localCodes = localPart.split('').map(char => char.charCodeAt(0)).join(',');
  const domainCodes = domain.split('').map(char => char.charCodeAt(0)).join(',');

  return `<span class="email-obfuscated" data-local-codes="${localCodes}" data-domain-codes="${domainCodes}">${obfuscatedEmail}</span>`;
}

function renderExperienceItems(experience, options = {}) {
  return experience.map(exp => {
    const highlightsHtml = exp.highlights.length > 0
      ? `
    <div class="highlights">
      ${exp.highlights.map(h => `<span class="highlight">${escapeHtml(h)}</span>`).join('')}
    </div>`
      : '';

    const durationHtml = options.showDuration && exp.duration
      ? `<div class="exp-duration">${escapeHtml(exp.duration)}</div>`
      : '';

    return `
  <div class="experience-item">
    <div class="exp-header">
      <div>
        <div class="exp-title">${escapeHtml(exp.title)}</div>
        <div class="exp-company">${escapeHtml(exp.company)}</div>
      </div>
      <div class="exp-period-wrap">
        <div class="exp-period">${escapeHtml(exp.period)}</div>
        ${durationHtml}
      </div>
    </div>
    <div class="exp-description">${escapeHtml(exp.description)}</div>${highlightsHtml}
  </div>`;
  }).join('');
}

function renderEducationItems(education) {
  return education.map(edu => `
  <div class="edu-item">
    <div class="edu-degree">${escapeHtml(edu.degree)}</div>
    <div class="edu-institution">${escapeHtml(edu.institution)}</div>
    <div class="edu-year">${escapeHtml(edu.year)}</div>
  </div>`).join('');
}

function renderCertifications(certifications, className = 'cert-item') {
  return certifications.map(cert => `
  <div class="${className}">${escapeHtml(cert)}</div>`).join('');
}

function renderSkills(skills, tagName = 'span') {
  return skills.map(skill => `
  <${tagName} class="skill">${escapeHtml(skill)}</${tagName}>`).join('');
}

function buildAnalyticsHead(data) {
  const measurementId = data.analytics?.google_measurement_id;

  if (!measurementId) {
    return '';
  }

  return `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(measurementId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${escapeHtml(measurementId)}');
  </script>`;
}

function buildStructuredData(data, canonicalUrl) {
  const site = data.site || {};
  const portfolioUrl = data.header.portfolio || site.url || canonicalUrl;
  const email = `${data.header.email_parts[0]}@${data.header.email_parts[1]}`;
  const sameAs = [
    data.header.github ? `https://github.com/${data.header.github}` : null,
    portfolioUrl || null
  ].filter(Boolean);

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.header.name,
    url: portfolioUrl,
    email: `mailto:${email}`,
    jobTitle: data.header.title,
    address: {
      '@type': 'PostalAddress',
      addressLocality: data.header.location
    },
    sameAs
  };

  return `<script type="application/ld+json">${escapeJsonForHtml(payload)}</script>`;
}

function renderRobotsTxt(data) {
  const siteUrl = normalizeBaseUrl(data.site?.url || data.header.portfolio);

  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

function renderSitemapXml(data) {
  const siteUrl = normalizeBaseUrl(data.site?.url || data.header.portfolio);
  const homepage = joinUrl(siteUrl, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeHtml(homepage)}</loc>
  </url>
</urlset>
`;
}

function renderWebHtml(data) {
  const template = readTemplate('public/index.html');
  const pdfFileName = buildPdfFileName(data.header.name);
  const site = data.site || {};
  const canonicalUrl = normalizeBaseUrl(site.url || data.header.portfolio);
  const siteTitle = site.title || `${data.header.name} - Portfolio`;
  const metaDescription = normalizeText(site.description || data.summary);
  const metaKeywords = Array.isArray(site.keywords) ? site.keywords.join(', ') : '';
  const htmlLang = String(site.locale || 'en_US').split('_')[0] || 'en';
  const ogLocale = site.locale || 'en_US';
  const socialImage = site.social_image ? joinUrl(canonicalUrl, site.social_image) : '';
  const githubHtml = data.header.github
    ? `
    <a href="https://github.com/${escapeHtml(data.header.github)}" class="inline-link subtle-link" target="_blank" rel="noopener">
      GitHub
    </a>`
    : '';
  const downloadHtml = `
    <a href="./${escapeHtml(pdfFileName)}" class="inline-link subtle-link" download target="_blank">
      PDF Resume
    </a>`;

  const headerHtml = `
  <div class="header-left">
    <div class="header-eyebrow">Portfolio</div>
    <h1>${escapeHtml(data.header.name)}</h1>
    <p class="header-role">${escapeHtml(data.header.title)}</p>
    <div class="header-secondary-links">
      ${githubHtml}
      ${downloadHtml}
    </div>
  </div>
  <div class="header-right">
    <div class="header-meta">
      <div class="header-meta-item">
        <span class="meta-label">Location</span>
        <span class="meta-value">${escapeHtml(data.header.location)}</span>
      </div>
      <div class="header-meta-item">
        <span class="meta-label">Email</span>
        <span class="meta-value">${obfuscateEmail(data.header.email_parts)}</span>
      </div>
      <div class="header-meta-item">
        <span class="meta-label">WhatsApp</span>
        <span class="meta-value">
          <a href="https://wa.me/${escapeHtml(data.header.whatsapp)}" class="meta-link" target="_blank" rel="noopener">
            +${escapeHtml(data.header.whatsapp)}
          </a>
        </span>
      </div>
    </div>
  </div>
`;

  let finalHtml = applyTemplateReplacements(template, {
    '{{NAME}}': escapeHtml(data.header.name),
    '{{PDF_FILE_NAME}}': escapeHtml(pdfFileName),
    '{{HTML_LANG}}': escapeHtml(htmlLang),
    '{{PAGE_TITLE}}': escapeHtml(siteTitle),
    '{{META_DESCRIPTION}}': escapeHtml(metaDescription),
    '{{META_KEYWORDS}}': escapeHtml(metaKeywords),
    '{{CANONICAL_URL}}': escapeHtml(canonicalUrl),
    '{{SITE_NAME}}': escapeHtml(data.header.name),
    '{{OG_LOCALE}}': escapeHtml(ogLocale),
    '{{OG_IMAGE_TAG}}': socialImage
      ? `<meta property="og:image" content="${escapeHtml(socialImage)}">`
      : '',
    '{{TWITTER_CARD}}': socialImage ? 'summary_large_image' : 'summary',
    '{{TWITTER_IMAGE_TAG}}': socialImage
      ? `<meta name="twitter:image" content="${escapeHtml(socialImage)}">`
      : '',
    '{{GOOGLE_SITE_VERIFICATION_TAG}}': site.google_site_verification
      ? `<meta name="google-site-verification" content="${escapeHtml(site.google_site_verification)}">`
      : '',
    '{{STRUCTURED_DATA}}': buildStructuredData(data, canonicalUrl),
    '{{ANALYTICS_HEAD}}': buildAnalyticsHead(data)
  });
  finalHtml = injectContent(finalHtml, 'header-template', headerHtml);
  finalHtml = injectContent(finalHtml, 'summary-content', escapeHtml(data.summary));
  finalHtml = injectContent(finalHtml, 'experience-list', renderExperienceItems(data.experience));
  finalHtml = injectContent(finalHtml, 'education-list', renderEducationItems(data.education));
  finalHtml = injectContent(finalHtml, 'certs-list', renderCertifications(data.certifications));
  finalHtml = injectContent(finalHtml, 'skills-list', renderSkills(data.skills));

  return {
    html: finalHtml,
    pdfFileName,
    robotsTxt: renderRobotsTxt(data),
    sitemapXml: renderSitemapXml(data)
  };
}

module.exports = {
  buildPdfFileName,
  copyStaticAssets,
  ensureDir,
  loadData,
  renderWebHtml,
  writeOutput
};

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
  copyFile('scripts/language-switcher.js', 'dist/scripts/language-switcher.js');
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
  const highlightsLabel = options.highlightsLabel || 'Highlights';

  return experience.map(exp => {
    const highlights = Array.isArray(exp.highlights) ? exp.highlights : [];
    const highlightsHtml = highlights.length > 0
      ? `
    <div class="highlights-label">${escapeHtml(highlightsLabel)}</div>
    <div class="highlights">
      ${highlights.map(h => `<span class="highlight">${escapeHtml(h)}</span>`).join('')}
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

function getDefaultLocale(data) {
  return data.site?.default_locale || 'en_US';
}

function getSupportedLocales(data) {
  const locales = data.site?.supported_locales;
  return Array.isArray(locales) && locales.length > 0 ? locales : [getDefaultLocale(data)];
}

function resolveLocaleData(data, locale) {
  const localeKey = locale || getDefaultLocale(data);
  const localeData = data.locales?.[localeKey];

  if (!localeData) {
    throw new Error(`Unsupported locale: ${localeKey}`);
  }

  return {
    locale: localeKey,
    labels: localeData.labels || {},
    header: {
      ...data.header,
      ...(localeData.header || {})
    },
    site: {
      ...data.site,
      ...(localeData.site || {})
    },
    summary: localeData.summary || '',
    experience: localeData.experience || [],
    education: localeData.education || [],
    certifications: localeData.certifications || [],
    skills: localeData.skills || []
  };
}

function buildLocalizedPdfFileName(name, locale, defaultLocale) {
  const baseFileName = buildPdfFileName(name);
  if (locale === defaultLocale) {
    return baseFileName;
  }

  const extensionIndex = baseFileName.lastIndexOf('.');
  return `${baseFileName.slice(0, extensionIndex)}.${locale.replace('_', '-')}${baseFileName.slice(extensionIndex)}`;
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

function renderLanguageSwitcher(supportedLocales, activeLocale) {
  const localeLabels = {
    en_US: 'EN',
    pt_BR: 'PT'
  };

  return `
    <div class="language-switcher" role="group" aria-label="Language switcher">
      ${supportedLocales.map(locale => `
        <button
          type="button"
          class="language-button${locale === activeLocale ? ' is-active' : ''}"
          data-locale-button="${escapeHtml(locale)}"
          aria-pressed="${locale === activeLocale ? 'true' : 'false'}"
        >
          ${escapeHtml(localeLabels[locale] || locale)}
        </button>`).join('')}
    </div>`;
}

function buildLocaleView(data, locale) {
  const resolved = resolveLocaleData(data, locale);
  const defaultLocale = getDefaultLocale(data);
  const pdfFileName = buildLocalizedPdfFileName(resolved.header.name, locale, defaultLocale);
  const site = resolved.site || {};
  const labels = resolved.labels || {};
  const canonicalUrl = normalizeBaseUrl(site.url || resolved.header.portfolio);
  const siteTitle = site.title || `${resolved.header.name} - Portfolio`;
  const metaDescription = normalizeText(site.description || resolved.summary);
  const metaKeywords = Array.isArray(site.keywords) ? site.keywords.join(', ') : '';
  const htmlLang = String(site.locale || locale || 'en_US').split('_')[0] || 'en';
  const ogLocale = site.locale || locale || 'en_US';
  const socialImage = site.social_image ? joinUrl(canonicalUrl, site.social_image) : '';
  const supportedLocales = getSupportedLocales(data);
  const githubHtml = resolved.header.github
    ? `
    <a href="https://github.com/${escapeHtml(resolved.header.github)}" class="inline-link subtle-link" target="_blank" rel="noopener" data-analytics-link="github">
      ${escapeHtml(labels.github || 'GitHub')}
    </a>`
    : '';
  const downloadHtml = `
    <a href="./${escapeHtml(pdfFileName)}" class="inline-link subtle-link" download target="_blank" data-analytics-link="resume_pdf">
      ${escapeHtml(labels.pdf_resume || 'PDF Resume')}
    </a>`;

  const headerHtml = `
  <div class="header-left">
    <div class="header-eyebrow-row">
      <div class="header-eyebrow">${escapeHtml(labels.eyebrow || 'Portfolio')}</div>
      ${renderLanguageSwitcher(supportedLocales, locale)}
    </div>
    <h1>${escapeHtml(resolved.header.name)}</h1>
    <p class="header-role">${escapeHtml(resolved.header.title)}</p>
    <div class="header-secondary-links">
      ${githubHtml}
      ${downloadHtml}
    </div>
  </div>
  <div class="header-right">
    <div class="header-meta">
      <div class="header-meta-item">
        <span class="meta-label">${escapeHtml(labels.location || 'Location')}</span>
        <span class="meta-value">${escapeHtml(resolved.header.location)}</span>
      </div>
      <div class="header-meta-item">
        <span class="meta-label">${escapeHtml(labels.email || 'Email')}</span>
        <span class="meta-value">${obfuscateEmail(resolved.header.email_parts)}</span>
      </div>
      <div class="header-meta-item">
        <span class="meta-label">${escapeHtml(labels.whatsapp || 'WhatsApp')}</span>
        <span class="meta-value">
          <a href="https://wa.me/${escapeHtml(resolved.header.whatsapp)}" class="meta-link" target="_blank" rel="noopener">
            +${escapeHtml(resolved.header.whatsapp)}
          </a>
        </span>
      </div>
    </div>
  </div>
`;

  return {
    locale,
    htmlLang,
    pageTitle: siteTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogLocale,
    socialImage,
    pdfFileName,
    labels,
    sections: {
      header: headerHtml,
      summary: escapeHtml(resolved.summary),
      experience: renderExperienceItems(resolved.experience, {
        highlightsLabel: labels.highlights || 'Highlights'
      }),
      education: renderEducationItems(resolved.education),
      certifications: renderCertifications(resolved.certifications),
      skills: renderSkills(resolved.skills)
    }
  };
}

function renderWebHtml(data) {
  const template = readTemplate('public/index.html');
  const defaultLocale = getDefaultLocale(data);
  const defaultView = buildLocaleView(data, defaultLocale);
  const localeViews = getSupportedLocales(data).reduce((acc, locale) => {
    acc[locale] = buildLocaleView(data, locale);
    return acc;
  }, {});

  let finalHtml = applyTemplateReplacements(template, {
    '{{NAME}}': escapeHtml(data.header.name),
    '{{PDF_FILE_NAME}}': escapeHtml(defaultView.pdfFileName),
    '{{HTML_LANG}}': escapeHtml(defaultView.htmlLang),
    '{{PAGE_TITLE}}': escapeHtml(defaultView.pageTitle),
    '{{META_DESCRIPTION}}': escapeHtml(defaultView.metaDescription),
    '{{META_KEYWORDS}}': escapeHtml(defaultView.metaKeywords),
    '{{CANONICAL_URL}}': escapeHtml(defaultView.canonicalUrl),
    '{{SITE_NAME}}': escapeHtml(data.header.name),
    '{{OG_LOCALE}}': escapeHtml(defaultView.ogLocale),
    '{{OG_IMAGE_TAG}}': defaultView.socialImage
      ? `<meta property="og:image" content="${escapeHtml(defaultView.socialImage)}">`
      : '',
    '{{TWITTER_CARD}}': defaultView.socialImage ? 'summary_large_image' : 'summary',
    '{{TWITTER_IMAGE_TAG}}': defaultView.socialImage
      ? `<meta name="twitter:image" content="${escapeHtml(defaultView.socialImage)}">`
      : '',
    '{{GOOGLE_SITE_VERIFICATION_TAG}}': data.site?.google_site_verification
      ? `<meta name="google-site-verification" content="${escapeHtml(data.site.google_site_verification)}">`
      : '',
    '{{STRUCTURED_DATA}}': buildStructuredData(resolveLocaleData(data, defaultLocale), defaultView.canonicalUrl),
    '{{ANALYTICS_HEAD}}': buildAnalyticsHead(data),
    '{{I18N_DATA}}': `<script>window.PORTFOLIO_I18N=${escapeJsonForHtml({
      defaultLocale,
      locales: localeViews
    })};</script>`
  });
  finalHtml = injectContent(finalHtml, 'header-template', defaultView.sections.header);
  finalHtml = injectContent(finalHtml, 'about-title', escapeHtml(defaultView.labels.about || 'About'));
  finalHtml = injectContent(finalHtml, 'summary-content', defaultView.sections.summary);
  finalHtml = injectContent(finalHtml, 'experience-title', escapeHtml(defaultView.labels.experience || 'Experience'));
  finalHtml = injectContent(finalHtml, 'experience-list', defaultView.sections.experience);
  finalHtml = injectContent(finalHtml, 'education-title', escapeHtml(defaultView.labels.education || 'Education'));
  finalHtml = injectContent(finalHtml, 'education-list', defaultView.sections.education);
  finalHtml = injectContent(finalHtml, 'certs-title', escapeHtml(defaultView.labels.certifications || 'Certifications & Awards'));
  finalHtml = injectContent(finalHtml, 'certs-list', defaultView.sections.certifications);
  finalHtml = injectContent(finalHtml, 'skills-title', escapeHtml(defaultView.labels.skills || 'Skills'));
  finalHtml = injectContent(finalHtml, 'skills-list', defaultView.sections.skills);

  return {
    html: finalHtml,
    pdfFileName: defaultView.pdfFileName,
    robotsTxt: renderRobotsTxt(data),
    sitemapXml: renderSitemapXml(data)
  };
}

module.exports = {
  buildLocalizedPdfFileName,
  buildPdfFileName,
  copyStaticAssets,
  ensureDir,
  getDefaultLocale,
  loadData,
  resolveLocaleData,
  renderWebHtml,
  writeOutput
};

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const h = React.createElement;

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

function buildPdfFileName(name, variant = '') {
  const baseFileName = `${slugifyFileName(name)}.pdf`;

  if (!variant) {
    return baseFileName;
  }

  const extensionIndex = baseFileName.lastIndexOf('.');
  return `${baseFileName.slice(0, extensionIndex)}-${variant}${baseFileName.slice(extensionIndex)}`;
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

function parsePeriodMonthYear(period, locale) {
  const normalizedLocale = String(locale || '');
  const parts = String(period || '').split(' - ').map(part => part.trim());

  if (parts.length !== 2) {
    return null;
  }

  if (normalizedLocale === 'pt_BR') {
    const months = {
      'jan.': 1,
      'fev.': 2,
      'mar.': 3,
      'abr.': 4,
      'maio': 5,
      'jun.': 6,
      'jul.': 7,
      'ago.': 8,
      'set.': 9,
      'out.': 10,
      'nov.': 11,
      'dez.': 12
    };
    const parsed = parts.map(part => {
      const match = part.match(/^(.+?) de (\d{4})$/);

      if (!match || !months[match[1]]) {
        return null;
      }

      return {
        month: months[match[1]],
        year: Number(match[2])
      };
    });

    return parsed.every(Boolean) ? parsed : null;
  }

  const months = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12
  };
  const parsed = parts.map(part => {
    const match = part.match(/^([A-Z][a-z]{2}) (\d{4})$/);

    if (!match || !months[match[1]]) {
      return null;
    }

    return {
      month: months[match[1]],
      year: Number(match[2])
    };
  });

  return parsed.every(Boolean) ? parsed : null;
}

function formatDurationFromPeriod(period, locale, fallbackDuration = '') {
  const parsed = parsePeriodMonthYear(period, locale);

  if (!parsed) {
    return fallbackDuration || '';
  }

  const [start, end] = parsed;
  const totalMonths = ((end.year - start.year) * 12) + (end.month - start.month);

  if (totalMonths < 0) {
    return fallbackDuration || '';
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (locale === 'pt_BR') {
    if (years > 0 && months > 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`;
    }

    if (years > 0) {
      return `${years} ${years === 1 ? 'ano' : 'anos'}`;
    }

    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }

  if (years > 0 && months > 0) {
    return `${years} ${years === 1 ? 'year' : 'years'} and ${months} ${months === 1 ? 'month' : 'months'}`;
  }

  if (years > 0) {
    return `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

function obfuscateEmail(parts) {
  const [localPart, domain] = parts;
  const email = `${localPart}@${domain}`;
  const obfuscatedEmail = email.split('').join('\u200B');
  const localCodes = localPart.split('').map(char => char.charCodeAt(0)).join(',');
  const domainCodes = domain.split('').map(char => char.charCodeAt(0)).join(',');

  return h(
    'span',
    {
      className: 'email-obfuscated',
      'data-local-codes': localCodes,
      'data-domain-codes': domainCodes
    },
    obfuscatedEmail
  );
}

function renderExperienceItems(experience, options = {}) {
  const highlightsLabel = options.highlightsLabel || 'Highlights';
  const locale = options.locale || 'en_US';

  return experience.map(exp => {
    const highlights = Array.isArray(exp.highlights) ? exp.highlights : [];
    const computedDuration = formatDurationFromPeriod(exp.period, locale, exp.duration);
    const periodText = options.showDuration && computedDuration
      ? `${exp.period} · ${computedDuration}`
      : exp.period;

    return h(
      'div',
      { className: 'experience-item', key: `${exp.company}-${exp.title}-${exp.period}` },
      h(
        'div',
        { className: 'exp-header' },
        h(
          'div',
          null,
          h('div', { className: 'exp-title' }, exp.title),
          h('div', { className: 'exp-company' }, exp.company)
        ),
        h(
          'div',
          { className: 'exp-period-wrap' },
          h('div', { className: 'exp-period' }, periodText)
        )
      ),
      h('div', { className: 'exp-description' }, exp.description),
      highlights.length > 0
        ? h(
            React.Fragment,
            null,
            h('div', { className: 'highlights-label' }, highlightsLabel),
            h(
              'div',
              { className: 'highlights' },
              highlights.map(item => h('span', { className: 'highlight', key: item }, item))
            )
          )
        : null
    );
  });
}

function renderEducationItems(education) {
  return education.map(edu => h(
    'div',
    { className: 'edu-item', key: `${edu.degree}-${edu.institution}-${edu.year}` },
    h('div', { className: 'edu-degree' }, edu.degree),
    h('div', { className: 'edu-institution' }, edu.institution),
    h('div', { className: 'edu-year' }, edu.year)
  ));
}

function renderCertifications(certifications, className = 'cert-item') {
  return certifications.map(cert => h('div', { className, key: cert }, cert));
}

function renderCertificationsSection(resolved) {
  const labels = resolved.labels || {};
  const credlyUrl = resolved.header?.credly_badges;
  return h(
    React.Fragment,
    null,
    credlyUrl
      ? h(
          'a',
          {
            className: 'certifications-link',
            href: credlyUrl,
            target: '_blank',
            rel: 'noreferrer'
          },
          labels.credly_badges || 'View badge profile on Credly'
        )
      : null,
    h('div', { className: 'cert-list' }, renderCertifications(resolved.certifications))
  );
}

function renderSkills(skills, tagName = 'span') {
  return skills.map(skill => h(tagName, { className: 'skill', key: skill }, skill));
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
    resumeSummary: localeData.resume_summary || localeData.summary || '',
    resumeHighlights: localeData.resume_highlights || [],
    resumeExperience: localeData.resume_experience || localeData.experience || [],
    resumeSkills: localeData.resume_skills || localeData.skills || [],
    experience: localeData.experience || [],
    education: localeData.education || [],
    certifications: localeData.certifications || [],
    skills: localeData.skills || []
  };
}

function buildLocalizedPdfFileName(name, locale, defaultLocale, variant = '') {
  const baseFileName = buildPdfFileName(name, variant);
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
  const pages = ['', 'portfolio.html'];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${escapeHtml(joinUrl(siteUrl, page))}</loc>
  </url>`).join('\n')}
</urlset>
`;
}

function renderLanguageSwitcher(supportedLocales, activeLocale) {
  const localeLabels = {
    en_US: 'EN',
    pt_BR: 'PT'
  };

  return h(
    'div',
    { className: 'language-switcher', role: 'group', 'aria-label': 'Language switcher' },
    supportedLocales.map(locale => h(
      'button',
      {
        key: locale,
        type: 'button',
        className: `language-button${locale === activeLocale ? ' is-active' : ''}`,
        'data-locale-button': locale,
        'aria-pressed': locale === activeLocale ? 'true' : 'false'
      },
      localeLabels[locale] || locale
    ))
  );
}

function renderSection(title, content, className = '', key = '') {
  const sectionClass = className ? `content-section ${className}` : 'content-section';

  return h(
    'section',
    { className: sectionClass, key },
    h('h2', null, title),
    content
  );
}

function renderStrengthCards(items) {
  return items.map(item => h('article', { className: 'strength-card', key: item }, item));
}

function buildResumeMainHtml(resolved) {
  const labels = resolved.labels || {};
  const technicalPageLabel = labels.view_technical_portfolio || 'View technical portfolio';
  const technicalPageBlurb = labels.technical_portfolio_blurb || 'Need the deep technical version?';

  return [
    renderSection(
      labels.about || 'About',
      h(
        React.Fragment,
        null,
        h('div', { className: 'summary summary-compact' }, resolved.resumeSummary),
        h(
          'div',
          { className: 'view-switch-banner' },
          h(
            'div',
            null,
            h('div', { className: 'view-switch-title' }, technicalPageBlurb),
            h('p', { className: 'view-switch-copy' }, labels.technical_portfolio_copy || 'Architecture, delivery details, broader stack, and full work history are available on a separate page.')
          ),
          h(
            'a',
            {
              href: './portfolio.html',
              className: 'primary-link-pill',
              'data-analytics-link': 'technical_portfolio'
            },
            technicalPageLabel
          )
        )
      ),
      '',
      'about'
    ),
    renderSection(
      labels.core_strengths || 'Core Strengths',
      h('div', { className: 'strength-grid' }, renderStrengthCards(resolved.resumeHighlights)),
      '',
      'core-strengths'
    ),
    renderSection(
      labels.selected_experience || labels.experience || 'Selected Experience',
      h('div', { className: 'experience-list' }, renderExperienceItems(resolved.resumeExperience, {
        highlightsLabel: labels.highlights || 'Highlights',
        showDuration: true,
        locale: resolved.locale
      })),
      'section-experience',
      'selected-experience'
    ),
    renderSection(
      labels.skills || 'Skills',
      h('div', { className: 'skills-grid' }, renderSkills(resolved.resumeSkills)),
      '',
      'skills'
    ),
    renderSection(
      labels.education || 'Education',
      h('div', { className: 'education-list' }, renderEducationItems(resolved.education)),
      'section-education',
      'education'
    ),
    renderSection(
      labels.certifications || 'Certifications & Awards',
      renderCertificationsSection(resolved),
      'section-certifications',
      'certifications'
    )
  ];
}

function buildPortfolioMainHtml(resolved) {
  const labels = resolved.labels || {};

  return [
    renderSection(
      labels.about || 'About',
      h('div', { className: 'summary' }, resolved.summary),
      '',
      'about'
    ),
    renderSection(
      labels.experience || 'Experience',
      h('div', { className: 'experience-list' }, renderExperienceItems(resolved.experience, {
        highlightsLabel: labels.highlights || 'Highlights',
        showDuration: true,
        locale: resolved.locale
      })),
      'section-experience',
      'experience'
    ),
    renderSection(
      labels.skills || 'Skills',
      h('div', { className: 'skills-grid' }, renderSkills(resolved.skills)),
      '',
      'skills'
    ),
    renderSection(
      labels.education || 'Education',
      h('div', { className: 'education-list' }, renderEducationItems(resolved.education)),
      'section-education',
      'education'
    ),
    renderSection(
      labels.certifications || 'Certifications & Awards',
      renderCertificationsSection(resolved),
      'section-certifications',
      'certifications'
    )
  ];
}

function buildHeaderHtml({ resolved, locale, pageMode, supportedLocales, pdfFileNames }) {
  const labels = resolved.labels || {};
  const isResumePage = pageMode === 'resume';
  const pageEyebrow = isResumePage
    ? (labels.resume_eyebrow || labels.resume_title || 'Resume')
    : (labels.technical_portfolio || 'Technical Portfolio');
  const pageSwitchHref = isResumePage ? './portfolio.html' : './index.html';
  const pageSwitchLabel = isResumePage
    ? (labels.view_technical_portfolio || 'View technical portfolio')
    : (labels.back_to_resume || 'Back to resume');
  const resumePdfFileName = pdfFileNames.resume;
  const portfolioPdfFileName = pdfFileNames.portfolio;
  const githubLink = resolved.header.github
    ? h(
        'a',
        {
          href: `https://github.com/${resolved.header.github}`,
          className: 'inline-link subtle-link',
          target: '_blank',
          rel: 'noopener',
          'data-analytics-link': 'github'
        },
        labels.github || 'GitHub'
      )
    : null;
  const downloadLinks = isResumePage
    ? [
        h(
          'a',
          {
            href: `./${resumePdfFileName}`,
            className: 'inline-link subtle-link',
            download: true,
            target: '_blank',
            'data-analytics-link': 'resume_pdf',
            key: 'resume-pdf'
          },
          labels.pdf_resume || 'PDF Resume'
        ),
        h(
          'a',
          {
            href: `./${portfolioPdfFileName}`,
            className: 'inline-link subtle-link',
            download: true,
            target: '_blank',
            'data-analytics-link': 'portfolio_pdf',
            key: 'portfolio-pdf'
          },
          labels.full_portfolio_pdf || 'Full Portfolio PDF'
        )
      ]
    : [
        h(
          'a',
          {
            href: `./${portfolioPdfFileName}`,
            className: 'inline-link subtle-link',
            download: true,
            target: '_blank',
            'data-analytics-link': 'portfolio_pdf',
            key: 'portfolio-pdf'
          },
          labels.full_portfolio_pdf || 'Full Portfolio PDF'
        ),
        h(
          'a',
          {
            href: `./${resumePdfFileName}`,
            className: 'inline-link subtle-link',
            download: true,
            target: '_blank',
            'data-analytics-link': 'resume_pdf',
            key: 'resume-pdf'
          },
          labels.pdf_resume || 'PDF Resume'
        )
      ];

  return h(
    React.Fragment,
    null,
    h(
      'div',
      { className: 'header-left' },
      h(
        'div',
        { className: 'header-eyebrow-row' },
        h('div', { className: 'header-eyebrow' }, pageEyebrow),
        renderLanguageSwitcher(supportedLocales, locale)
      ),
      h('h1', null, resolved.header.name),
      h('p', { className: 'header-role' }, resolved.header.title),
      h(
        'div',
        { className: 'header-secondary-links' },
        h(
          'a',
          {
            href: pageSwitchHref,
            className: 'inline-link primary-subtle-link',
            'data-analytics-link': isResumePage ? 'technical_portfolio' : 'resume_page'
          },
          pageSwitchLabel
        ),
        githubLink,
        ...downloadLinks
      )
    ),
    h(
      'div',
      { className: 'header-right' },
      h(
        'div',
        { className: 'header-meta' },
        h(
          'div',
          { className: 'header-meta-item' },
          h('span', { className: 'meta-label' }, labels.location || 'Location'),
          h('span', { className: 'meta-value' }, resolved.header.location)
        ),
        h(
          'div',
          { className: 'header-meta-item' },
          h('span', { className: 'meta-label' }, labels.email || 'Email'),
          h('span', { className: 'meta-value' }, obfuscateEmail(resolved.header.email_parts))
        ),
        h(
          'div',
          { className: 'header-meta-item' },
          h('span', { className: 'meta-label' }, labels.whatsapp || 'WhatsApp'),
          h(
            'span',
            { className: 'meta-value' },
            h(
              'a',
              {
                href: `https://wa.me/${resolved.header.whatsapp}`,
                className: 'meta-link',
                target: '_blank',
                rel: 'noopener'
              },
              `+${resolved.header.whatsapp}`
            )
          )
        )
      )
    )
  );
}

function buildPageView(data, locale, pageMode) {
  const resolved = resolveLocaleData(data, locale);
  const defaultLocale = getDefaultLocale(data);
  const pdfFileNames = {
    resume: buildLocalizedPdfFileName(resolved.header.name, locale, defaultLocale, 'resume'),
    portfolio: buildLocalizedPdfFileName(resolved.header.name, locale, defaultLocale, 'portfolio')
  };
  const pdfFileName = pageMode === 'resume' ? pdfFileNames.resume : pdfFileNames.portfolio;
  const site = resolved.site || {};
  const labels = resolved.labels || {};
  const baseCanonicalUrl = normalizeBaseUrl(site.url || resolved.header.portfolio);
  const canonicalUrl = pageMode === 'resume'
    ? baseCanonicalUrl
    : joinUrl(baseCanonicalUrl, 'portfolio.html');
  const siteTitle = pageMode === 'resume'
    ? (site.title || `${resolved.header.name} - Resume`)
    : (labels.technical_page_title || `${resolved.header.name} | Technical Portfolio`);
  const metaDescription = pageMode === 'resume'
    ? normalizeText(site.description || resolved.resumeSummary)
    : normalizeText(labels.technical_page_description || resolved.summary);
  const metaKeywords = Array.isArray(site.keywords) ? site.keywords.join(', ') : '';
  const htmlLang = String(site.locale || locale || 'en_US').split('_')[0] || 'en';
  const ogLocale = site.locale || locale || 'en_US';
  const socialImage = site.social_image ? joinUrl(canonicalUrl, site.social_image) : '';
  const supportedLocales = getSupportedLocales(data);
  const headerHtml = buildHeaderHtml({
    resolved,
    locale,
    pageMode,
    supportedLocales,
    pdfFileNames
  });
  const mainHtml = pageMode === 'resume'
    ? buildResumeMainHtml(resolved)
    : buildPortfolioMainHtml(resolved);

  return {
    locale,
    htmlLang,
    pageMode,
    pageTitle: siteTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogLocale,
    socialImage,
    pdfFileName,
    labels,
    pdfFileNames,
    sections: {
      header: renderToStaticMarkup(headerHtml),
      main: renderToStaticMarkup(h('main', null, mainHtml))
    }
  };
}

function renderPageHtml(data, pageMode) {
  const template = readTemplate('public/index.html');
  const defaultLocale = getDefaultLocale(data);
  const defaultView = buildPageView(data, defaultLocale, pageMode);
  const localeViews = getSupportedLocales(data).reduce((acc, locale) => {
    acc[locale] = buildPageView(data, locale, pageMode);
    return acc;
  }, {});

  let finalHtml = applyTemplateReplacements(template, {
    '{{NAME}}': escapeHtml(data.header.name),
    '{{PAGE_CLASS}}': escapeHtml(`page-${pageMode}`),
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
  finalHtml = injectContent(finalHtml, 'page-main', defaultView.sections.main);

  return finalHtml;
}

function renderWebHtml(data) {
  return {
    html: renderPageHtml(data, 'resume'),
    technicalHtml: renderPageHtml(data, 'portfolio'),
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

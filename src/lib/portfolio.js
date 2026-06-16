import portfolioData from '../generated/portfolio-data.json';

export const data = portfolioData;

export function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

export function joinUrl(baseUrl, pathname = '') {
  const base = normalizeBaseUrl(baseUrl);
  const pathPart = String(pathname || '').replace(/^\/+/, '');
  return pathPart ? `${base}/${pathPart}` : base;
}

export function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function slugifyFileName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildPdfFileName(name, variant = '') {
  const baseFileName = `${slugifyFileName(name)}.pdf`;

  if (!variant) {
    return baseFileName;
  }

  const extensionIndex = baseFileName.lastIndexOf('.');
  return `${baseFileName.slice(0, extensionIndex)}-${variant}${baseFileName.slice(extensionIndex)}`;
}

export function getDefaultLocale(source = data) {
  return source.site?.default_locale || 'en_US';
}

export function getSupportedLocales(source = data) {
  const locales = source.site?.supported_locales;
  return Array.isArray(locales) && locales.length > 0 ? locales : [getDefaultLocale(source)];
}

export function resolveLocaleData(source = data, locale) {
  const localeKey = locale || getDefaultLocale(source);
  const localeData = source.locales?.[localeKey];

  if (!localeData) {
    throw new Error(`Unsupported locale: ${localeKey}`);
  }

  return {
    locale: localeKey,
    labels: localeData.labels || {},
    header: {
      ...source.header,
      ...(localeData.header || {})
    },
    site: {
      ...source.site,
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

export function buildLocalizedPdfFileName(name, locale, defaultLocale, variant = '') {
  const baseFileName = buildPdfFileName(name, variant);

  if (locale === defaultLocale) {
    return baseFileName;
  }

  const extensionIndex = baseFileName.lastIndexOf('.');
  return `${baseFileName.slice(0, extensionIndex)}.${locale.replace('_', '-')}${baseFileName.slice(extensionIndex)}`;
}

export function parsePeriodMonthYear(period, locale) {
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

export function formatDurationFromPeriod(period, locale, fallbackDuration = '') {
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

export function getPageView(source = data, pageMode = 'resume', locale) {
  const resolved = resolveLocaleData(source, locale);
  const defaultLocale = getDefaultLocale(source);
  const pdfFileNames = {
    resume: buildLocalizedPdfFileName(resolved.header.name, resolved.locale, defaultLocale, 'resume'),
    portfolio: buildLocalizedPdfFileName(resolved.header.name, resolved.locale, defaultLocale, 'portfolio')
  };
  const site = resolved.site || {};
  const labels = resolved.labels || {};
  const baseCanonicalUrl = normalizeBaseUrl(site.url || resolved.header.portfolio || '');
  const canonicalUrl = pageMode === 'resume'
    ? baseCanonicalUrl
    : joinUrl(baseCanonicalUrl, 'portfolio.html');
  const pageTitle = pageMode === 'resume'
    ? (site.title || `${resolved.header.name} - Resume`)
    : (labels.technical_page_title || `${resolved.header.name} | Technical Portfolio`);
  const metaDescription = pageMode === 'resume'
    ? normalizeText(site.description || resolved.resumeSummary)
    : normalizeText(labels.technical_page_description || resolved.summary);
  const metaKeywords = Array.isArray(site.keywords) ? site.keywords.join(', ') : '';
  const htmlLang = String(site.locale || resolved.locale || 'en_US').split('_')[0] || 'en';
  const ogLocale = site.locale || resolved.locale || 'en_US';
  const socialImage = site.social_image ? joinUrl(canonicalUrl, site.social_image) : '';

  return {
    locale: resolved.locale,
    defaultLocale,
    supportedLocales: getSupportedLocales(source),
    htmlLang,
    pageMode,
    pageTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogLocale,
    socialImage,
    pdfFileNames,
    labels,
    resolved
  };
}

export function buildStructuredData(view) {
  const resolved = view.resolved;
  const site = resolved.site || {};
  const portfolioUrl = resolved.header.portfolio || site.url || view.canonicalUrl;
  const email = `${resolved.header.email_parts[0]}@${resolved.header.email_parts[1]}`;
  const sameAs = [
    resolved.header.github ? `https://github.com/${resolved.header.github}` : null,
    portfolioUrl || null
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: resolved.header.name,
    url: portfolioUrl,
    email: `mailto:${email}`,
    jobTitle: resolved.header.title,
    address: {
      '@type': 'PostalAddress',
      addressLocality: resolved.header.location
    },
    sameAs
  };
}

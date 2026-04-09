document.addEventListener('DOMContentLoaded', function() {
  const payload = window.PORTFOLIO_I18N;

  if (!payload || !payload.locales) {
    return;
  }

  const localeStorageKey = 'portfolio-locale';
  const metaDescription = document.querySelector('meta[name="description"]');
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogUrl = document.querySelector('meta[property="og:url"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  let currentLocale = payload.defaultLocale;

  function trackEvent(eventName, params) {
    if (typeof window.gtag !== 'function') {
      return;
    }

    window.gtag('event', eventName, params);
  }

  function resolveInitialLocale() {
    const storedLocale = window.localStorage.getItem(localeStorageKey);
    if (storedLocale && payload.locales[storedLocale]) {
      return storedLocale;
    }

    return payload.defaultLocale;
  }

  function setMetaTag(element, value) {
    if (element) {
      element.setAttribute('content', value);
    }
  }

  function renderLocale(locale) {
    const view = payload.locales[locale];

    if (!view) {
      return;
    }

    document.documentElement.lang = view.htmlLang;
    document.title = view.pageTitle;

    setMetaTag(metaDescription, view.metaDescription);
    setMetaTag(metaKeywords, view.metaKeywords);
    setMetaTag(ogTitle, view.pageTitle);
    setMetaTag(ogDescription, view.metaDescription);
    setMetaTag(ogUrl, view.canonicalUrl);
    setMetaTag(ogLocale, view.ogLocale);
    setMetaTag(twitterTitle, view.pageTitle);
    setMetaTag(twitterDescription, view.metaDescription);

    if (canonical) {
      canonical.setAttribute('href', view.canonicalUrl);
    }

    document.getElementById('header-template').innerHTML = view.sections.header;
    document.getElementById('about-title').textContent = view.labels.about;
    document.getElementById('summary-content').innerHTML = view.sections.summary;
    document.getElementById('experience-title').textContent = view.labels.experience;
    document.getElementById('experience-list').innerHTML = view.sections.experience;
    document.getElementById('education-title').textContent = view.labels.education;
    document.getElementById('education-list').innerHTML = view.sections.education;
    document.getElementById('certs-title').textContent = view.labels.certifications;
    document.getElementById('certs-list').innerHTML = view.sections.certifications;
    document.getElementById('skills-title').textContent = view.labels.skills;
    document.getElementById('skills-list').innerHTML = view.sections.skills;

    if (window.revealObfuscatedEmails) {
      window.revealObfuscatedEmails(document.getElementById('header-template'));
    }

    currentLocale = locale;
    window.localStorage.setItem(localeStorageKey, locale);
  }

  document.addEventListener('click', function(event) {
    const button = event.target.closest('[data-locale-button]');

    if (button) {
      const nextLocale = button.getAttribute('data-locale-button');

      if (nextLocale && nextLocale !== currentLocale) {
        trackEvent('language_change', {
          event_category: 'engagement',
          event_label: nextLocale,
          from_locale: currentLocale,
          to_locale: nextLocale
        });
      }

      renderLocale(nextLocale);
      return;
    }

    const trackedLink = event.target.closest('[data-analytics-link]');

    if (!trackedLink) {
      return;
    }

    const linkType = trackedLink.getAttribute('data-analytics-link');

    trackEvent('portfolio_click', {
      event_category: 'portfolio_navigation',
      event_label: linkType,
      link_type: linkType,
      locale: currentLocale,
      destination: trackedLink.getAttribute('href') || ''
    });
  });

  renderLocale(resolveInitialLocale());
});

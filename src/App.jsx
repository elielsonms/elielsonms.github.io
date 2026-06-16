import { useEffect, useState } from 'react';
import { data, buildStructuredData, getDefaultLocale, getPageView, getSupportedLocales } from './lib/portfolio';
import { Header } from './components/Header';
import { Section } from './components/Section';
import { ExperienceList } from './components/ExperienceList';

const localeStorageKey = 'portfolio-locale';

function upsertMeta(selector, content) {
  let element = document.querySelector(selector);
  const match = selector.match(/\[(name|property)="([^"]+)"\]/);

  if (!element) {
    element = document.createElement('meta');
    if (match) {
      element.setAttribute(match[1], match[2]);
    }
    document.head.appendChild(element);
  }

  if (content) {
    element.setAttribute('content', content);
  } else {
    element.removeAttribute('content');
  }
}

function upsertLink(selector, href) {
  let element = document.querySelector(selector);

  if (!href) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

function upsertStructuredData(payload) {
  let element = document.getElementById('structured-data');

  if (!payload) {
    if (element) {
      element.remove();
    }
    return;
  }

  if (!element) {
    element = document.createElement('script');
    element.id = 'structured-data';
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(payload).replace(/</g, '\\u003c');
}

function MainSections({ pageMode, view }) {
  const labels = view.labels || {};
  const resolved = view.resolved;

  if (pageMode === 'resume') {
    return (
      <>
        <Section title={labels.about || 'About'}>
          <div className="summary summary-compact">{resolved.resumeSummary}</div>
          <div className="view-switch-banner">
            <div>
              <div className="view-switch-title">
                {labels.technical_portfolio_blurb || 'Need the deep technical version?'}
              </div>
              <p className="view-switch-copy">
                {labels.technical_portfolio_copy || 'Architecture, delivery details, broader stack, and full work history are available on a separate page.'}
              </p>
            </div>
            <a
              href="./portfolio.html"
              className="primary-link-pill"
              data-analytics-link="technical_portfolio"
            >
              {labels.view_technical_portfolio || 'View technical portfolio'}
            </a>
          </div>
        </Section>

        <Section title={labels.core_strengths || 'Core Strengths'}>
          <div className="strength-grid">
            {resolved.resumeHighlights.map(item => (
              <article className="strength-card" key={item}>
                {item}
              </article>
            ))}
          </div>
        </Section>

        <Section title={labels.selected_experience || labels.experience || 'Selected Experience'} className="section-experience">
          <div className="experience-list">
            <ExperienceList
              items={resolved.resumeExperience}
              locale={view.locale}
              highlightsLabel={labels.highlights || 'Highlights'}
              showDuration
            />
          </div>
        </Section>

        <Section title={labels.skills || 'Skills'}>
          <div className="skills-grid">
            {resolved.resumeSkills.map(skill => (
              <span className="skill" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </Section>

        <Section title={labels.education || 'Education'} className="section-education">
          <div className="education-list">
            {resolved.education.map(edu => (
              <div className="edu-item" key={`${edu.degree}-${edu.institution}-${edu.year}`}>
                <div className="edu-degree">{edu.degree}</div>
                <div className="edu-institution">{edu.institution}</div>
                <div className="edu-year">{edu.year}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title={labels.certifications || 'Certifications & Awards'} className="section-certifications">
          {resolved.header.credly_badges ? (
            <a
              className="certifications-link"
              href={resolved.header.credly_badges}
              target="_blank"
              rel="noreferrer"
            >
              {labels.credly_badges || 'View badge profile on Credly'}
            </a>
          ) : null}
          <div className="cert-list">
            {resolved.certifications.map(cert => (
              <div className="cert-item" key={cert}>
                {cert}
              </div>
            ))}
          </div>
        </Section>
      </>
    );
  }

  return (
    <>
      <Section title={labels.about || 'About'}>
        <div className="summary">{resolved.summary}</div>
      </Section>

      <Section title={labels.experience || 'Experience'} className="section-experience">
        <div className="experience-list">
          <ExperienceList
            items={resolved.experience}
            locale={view.locale}
            highlightsLabel={labels.highlights || 'Highlights'}
            showDuration
          />
        </div>
      </Section>

      <Section title={labels.skills || 'Skills'}>
        <div className="skills-grid">
          {resolved.skills.map(skill => (
            <span className="skill" key={skill}>
              {skill}
            </span>
          ))}
        </div>
      </Section>

      <Section title={labels.education || 'Education'} className="section-education">
        <div className="education-list">
          {resolved.education.map(edu => (
            <div className="edu-item" key={`${edu.degree}-${edu.institution}-${edu.year}`}>
              <div className="edu-degree">{edu.degree}</div>
              <div className="edu-institution">{edu.institution}</div>
              <div className="edu-year">{edu.year}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={labels.certifications || 'Certifications & Awards'} className="section-certifications">
        {resolved.header.credly_badges ? (
          <a
            className="certifications-link"
            href={resolved.header.credly_badges}
            target="_blank"
            rel="noreferrer"
          >
            {labels.credly_badges || 'View badge profile on Credly'}
          </a>
        ) : null}
        <div className="cert-list">
          {resolved.certifications.map(cert => (
            <div className="cert-item" key={cert}>
              {cert}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

export function App({ pageMode = 'resume' }) {
  const defaultLocale = getDefaultLocale(data);
  const supportedLocales = getSupportedLocales(data);
  const storedLocale = typeof window !== 'undefined'
    ? window.localStorage.getItem(localeStorageKey)
    : null;
  const initialLocale = storedLocale && supportedLocales.includes(storedLocale)
    ? storedLocale
    : defaultLocale;
  const [locale, setLocale] = useState(initialLocale);
  const view = getPageView(data, pageMode, locale);

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = view.htmlLang;
    document.body.className = `page-${pageMode}`;
    document.title = view.pageTitle;

    upsertMeta('meta[name="description"]', view.metaDescription);
    upsertMeta('meta[name="keywords"]', view.metaKeywords);
    upsertMeta('meta[property="og:title"]', view.pageTitle);
    upsertMeta('meta[property="og:description"]', view.metaDescription);
    upsertMeta('meta[property="og:url"]', view.canonicalUrl);
    upsertMeta('meta[property="og:locale"]', view.ogLocale);
    upsertMeta('meta[name="twitter:title"]', view.pageTitle);
    upsertMeta('meta[name="twitter:description"]', view.metaDescription);
    upsertMeta('meta[property="og:image"]', view.socialImage);
    upsertMeta('meta[name="twitter:image"]', view.socialImage);
    upsertMeta('meta[name="twitter:card"]', view.socialImage ? 'summary_large_image' : 'summary');
    upsertLink('link[rel="canonical"]', view.canonicalUrl);
    upsertStructuredData(buildStructuredData(view));
  }, [pageMode, view]);

  return (
    <div className="container">
      <header>
        <Header
          pageMode={pageMode}
          resolved={view.resolved}
          locale={locale}
          supportedLocales={view.supportedLocales}
          pdfFileNames={view.pdfFileNames}
          onLocaleChange={setLocale}
        />
      </header>
      <main>
        <MainSections pageMode={pageMode} view={view} />
      </main>
    </div>
  );
}

import { LanguageSwitcher } from './LanguageSwitcher';

export function Header({
  pageMode,
  resolved,
  locale,
  supportedLocales,
  pdfFileNames,
  onLocaleChange
}) {
  const labels = resolved.labels || {};
  const isResumePage = pageMode === 'resume';
  const pageEyebrow = isResumePage
    ? (labels.resume_eyebrow || labels.resume_title || 'Resume')
    : (labels.technical_portfolio || 'Technical Portfolio');
  const pageSwitchHref = isResumePage ? './portfolio.html' : './index.html';
  const pageSwitchLabel = isResumePage
    ? (labels.view_technical_portfolio || 'View technical portfolio')
    : (labels.back_to_resume || 'Back to resume');

  return (
    <>
      <div className="header-left">
        <div className="header-eyebrow-row">
          <div className="header-eyebrow">{pageEyebrow}</div>
          <LanguageSwitcher locales={supportedLocales} activeLocale={locale} onChange={onLocaleChange} />
        </div>

        <h1>{resolved.header.name}</h1>
        <p className="header-role">{resolved.header.title}</p>

        <div className="header-secondary-links">
          <a
            href={pageSwitchHref}
            className="inline-link primary-subtle-link"
            data-analytics-link={isResumePage ? 'technical_portfolio' : 'resume_page'}
          >
            {pageSwitchLabel}
          </a>

          {resolved.header.github ? (
            <a
              href={`https://github.com/${resolved.header.github}`}
              className="inline-link subtle-link"
              target="_blank"
              rel="noopener"
              data-analytics-link="github"
            >
              {labels.github || 'GitHub'}
            </a>
          ) : null}

          {isResumePage ? (
            <>
              <a
                href={`./${pdfFileNames.resume}`}
                className="inline-link subtle-link"
                download
                target="_blank"
                data-analytics-link="resume_pdf"
              >
                {labels.pdf_resume || 'PDF Resume'}
              </a>
              <a
                href={`./${pdfFileNames.portfolio}`}
                className="inline-link subtle-link"
                download
                target="_blank"
                data-analytics-link="portfolio_pdf"
              >
                {labels.full_portfolio_pdf || 'Full Portfolio PDF'}
              </a>
            </>
          ) : (
            <>
              <a
                href={`./${pdfFileNames.portfolio}`}
                className="inline-link subtle-link"
                download
                target="_blank"
                data-analytics-link="portfolio_pdf"
              >
                {labels.full_portfolio_pdf || 'Full Portfolio PDF'}
              </a>
              <a
                href={`./${pdfFileNames.resume}`}
                className="inline-link subtle-link"
                download
                target="_blank"
                data-analytics-link="resume_pdf"
              >
                {labels.pdf_resume || 'PDF Resume'}
              </a>
            </>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="header-meta">
          <div className="header-meta-item">
            <span className="meta-label">{labels.location || 'Location'}</span>
            <span className="meta-value">{resolved.header.location}</span>
          </div>
          <div className="header-meta-item">
            <span className="meta-label">{labels.email || 'Email'}</span>
            <span className="meta-value">
              <a
                className="meta-link"
                href={`mailto:${resolved.header.email_parts[0]}@${resolved.header.email_parts[1]}`}
              >
                {resolved.header.email_parts[0]}@{resolved.header.email_parts[1]}
              </a>
            </span>
          </div>
          <div className="header-meta-item">
            <span className="meta-label">{labels.whatsapp || 'WhatsApp'}</span>
            <span className="meta-value">
              <a
                href={`https://wa.me/${resolved.header.whatsapp}`}
                className="meta-link"
                target="_blank"
                rel="noopener"
              >
                +{resolved.header.whatsapp}
              </a>
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function LanguageSwitcher({ locales, activeLocale, onChange }) {
  const localeLabels = {
    en_US: 'EN',
    pt_BR: 'PT'
  };

  return (
    <div className="language-switcher" role="group" aria-label="Language switcher">
      {locales.map(locale => (
        <button
          key={locale}
          type="button"
          className={`language-button${locale === activeLocale ? ' is-active' : ''}`}
          data-locale-button={locale}
          aria-pressed={locale === activeLocale ? 'true' : 'false'}
          onClick={() => onChange(locale)}
        >
          {localeLabels[locale] || locale}
        </button>
      ))}
    </div>
  );
}

import { formatDurationFromPeriod } from '../lib/portfolio';

export function ExperienceList({ items, locale, highlightsLabel = 'Highlights', showDuration = true }) {
  return (
    <>
      {items.map(exp => {
        const highlights = Array.isArray(exp.highlights) ? exp.highlights : [];
        const computedDuration = formatDurationFromPeriod(exp.period, locale, exp.duration);
        const periodText = showDuration && computedDuration
          ? `${exp.period} · ${computedDuration}`
          : exp.period;

        return (
          <article className="experience-item" key={`${exp.company}-${exp.title}-${exp.period}`}>
            <div className="exp-header">
              <div>
                <div className="exp-title">{exp.title}</div>
                <div className="exp-company">{exp.company}</div>
              </div>
              <div className="exp-period-wrap">
                <div className="exp-period">{periodText}</div>
              </div>
            </div>

            <div className="exp-description">{exp.description}</div>

            {highlights.length > 0 ? (
              <>
                <div className="highlights-label">{highlightsLabel}</div>
                <div className="highlights">
                  {highlights.map(item => (
                    <span className="highlight" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </article>
        );
      })}
    </>
  );
}

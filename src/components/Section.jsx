export function Section({ title, className = '', children }) {
  const sectionClass = className ? `content-section ${className}` : 'content-section';

  return (
    <section className={sectionClass}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

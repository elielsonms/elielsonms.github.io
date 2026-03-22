const fs = require('fs');
const path = require('path');

function loadData() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'datasource.json'), 'utf8'));
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function renderWebHtml(data) {
  const template = readTemplate('public/index.html');
  const pdfFileName = buildPdfFileName(data.header.name);
  const githubHtml = data.header.github
    ? `
    <a href="https://github.com/${escapeHtml(data.header.github)}" class="github-link action-link" target="_blank" rel="noopener">
      GitHub
    </a>`
    : '';

  const headerHtml = `
  <div class="header-left">
    <div class="header-eyebrow">Portfolio</div>
    <h1>${escapeHtml(data.header.name)}</h1>
    <p class="header-role">${escapeHtml(data.header.title)}</p>
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
    </div>
    <div class="header-actions">
      ${githubHtml}
      <a href="https://wa.me/${escapeHtml(data.header.whatsapp)}" class="whatsapp-link action-link" target="_blank" rel="noopener">
        WhatsApp
      </a>
    </div>
  </div>
`;

  let finalHtml = applyTemplateReplacements(template, {
    '{{NAME}}': escapeHtml(data.header.name),
    '{{PDF_FILE_NAME}}': escapeHtml(pdfFileName)
  });
  finalHtml = injectContent(finalHtml, 'header-template', headerHtml);
  finalHtml = injectContent(finalHtml, 'summary-content', escapeHtml(data.summary));
  finalHtml = injectContent(finalHtml, 'experience-list', renderExperienceItems(data.experience));
  finalHtml = injectContent(finalHtml, 'education-list', renderEducationItems(data.education));
  finalHtml = injectContent(finalHtml, 'certs-list', renderCertifications(data.certifications));
  finalHtml = injectContent(finalHtml, 'skills-list', renderSkills(data.skills));

  return {
    html: finalHtml,
    pdfFileName
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

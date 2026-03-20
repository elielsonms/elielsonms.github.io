const fs = require('fs');
const data = JSON.parse(fs.readFileSync('datasource.json', 'utf8'));
const template = fs.readFileSync('public/index.html', 'utf8');

function obfuscateEmail(parts) {
  const [localPart, domain] = parts;
  const email = `${localPart}@${domain}`;
  const obfuscatedEmail = email.split('').join('&#8203;');
  const localCodes = localPart.split('').map(char => char.charCodeAt(0)).join(',');
  const domainCodes = domain.split('').map(char => char.charCodeAt(0)).join(',');

  return `<span class="email-obfuscated" data-local-codes="${localCodes}" data-domain-codes="${domainCodes}">${obfuscatedEmail}</span>`;
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

// Header
const headerHtml = `
  <div class="header-left">
    <h1>${data.header.name}</h1>
    <p>${data.header.title}</p>
  </div>
  <div class="header-right">
    <p>${data.header.location}</p>
    <p>${obfuscateEmail(data.header.email_parts)}</p>
    <p>
      <a href="https://wa.me/${data.header.whatsapp}" class="whatsapp-link" target="_blank" rel="noopener">
        <span class="whatsapp-icon">📱</span> WhatsApp
      </a>
    </p>
  </div>
`;

// Experience items
const expHtml = data.experience.map(exp => `
  <div class="experience-item">
    <div class="exp-header">
      <div>
        <div class="exp-title">${exp.title}</div>
        <div class="exp-company">${exp.company}</div>
      </div>
      <div class="exp-period">${exp.period}</div>
    </div>
    <div class="exp-description">${exp.description}</div>
    <div class="highlights">
      ${exp.highlights.map(h => `<span class="highlight">${h}</span>`).join('')}
    </div>
  </div>
`).join('');

const educationHtml = data.education.map(edu => `
  <div class="edu-item">
    <div class="edu-degree">${edu.degree}</div>
    <div class="edu-institution">${edu.institution}</div>
    <div class="edu-year">${edu.year}</div>
  </div>
`).join('');

const certificationsHtml = data.certifications.map(cert => `
  <div class="cert-item">${cert}</div>
`).join('');

const skillsHtml = data.skills.map(skill => `
  <span class="skill">${skill}</span>
`).join('');

let finalHtml = template.replace('{{NAME}}', data.header.name);

finalHtml = injectContent(finalHtml, 'header-template', headerHtml);
finalHtml = injectContent(finalHtml, 'summary-content', data.summary);
finalHtml = injectContent(finalHtml, 'experience-list', expHtml);
finalHtml = injectContent(finalHtml, 'education-list', educationHtml);
finalHtml = injectContent(finalHtml, 'certs-list', certificationsHtml);
finalHtml = injectContent(finalHtml, 'skills-list', skillsHtml);

fs.writeFileSync('dist/index.html', finalHtml);
console.log('✅ Portfolio generated!');

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('../dados.json', 'utf8'));
const template = fs.readFileSync('../public/index.html', 'utf8');

function obfuscateEmail(parts) {
  const email = parts.join('@');
  return `<span class="email-obfuscated" data-email="${email}">${parts.split('').join('&#8203;')}</span><span>&#64;</span><span>${parts[1]}</span>`;
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

// ... outros templates (education, certs, skills) ...

const finalHtml = template
  .replace('{{NAME}}', data.header.name)
  .replace('#header-template', headerHtml)
  .replace('#summary-content', data.summary)
  .replace('#experience-list', expHtml)
  // ... outros replaces ...

fs.writeFileSync('../dist/index.html', finalHtml);
console.log('✅ Portfolio gerado (HTML/CSS/JS separados)!');
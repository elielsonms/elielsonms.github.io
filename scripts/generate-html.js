const fs = require('fs');
const data = JSON.parse(fs.readFileSync('datasource.json', 'utf8'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name} - Portfolio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2.5rem; color: #1a1a1a; margin-bottom: 0.5rem; }
    .title { color: #666; font-size: 1.2rem; margin-bottom: 2rem; }
    h2 { color: #333; margin: 2rem 0 1rem; }
    .project { border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; transition: box-shadow 0.3s; }
    .project:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .project h3 { color: #007bff; margin-bottom: 0.5rem; }
    .project a { color: #007bff; text-decoration: none; font-weight: 500; }
    .skills { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem; }
    .skill { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <header>
    <h1>${data.name}</h1>
    <p class="title">${data.title}</p>
  </header>
  
  <section>
    <h2>Projects</h2>
    ${data.projects.map(p => `
      <div class="project">
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <a href="${p.link}" target="_blank" rel="noopener">View on GitHub →</a>
      </div>
    `).join('')}
  </section>
  
  <section>
    <h2>Skills</h2>
    <div class="skills">
      ${data.skills.map(s => `<span class="skill">${s}</span>`).join('')}
    </div>
  </section>
</body>
</html>`;

fs.writeFileSync('dist/index.html', html);
console.log('✅ Portfolio generated!');
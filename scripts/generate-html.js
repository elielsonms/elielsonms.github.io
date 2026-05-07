const {
  copyStaticAssets,
  ensureDir,
  loadData,
  renderWebHtml,
  writeOutput
} = require('./render-portfolio');

const data = loadData();
const { html, technicalHtml, robotsTxt, sitemapXml } = renderWebHtml(data);

ensureDir('dist');
copyStaticAssets();
writeOutput('dist/index.html', html);
writeOutput('dist/portfolio.html', technicalHtml);
writeOutput('dist/robots.txt', robotsTxt);
writeOutput('dist/sitemap.xml', sitemapXml);

console.log('✅ Resume and portfolio pages generated!');

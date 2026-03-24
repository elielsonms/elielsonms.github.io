const {
  copyStaticAssets,
  ensureDir,
  loadData,
  renderWebHtml,
  writeOutput
} = require('./render-portfolio');

const data = loadData();
const { html, robotsTxt, sitemapXml } = renderWebHtml(data);

ensureDir('dist');
copyStaticAssets();
writeOutput('dist/index.html', html);
writeOutput('dist/robots.txt', robotsTxt);
writeOutput('dist/sitemap.xml', sitemapXml);

console.log('✅ Portfolio generated!');

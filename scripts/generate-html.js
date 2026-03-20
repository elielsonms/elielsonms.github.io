const {
  copyStaticAssets,
  ensureDir,
  loadData,
  renderWebHtml,
  writeOutput
} = require('./render-portfolio');

const data = loadData();
const { html } = renderWebHtml(data);

ensureDir('dist');
copyStaticAssets();
writeOutput('dist/index.html', html);

console.log('✅ Portfolio generated!');

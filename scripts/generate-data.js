const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function main() {
  const output = execFileSync(
    'sh',
    ['scripts/run-python.sh', 'scripts/print_data_json.py'],
    {
      cwd: process.cwd(),
      encoding: 'utf8'
    }
  );

  const targetPath = path.join(process.cwd(), 'src/generated/portfolio-data.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, output);
}

main();

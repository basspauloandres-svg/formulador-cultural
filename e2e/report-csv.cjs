const fs = require('fs');
const path = require('path');
const input = 'test-results/results.json';
const rows = [['ID', 'Criterio', 'Resultado', 'Duracion_ms', 'Error', 'Commit']];
if (fs.existsSync(input)) {
  const data = JSON.parse(fs.readFileSync(input, 'utf8'));
  const visit = (suite) => {
    for (const spec of suite.specs || []) for (const t of spec.tests || []) {
      const last = t.results?.at(-1) || {};
      const id = (spec.title.match(/E2E-\\d+/) || [spec.id])[0];
      rows.push([id, spec.title, t.status || 'INSUFFICIENT_EVIDENCE', last.duration || 0, last.error?.message || '', process.env.GITHUB_SHA || 'local']);
    }
    (suite.suites || []).forEach(visit);
  };
  (data.suites || []).forEach(visit);
}
const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""').replace(/\\r?\\n/g, ' ') + '"').join(',')).join('\\n') + '\\n';
fs.mkdirSync('test-results', {recursive:true});
fs.writeFileSync('test-results/matrix.csv', csv);
console.log('Matriz creada, evaluaciones:', rows.length - 1);

const fs = require('fs');
const input = 'test-results/results.json';
const rows = [['ID','Criterio','Resultado','Duracion_ms','Error','Commit']];
if (fs.existsSync(input)) {
  const data = JSON.parse(fs.readFileSync(input,'utf8'));
  function visit(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      const last = test.results?.at(-1) || {};
      rows.push([spec.title.split(':')[0],spec.title,test.status || 'INSUFFICIENT_EVIDENCE',last.duration || 0,last.error?.message || '',process.env.GITHUB_SHA || 'local']);
    }
    (suite.suites || []).forEach(visit);
  }
  (data.suites || []).forEach(visit);
}
const csv = rows.map(row => row.map(value =>
  '"' + String(value ?? '').replaceAll('"','""').replaceAll(String.fromCharCode(10),' ').replaceAll(String.fromCharCode(13),' ') + '"'
).join(',')).join(String.fromCharCode(10)) + String.fromCharCode(10);
fs.mkdirSync('test-results',{recursive:true});
fs.writeFileSync('test-results/matrix.csv',csv);
console.log('Evaluaciones registradas:',rows.length-1);

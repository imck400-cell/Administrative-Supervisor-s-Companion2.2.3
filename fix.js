const fs = require('fs');
let code = fs.readFileSync('app/GradeSheetsView.tsx', 'utf8');
code = code.replace(/\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('app/GradeSheetsView.tsx', code, 'utf8');
console.log('Fixed quotes and dollar signs');

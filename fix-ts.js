const fs = require('fs');
let code = fs.readFileSync('app/GradeSheetsView.tsx', 'utf8');

code = code.replace(/currentUser\?\.role === 'manager' \|\| currentUser\?\.role === 'supervisor'/g, "false");
code = code.replace(/total > 0/g, "Number(total) > 0");
code = code.replace(/ratio > 0/g, "Number(ratio) > 0");

fs.writeFileSync('app/GradeSheetsView.tsx', code, 'utf8');
console.log('Fixed TS errors');

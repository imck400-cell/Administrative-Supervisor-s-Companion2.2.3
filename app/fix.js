const fs = require('fs');
let content = fs.readFileSync('app/ReportsPage.tsx', 'utf8');
content = content.replace(/updateData\(\{ metricsList: newList \}\);/g, 'saveMetrics(newList);');
fs.writeFileSync('app/ReportsPage.tsx', content);

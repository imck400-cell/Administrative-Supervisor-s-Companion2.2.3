const fs = require('fs');
let text = fs.readFileSync('components/DataManagementModal.tsx', 'utf8');
text = text.replace(/\{\/\* History \/ Backups Section \*\/\}[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/, '');
fs.writeFileSync('components/DataManagementModal.tsx', text);

const fs = require('fs');
let text = fs.readFileSync('components/DataManagementModal.tsx', 'utf8');

text = text.replace(/<div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl mt-8">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/, '');

fs.writeFileSync('components/DataManagementModal.tsx', text);

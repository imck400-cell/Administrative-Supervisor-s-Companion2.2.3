const fs = require('fs');
let content = fs.readFileSync('context/GlobalState.tsx', 'utf8');

// Replace multiline StorageHelper
content = content.replace(/StorageHelper\.setItem\([\s\S]*?"rafiquk_data"[\s\S]*?\);/g, '');

fs.writeFileSync('context/GlobalState.tsx', content);

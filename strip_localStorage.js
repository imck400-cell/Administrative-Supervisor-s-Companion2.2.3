const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir('./', (filePath) => {
    if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist')) return;
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        
        if (filePath.includes('GlobalState.tsx')) {
            // Keep lang logic or just do the same?
            // Actually I'll let GlobalState alone since I just edited it carefully
            return;
        }

        // Replace setItem, removeItem, clear
        content = content.replace(/localStorage\.setItem\([^]+?\);/g, '');
        content = content.replace(/localStorage\.removeItem\([^]+?\);/g, '');
        content = content.replace(/localStorage\.clear\(\);/g, '');
        
        // Replace getItem to return null
        content = content.replace(/localStorage\.getItem\([^)]+\)/g, 'null');
        
        // Replace sessionStorage too
        content = content.replace(/sessionStorage\.setItem\([^;]+;\n?/g, '');
        content = content.replace(/sessionStorage\.removeItem\([^;]+;\n?/g, '');
        content = content.replace(/sessionStorage\.getItem\([^)]+\)/g, 'null');
        
        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log("Updated", filePath);
        }
    }
});

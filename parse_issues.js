const fs = require('fs');

const logPath = '/.gemini/antigravity/brain/87299de8-fd17-4d36-81a4-adba2cb05ea8/.system_generated/logs/overview.txt';
let text = '';
try {
  text = fs.readFileSync(logPath, 'utf8');
} catch (e) {
  console.error("Error reading file:", e);
  process.exit(1);
}

const lines = text.split('\n');
const dict = {};
let currentCategory = null;
let currentProblem = null;

for (let line of lines) {
  line = line.trim();
  
  const catMatch = line.match(/^###\s+\*\*(.*?)\*\*$/) || line.match(/^###\s+(.*)$/);
  if (catMatch && !line.startsWith("####")) {
    currentCategory = catMatch[1].replace(/\*\*/g, '').trim();
    dict[currentCategory] = {};
    currentProblem = null;
    continue;
  }
  
  const probMatch = line.match(/^####\s+\*\*(?:\d+\.\s*)?(.*?)\*\*$/) || line.match(/^####\s+(?:\d+\.\s*)?(.*)$/);
  if (probMatch) {
    if (!currentCategory) {
       currentCategory = "أخرى";
       dict[currentCategory] = {};
    }
    currentProblem = probMatch[1].replace(/\*\*/g, '').trim();
    dict[currentCategory][currentProblem] = [];
    continue;
  }
  
  const solMatch = line.match(/^\d+\.\s+(.*)$/);
  if (solMatch && currentCategory && currentProblem) {
    if (!line.startsWith("####") && !line.startsWith("###")) {
       dict[currentCategory][currentProblem].push(solMatch[1].trim());
    }
  }
}

// Clean up
for (const cat in dict) {
  for (const prob in dict[cat]) {
    if (dict[cat][prob].length === 0) {
      delete dict[cat][prob];
    }
  }
  if (Object.keys(dict[cat]).length === 0) {
    delete dict[cat];
  }
}

const fileContent = `export const issuesDictionary: Record<string, Record<string, string[]>> = ${JSON.stringify(dict, null, 2)};\n`;
fs.writeFileSync('components/issuesData.ts', fileContent, 'utf8');
console.log("Successfully extracted categories:");
console.log(Object.keys(dict).map(k => `${k}: ${Object.keys(dict[k]).length} problems`));

const fs = require('fs');

let content = fs.readFileSync('src/lib/founder-actions.ts', 'utf8');

// I will just use sed to edit founder-actions directly instead of a full JS script if it's easier, or I can use the tool to replace.

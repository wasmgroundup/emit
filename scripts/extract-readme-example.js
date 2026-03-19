import {readFileSync, writeFileSync} from 'fs';

const readme = readFileSync('README.md', 'utf8');
const match = readme.match(/```typescript\n([\s\S]*?)```/);
if (!match) {
  console.error('No TypeScript code block found in README.md');
  process.exit(1);
}

const code = match[1].replace('"@wasmgroundup/emit"', '"./index.js"');

writeFileSync('readme-example.test.ts', code);

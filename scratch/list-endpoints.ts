import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const routes = walk('./app/api');

for (const r of routes) {
  const content = fs.readFileSync(r, 'utf-8');
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  if (content.includes('export async function PUT')) methods.push('PUT');
  
  const relPath = r.replace(/\\/g, '/').replace('./app', '');
  console.log(`${relPath}: ${methods.join(', ')}`);
}

const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\barat\\OneDrive\\Documents\\GitHub\\magma-autospa';
const outputFile = 'C:\\Users\\barat\\.gemini\\antigravity\\brain\\32ae0d10-7190-4161-a251-4bc6f44f1de2\\full_codebase.md';

const includeDirs = ['app', 'components', 'lib', 'hooks', 'types', 'styles'];
const rootFiles = ['package.json', 'tailwind.config.ts', 'tsconfig.json', 'next.config.mjs', 'next.config.js'];
const allowedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json'];

let markdownContent = '# Full Codebase\n\nThis file contains the complete source code for the application.\n\n';

function walkSync(currentDirPath) {
    const files = fs.readdirSync(currentDirPath);
    for (const name of files) {
        const filePath = path.join(currentDirPath, name);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            const ext = path.extname(filePath);
            if (allowedExtensions.includes(ext) && name !== 'package-lock.json') {
                const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
                const content = fs.readFileSync(filePath, 'utf8');
                let mdLang = ext.substring(1);
                if (mdLang === 'tsx') mdLang = 'tsx';
                if (mdLang === 'ts') mdLang = 'typescript';
                if (mdLang === 'js') mdLang = 'javascript';
                
                markdownContent += `## ${relativePath}\n\n`;
                markdownContent += '```' + mdLang + '\n';
                markdownContent += content;
                markdownContent += '\n```\n\n';
            }
        } else if (stat.isDirectory()) {
            walkSync(filePath);
        }
    }
}

// Process specific directories
for (const dir of includeDirs) {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
        walkSync(dirPath);
    }
}

// Process root files
for (const file of rootFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        const relativePath = file;
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath);
        let mdLang = ext.substring(1);
        if (mdLang === 'mjs' || mdLang === 'js') mdLang = 'javascript';
        if (mdLang === 'ts') mdLang = 'typescript';
        
        markdownContent += `## ${relativePath}\n\n`;
        markdownContent += '```' + mdLang + '\n';
        markdownContent += content;
        markdownContent += '\n```\n\n';
    }
}

fs.writeFileSync(outputFile, markdownContent);
console.log('Successfully generated ' + outputFile);

const fs = require('fs');
let page = fs.readFileSync('app/staff/page.tsx', 'utf8');
const wizard = fs.readFileSync('C:/Users/barat/.gemini/antigravity/brain/32ae0d10-7190-4161-a251-4bc6f44f1de2/scratch/AddNewWorkWizard.tsx', 'utf8');

const wizardCode = wizard.replace('\"use client\";\nimport { useState, useEffect } from \"react\";\nimport { Search, User, Phone, Car } from \"lucide-react\";\n', '');

if (!page.includes('lucide-react')) {
  page = page.replace('import { useState, useEffect } from \"react\";', 'import { useState, useEffect } from \"react\";\nimport { Search, User, Phone, Car } from \"lucide-react\";');
}

// Replace the modal block
const startComment = '{/* Add New Work Modal */}';
const endTag = '</main>';

const startIdx = page.indexOf(startComment);
const endIdx = page.lastIndexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = '{isModalOpen && <AddNewWorkWizard formData={formData} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchJobs(true); }} />}\n      ';
  
  page = page.substring(0, startIdx) + replacement + page.substring(endIdx);
  page = page + '\n\n' + wizardCode;
  
  fs.writeFileSync('app/staff/page.tsx', page);
  console.log('Success');
} else {
  console.log('Failed to find tags');
}

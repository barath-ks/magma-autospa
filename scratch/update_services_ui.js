const fs = require('fs');
const file = 'app/admin/services/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove state variable
content = content.replace(/const \[pointsEarned, setPointsEarned\] = useState\(""\);\n/, '');

// 2. Remove setting state in handleEdit
content = content.replace(/setPointsEarned\(service\.points_earned\.toString\(\)\);\n/, '');

// 3. Remove setting state in handleCloseModal
content = content.replace(/setPointsEarned\(""\);\n/, '');

// 4. Remove points_earned from save payload
content = content.replace(/points_earned: Number\(pointsEarned\),\n/, '');

// 5. Remove pointsEarned from form validation (if it exists)
content = content.replace(/\|\| !pointsEarned/g, '');

// 6. Remove <th>Points Earned</th>
content = content.replace(/<th className="p-4">Points Earned<\/th>\n/, '');

// 7. Remove <td>+{s.points_earned}</td>
content = content.replace(/<td className="p-4 font-mono text-sm text-accent-gold">\+\{s\.points_earned\}<\/td>\n/, '');

// 8. Remove the form field block for Points Earned
// We'll use a regex to replace the entire block
const formBlockRegex = /<div>\s*<label className="block text-\[10px\] uppercase tracking-\[0\.15em\] font-bold mb-2 text-text-secondary">Points Earned \*<\/label>\s*<input\s*type="number"\s*min="0"\s*value=\{pointsEarned\}\s*onChange=\{\(e\) => setPointsEarned\(e\.target\.value\)\}\s*className="block w-full bg-bg-base border border-border-hairline p-3 text-text-primary text-sm font-mono focus:border-accent-copper focus:outline-none"\s*placeholder="e\.g\. 20"\s*required\s*\/>\s*<\/div>/;

content = content.replace(formBlockRegex, '');

fs.writeFileSync(file, content);
console.log("UI Updated.");

const fs = require('fs');
const path = require('path');

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const imports = [...content.matchAll(/import\s+.*?from\s+['"](.*?)['"]/g)];
            for (const match of imports) {
                const importPath = match[1];
                if (importPath.startsWith('.')) {
                    let resolved = path.resolve(dir, importPath);
                    let exts = ['', '.js', '.jsx', '/index.js', '/index.jsx', '.json', '.svg', '.png'];
                    for (const ext of exts) {
                        if (fs.existsSync(resolved + ext)) {
                            const dirName = path.dirname(resolved + ext);
                            const baseName = path.basename(resolved + ext);
                            const actualFiles = fs.readdirSync(dirName);
                            if (!actualFiles.includes(baseName)) {
                                console.log('CASE MISMATCH in ' + fullPath + ': ' + importPath + ' -> expects ' + baseName);
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
}
checkDir('./src');
console.log('Case check done.');

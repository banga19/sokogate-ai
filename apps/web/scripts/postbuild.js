import fs from 'fs';
import path from 'path';

function copyDir(src, dest) {
	if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

const src = path.resolve(process.cwd(), 'src');
const dest = path.resolve(process.cwd(), 'build', 'src');
copyDir(src, dest);
console.log('✅ Copied src/ to build/ for route discovery');

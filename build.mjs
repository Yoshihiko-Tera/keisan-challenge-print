import { cp, mkdir } from 'node:fs/promises';
const output = new URL('./dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'print.html', 'style.css', 'challenge.webmanifest', 'print.webmanifest', 'about-challenge.html', 'about-print.html', 'robots.txt', 'sitemap.xml', 'src', 'assets', 'vendor']) {
  await cp(new URL(path, import.meta.url), new URL(path, output), { recursive: true });
}
console.log('Static apps built in dist/');

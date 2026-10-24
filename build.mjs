import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const target=process.argv[2] || 'combined';
if(!['combined','challenge','print'].includes(target))throw new Error('Unknown app target');
const root=dirname(fileURLToPath(import.meta.url)),output=resolve(root,'dist');
if(dirname(output)!==root)throw new Error('Unsafe output path');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const challenge='https://keisan-challenge-print.pages.dev/',print='https://100masu-print.pages.dev/';
const common=['style.css','src','assets'];
if(target!=='challenge')common.push('vendor');
for(const path of common)await cp(resolve(root,path),resolve(output,path),{recursive:true});
if(target==='combined') {
 for(const path of ['index.html','print.html','challenge.webmanifest','print.webmanifest','about-challenge.html','about-print.html','robots.txt','sitemap.xml'])await cp(resolve(root,path),resolve(output,path));
} else {
 const base=target==='print'?print:challenge;
 let html=await readFile(resolve(root,target==='print'?'print.html':'index.html'),'utf8');
 html=html.replaceAll('https://keisan-challenge-print.pages.dev/print.html',print);
 if(target==='print')html=html.replaceAll('href="index.html"','href="'+challenge+'"');
 else html=html.replaceAll('href="print.html"','href="'+print+'"');
 await writeFile(resolve(output,'index.html'),html);
 let guide=await readFile(resolve(root,'about-'+target+'.html'),'utf8');
 guide=guide.replaceAll('https://keisan-challenge-print.pages.dev/',''+base);
 guide=guide.replaceAll('href="'+(target==='print'?'print.html':'index.html')+'"','href="./"');
 const other=target==='print'?'challenge':'print';
 guide=guide.replaceAll('href="about-'+other+'.html"','href="'+(other==='print'?print:challenge)+'about-'+other+'"');
 await writeFile(resolve(output,'about-'+target+'.html'),guide);
 const manifest=JSON.parse(await readFile(resolve(root,target+'.webmanifest'),'utf8'));
 manifest.start_url='./';manifest.id='./';await writeFile(resolve(output,target+'.webmanifest'),JSON.stringify(manifest,null,2));
 await writeFile(resolve(output,'src/site-config.mjs'),'export const challengeUrl = '+JSON.stringify(challenge)+';\nexport const printUrl = '+JSON.stringify(print)+';\n');
 const redirects=target==='challenge'?'/print '+print+' 301\n/print.html '+print+' 301\n/about-print '+print+'about-print 301\n':'/print / 301\n/print.html / 301\n/index.html / 301\n/about-challenge '+challenge+'about-challenge 301\n';
 await writeFile(resolve(output,'_redirects'),redirects);
 await writeFile(resolve(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+base+'sitemap.xml\n');
 await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+base+'</loc></url><url><loc>'+base+'about-'+target+'</loc></url></urlset>');
}
console.log('Built '+target+' in dist/');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
const read=p=>readFileSync(p,'utf8');
const tokens=read('src/foco-pro-tokens.css');
const rgb=role=>tokens.match(new RegExp('--foco-pro-'+role+':#([a-fA-F0-9]{6})'))[1].match(/../g).map(x=>parseInt(x,16));
for(const size of [180,192,512]){
 const png=readFileSync('public/icons/foco-'+size+'.png');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 const compressed=[];for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')compressed.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
 const pixels=inflateSync(Buffer.concat(compressed));const colors=new Set();for(let y=0;y<size;y++){const row=y*(1+size*4);assert.equal(pixels[row],0);for(let x=0;x<size;x++){const k=row+1+x*4;if(pixels[k+3]===255)colors.add([...pixels.subarray(k,k+3)].join(','));}}
 assert.ok(colors.has(rgb('canvas').join(',')),'Generated PWA canvas must use the approved graphite');
 assert.ok(colors.has(rgb('accent').join(',')),'Generated PWA symbol must use pastel lime');
 assert.ok(!colors.has('213,255,64'),'Old neon cannot return during build');
}
const logo=read('public/assets/brand/foco-v6-reference-vector.svg');
const path=logo.match(/<path[^>]*\bd="([^"]+)"/)[1];
assert.ok(read('public/assets/brand/foco-symbol.svg').includes(path),'Standalone mark must come from the approved logo');
for(const file of ['public/icons/foco.svg','public/assets/brand/foco-symbol.svg', 'public/assets/brand/foco-v6-reference-vector.svg'])assert.ok(!read(file).includes('#D5FF40'),file+' retains old neon');
assert.equal(read('public/foco-brand.css'),'/* Generated from src/foco-pro-tokens.css and src/foco-brand.css. */\n'+tokens+'\n'+read('src/foco-brand.css'),'Standalone shell must use current tokens and fonts');
const release=read('src/utils/release.ts');
const version=release.match(/FOCO_VISUAL_RELEASE = '([^']+)'/)[1],build=release.match(/FOCO_BUILD_ID = '([^']+)'/)[1];
assert.ok(read('public/atualizar.html').includes('data-foco-release>'+version+'<'));
assert.ok(read('public/atualizar.html').includes("const FOCO_UPDATE_BUILD = '"+build+"'"));
assert.ok(read('index.html').includes('name="foco-release" content="'+build+'"'));
assert.ok(!read('index.html').includes('Fitness Premium'));
console.log('FOCO brand assets: canonical logo, PNG/SVG palette, standalone CSS and updater release verified.');

/** Rebuild the official FOCO mark into crisp Apple and Android PWA PNG assets.
 * No binary assets need to be checked into source: production build generates
 * the exact same brand mark with anti-aliased polygon edges.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const tokens=readFileSync('src/foco-pro-tokens.css','utf8');
const color=role=>{
 const hex=tokens.match(new RegExp('--foco-pro-'+role+':(#[A-Fa-f0-9]{6})'))?.[1];
 if(!hex)throw new Error('Missing brand color: '+role);
 return hex;
};
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const canvas=rgb(color('canvas')),accent=rgb(color('accent'));
const logoPath='public/assets/brand/foco-v6-reference-vector.svg';
const logo=readFileSync(logoPath,'utf8');
const symbol=logo.match(/<path[^>]*\bd="([^"]+)"/)?.[1];
if(!symbol||!/^[MLZ\d,\s.-]+$/.test(symbol))throw new Error('Unsupported official symbol path');
const sourceShapes=symbol.trim().split(/Z\s*/).filter(Boolean).map(p=>{
 const numbers=p.match(/-?\d+(?:\.\d+)?/g).map(Number);
 return Array.from({length:numbers.length/2},(_,i)=>numbers.slice(i*2,i*2+2));
});

const WIDTH=512;
const shapes=sourceShapes.map(shape=>shape.map(([x,y])=>[78+1.5*(x-29),95+1.5*(y-34)]));
const insidePolygon=(px,py,points)=>{
 let flag=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [xi,yi]=points[i],[xj,yj]=points[j];
  if((yi>py)!==(yj>py)&&px<(xj-xi)*(py-yi)/(yj-yi)+xi) flag=!flag;
 }
 return flag;
};
function inRoundedSquare(x,y){
 const r=112,lim=512-r;
 const cx=x<r?r:x>lim?lim:x,cy=y<r?r:y>lim?lim:y;
 return (x-cx)**2+(y-cy)**2<=r*r;
}
const CRCS=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CRCS[n]=c>>>0;}
function chunk(tag,data){
 const name=Buffer.from(tag);const b=Buffer.alloc(4);b.writeUInt32BE(data.length,0);
 let crc=0xFFFFFFFF;
 for(const v of Buffer.concat([name,data])) crc=CRCS[(crc^v)&255]^(crc>>>8);
 const c=Buffer.alloc(4);c.writeUInt32BE((crc^0xFFFFFFFF)>>>0,0);
 return Buffer.concat([b,name,data,c]);
}
function png(size){
 const raw=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++){
  let k=y*(size*4+1);raw[k++]=0;
  for(let x=0;x<size;x++){
   let mask=0,mark=0;
   for(const dy of [.25,.75])for(const dx of [.25,.75]){
    const sx=(x+dx)*WIDTH/size,sy=(y+dy)*WIDTH/size;
    if(!inRoundedSquare(sx,sy))continue;
    mask++;
    if(shapes.some(p=>insidePolygon(sx,sy,p)))mark++;
   }
   const t=mask?mark/mask:0;
   for(let channel=0;channel<3;channel++)raw[k++]=Math.round(canvas[channel]+(accent[channel]-canvas[channel])*t);
   raw[k++]=Math.round(255*mask/4);
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('public/icons',{recursive:true});
const paths=shapes.map(p=>'<path d="M'+p.map(([x,y])=>x+','+y).join(' L')+'Z"/>').join('');
writeFileSync('public/icons/foco.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="FOCO"><rect width="512" height="512" rx="112" fill="'+color('canvas')+'"/><g fill="'+color('accent')+'">'+paths+'</g></svg>');
writeFileSync('public/assets/brand/foco-symbol.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 25 250 225" role="img" aria-label="Símbolo FOCO"><path fill="'+color('accent')+'" fill-rule="evenodd" d="'+symbol+'"/></svg>');
for(const size of [180,192,512]){
 const filename='public/icons/foco-'+size+'.png';
 writeFileSync(filename,png(size));
 console.info('FOCO brand icon synchronized:',filename);
}
writeFileSync('public/foco-brand.css','/* Generated from src/foco-pro-tokens.css and src/foco-brand.css. */\n'+tokens+'\n'+readFileSync('src/foco-brand.css','utf8'));
const release=readFileSync('src/utils/release.ts','utf8');
const version=release.match(/FOCO_VISUAL_RELEASE = '([^']+)'/)?.[1];
const build=release.match(/FOCO_BUILD_ID = '([^']+)'/)?.[1];
if(!version||!build)throw new Error('Missing FOCO release');
const updaterPath='public/atualizar.html';
const updater=readFileSync(updaterPath,'utf8').replace(/data-foco-release>[^<]*/, 'data-foco-release>'+version)
 .replace(/const FOCO_UPDATE_BUILD = '[^']*'/,"const FOCO_UPDATE_BUILD = '"+build+"'");
writeFileSync(updaterPath,updater);

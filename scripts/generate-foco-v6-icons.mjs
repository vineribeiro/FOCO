/** Rebuild the official FOCO mark into crisp Apple and Android PWA PNG assets.
 * No binary assets need to be checked into source: production build generates
 * the exact same brand mark with anti-aliased polygon edges.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const WIDTH=512;
const shapes=[
 [[252,114],[203,114],[188,166],[238,166]],
 [[117,88],[68,88],[29,218],[80,217]],
 [[205,35],[160,34],[154,36],[94,239],[146,239]],
].map(shape=>shape.map(([x,y])=>[78+1.5*(x-29),95+1.5*(y-34)]));
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
   raw[k++]=Math.round(12+(213-12)*t);
   raw[k++]=Math.round(16+(255-16)*t);
   raw[k++]=Math.round(12+(64-12)*t);
   raw[k++]=Math.round(255*mask/4);
  }
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('public/icons',{recursive:true});
for(const size of [180,192,512]){
 const filename='public/icons/foco-'+size+'.png';
 writeFileSync(filename,png(size));
 console.info('FOCO V6 exact icon regenerated:',filename);
}

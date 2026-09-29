/* Lossless in meaning: orient photographs, strip metadata, and encode for the web.
   No painted content is generated or retouched. Original composition retained. */
const fs=require('fs');const path=require('path');
const sharp=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const input=process.argv[2];const output=path.resolve(__dirname,'../dist/assets');
async function main(){
 const files=fs.readdirSync(input).filter(f=>/\.JPG$/i.test(f));const manifest={};
 for(let i=0;i<files.length;i+=4)await Promise.all(files.slice(i,i+4).map(async f=>{
  const id=f.startsWith('701036')?'row-houses':f.replace('IMG_','').replace('.JPG','');
  const im=sharp(path.join(input,f)).autoOrient();
  const buf=await im.webp({quality:91,effort:4}).toBuffer();
  fs.writeFileSync(path.join(output,id+'.webp'),buf);
  const m=await sharp(buf).metadata();manifest[id]={file:f,width:m.width,height:m.height};
  await sharp(buf).resize({width:330,height:250,fit:'inside'}).webp({quality:78}).toFile(path.join(output,id+'-thumb.webp'));
 }));
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest));console.log('Prepared '+files.length+' photographs.');
}main().catch(e=>{console.error(e);process.exit(1)});

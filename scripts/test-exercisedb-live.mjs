/** One-time ExerciseDB V1 search contract probe for this integration PR only.
 * At most 4 rate-spaced metadata-only requests, never fetch any GIF media.
 */
const base='https://oss.exercisedb.dev/api/v1/';
const variants=[
 ['q','exercises/search?q=barbell%20bench%20press'],
 ['name','exercises/search?name=barbell%20bench%20press'],
 ['query','exercises/search?query=barbell%20bench%20press'],
 ['search','exercises/search?search=barbell%20bench%20press'],
];
for(const [kind,path] of variants){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(base+path,{signal:controller.signal,headers:{Accept:'application/json'}});
  const body=await response.json().catch(()=>null);
  const data=body?.data;
  console.log(JSON.stringify({kind,status:response.status,keys:body&&typeof body==='object'?Object.keys(body):null,
    dataType:Array.isArray(data)?'array':typeof data,
    count:Array.isArray(data)?data.length:null,
    example:Array.isArray(data)?data.slice(0,2).map(e=>({name:e?.name,exerciseId:e?.exerciseId,gifUrl:e?.gifUrl})):null,
    preview:JSON.stringify(body).slice(0,600)
  }));
  if(response.status===429){console.log('Free API rate limit; no more probes.');break;}
 }catch(error){console.log(JSON.stringify({kind,error:String(error).slice(0,180)}));}
 finally{clearTimeout(timer);}
 await new Promise(resolve=>setTimeout(resolve,1500));
}

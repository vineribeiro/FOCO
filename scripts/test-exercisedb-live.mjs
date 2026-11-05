/** PR-only one-off ExerciseDB search contract, metadata only; never request GIF bytes. */
const cases=[
 ['supino','barbell bench press'],
 ['legpress_precise','sled 45 degree leg press'],
 ['legpress_general','leg press'],
 ['extensora','leg extension'],
];
for(const [label,term] of cases){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),7000);
 try{
  const url='https://oss.exercisedb.dev/api/v1/exercises/search?search='+encodeURIComponent(term);
  const response=await fetch(url,{signal:abort.signal,headers:{Accept:'application/json'}});
  const json=await response.json().catch(()=>null);
  const data=Array.isArray(json?.data)?json.data:[];
  console.log(JSON.stringify({label,term,status:response.status,cors:response.headers.get('access-control-allow-origin'),success:json?.success,
    returned:data.length,results:data.slice(0,12).map(x=>({id:x.exerciseId,name:x.name}))}));
  if(response.status===429){console.log('Rate limit: stop probes.');break;}
 }catch(e){console.log(JSON.stringify({label,error:String(e).slice(0,160)}));}
 finally{clearTimeout(timer);}
 await new Promise(resolve=>setTimeout(resolve,1500));
}

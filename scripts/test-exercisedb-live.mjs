/** OPTIONAL one-request contract probe, never run automatically in CI.
 * No storage and no media requests. Can return 429 due to the free API limits.
 */
const url='https://oss.exercisedb.dev/api/v1/exercises/search?q=barbell%20bench%20press';
const controller=new AbortController();
const timer=setTimeout(()=>controller.abort(),9000);
try{
 const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
 const body=await response.json().catch(()=>null);
 const entries=body&&Array.isArray(body.data)?body.data:[];
 console.log(JSON.stringify({status:response.status,success:body?.success,count:entries.length,
  firstNames:entries.slice(0,5).map(row=>row.name),meta:body?.meta??null},null,2));
 if(!response.ok && response.status!==429)process.exitCode=1;
}catch(error){console.error('API probe unavailable:',String(error));process.exitCode=1;}
finally{clearTimeout(timer);}

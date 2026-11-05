import { repdbIdForExercise } from './repdbAssets';

/** AscendAPI / ExerciseDB free V1: on-demand NON-COMMERCIAL beta previews.
 * Never bulk download, persist media or use in monetized products.
 * Commercial deployments MUST set VITE_FOCO_COMMERCIAL_MODE=true.
 */
const SEARCH_URL='https://oss.exercisedb.dev/api/v1/exercises/search';
const GIF_ORIGIN='https://static.exercisedb.dev';
export type ExerciseDBPreviewResult=
  | {state:'matched';id:string;name:string;gifUrl:string}
  | {state:'no_match'|'rate_limited'|'unavailable'|'disabled'};
interface Item {exerciseId?:unknown;name?:unknown;gifUrl?:unknown;}

/** Reviewed PT→EN aliases. Exact movement/variant matching only. */
const ALIASES:Record<string,readonly string[]>={
 legpress45graus:['sled 45 degree leg press','sled 45° leg press','45 degree leg press'],
 legpress:['sled leg press','leg press'],
 supinoretocombarra:['barbell bench press','barbell flat bench press'],
 supinoretocomhalteres:['dumbbell bench press','dumbbell flat bench press'],
 supinoinclinadocombarra:['barbell incline bench press'],
 supinoinclinadocomhalteres:['dumbbell incline bench press'],
 supinodeclinadocombarra:['barbell decline bench press'],
 agachamentolivrecombarra:['barbell squat','barbell full squat'],
 agachamentofrontal:['barbell front squat'],
 agachamentogoblet:['dumbbell goblet squat'],
 agachamentonosmith:['smith machine squat'],
 agachamentobulgaro:['bulgarian split squat'],
 levantamentoterraconvencional:['barbell deadlift'],
 levantamentoterraromeno:['barbell romanian deadlift','romanian deadlift'],
 stiffcombarra:['barbell stiff leg deadlift'],
 cadeiraextensora:['machine leg extension','lever leg extension','leg extension'],
 mesaflexora:['lever lying leg curl','lying leg curl'],
 cadeiraflexora:['lever seated leg curl','seated leg curl'],
 flexaodebracos:['push up','push-up'],
 barrafixapronada:['pull up','pull-up'],
 puxadafrontalnapolia:['cable lat pulldown','lat pulldown'],
 remadacurvadacombarra:['barbell bent over row','barbell row'],
 remadabaixanocabo:['cable seated row','seated cable row'],
 remadaunilateralcomhalter:['dumbbell one arm row','one arm dumbbell row'],
 desenvolvimentocomhalteres:['dumbbell shoulder press'],
 elevacaolateralcomhalteres:['dumbbell lateral raise'],
 elevacaolateralnocabo:['cable lateral raise'],
 elevacaofrontalcomhalteres:['dumbbell front raise'],
 roscadiretacombarrareta:['barbell curl'],
 roscadiretacomhalteres:['dumbbell curl'],
 roscamartelocomhalteres:['dumbbell hammer curl'],
 tricepspulleycomcorda:['cable rope triceps pushdown'],
 tricepspulleycombarrareta:['cable triceps pushdown'],
 facepullnapolia:['cable face pull','face pull'],
 peckdeck:['lever pec deck fly'],
 crossovernaspolias:['cable crossover'],
 abdominalcrunch:['crunches','abdominal crunch'],
 abdominalbicicleta:['bicycle crunch'],
 pranchaabdominal:['plank'],
 pranchalateral:['side plank'],
 deadbug:['dead bug'],
 birddog:['bird dog'],
 pontedegluteos:['glute bridge'],
 hipthrust:['barbell hip thrust'],
 polichinelo:['jumping jack'],
 burpee:['burpee'],
 pularcorda:['jump rope'],
 kettlebellswing:['kettlebell swing'],
 // Remaining FOCO-curated movements: candidate only, never partial-match substitution.
 remadacompeitoapoiado:['dumbbell chest supported row','chest supported row'],
 remadanamaquina:['lever seated row','machine row'],
 remadainclinadanocabo:['cable incline bench row'],
 pullovernamaquina:['lever pullover'],
 elevacaolateralnamaquina:['lever lateral raise'],
 rotacaoexternacomelastico:['band external shoulder rotation'],
 elevacaoemy:['dumbbell incline y raise','incline y raise'],
 rotacaoexternadeitadodelado:['dumbbell lying external rotation'],
 roscaalternadacomhalteres:['dumbbell alternate biceps curl'],
 roscaunilateralnapolia:['cable one arm curl'],
 roscabayesiananapolia:['cable bayesian curl'],
 roscamarteloalternada:['dumbbell alternating hammer curl'],
 roscareversanapolia:['cable reverse curl'],
 rosca21:['barbell 21s curl'],
 tricepsfrancescomdoishalteres:['dumbbell overhead triceps extension'],
 extensaounilateraldetricepsacimadacabecanapolia:['cable single arm overhead triceps extension'],
 tricepstestanapolia:['cable lying triceps extension'],
 extensaodetricepscomelastico:['band triceps extension'],
 extensaodepunhocombarra:['barbell wrist extension'],
 extensaodepunhonapolia:['cable wrist extension'],
 pronacaodoantebracocomhalter:['dumbbell pronation'],
 supinacaodoantebracocomhalter:['dumbbell supination'],
 pronacaoesupinacaocommartelo:['hammer forearm pronation supination'],
 sustentacaoestaticadecarga:['farmer hold'],
 suspensaoassistidanabarra:['assisted dead hang'],
 fechamentodehandgripper:['hand gripper'],
 extensaodosdedoscomelastico:['band finger extension'],
 agachamentosissyassistido:['assisted sissy squat'],
 extensaodequadrilnobancoa45grauscomcarga:['weighted hyperextension'],
 nordiccurlassistido:['assisted nordic hamstring curl'],
 flexaodejoelhonocabo:['cable standing leg curl'],
 agachamentobulgarocomenfasenoquadril:['dumbbell bulgarian split squat'],
 flexaodejoelhoscomsliders:['sliding leg curl'],
 abducaodequadrilnocabo:['cable hip abduction'],
 coicedegluteonamaquina:['lever glute kickback'],
 panturrilhanolegpress:['sled calf press'],
 panturrilhasentadacomhalter:['dumbbell seated calf raise'],
 panturrilhaunilateralnolegpress:['sled single leg calf press'],
 abdominalobliquo:['oblique crunch'],
 pranchacomjoelhosapoiados:['kneeling plank'],
 abdominalcrunchcomcarga:['weighted crunch'],
 elevacaodejoelhosdeitado:['lying knee raise'],
 elevacaoobliquadejoelhosnacadeiraromana:['captains chair oblique knee raise'],
 pranchaaltacomtoquenoombro:['plank shoulder tap'],
 extensaolombarcomcarga:['weighted back extension'],
 remadaaltacomcordanapolia:['cable rope upright row'],
 crucifixoinvertido:['dumbbell reverse fly'],
 abducaodequadrilnapolia:['cable hip abduction'],
 aducaodequadrilnapolia:['cable hip adduction'],
 caminhadanaesteira:['walking on treadmill'],
 bicicletaergometricaintervalada:['stationary bike'],
 corridaparada:['running in place'],
 corridaintervalada:['running on treadmill'],
};
export function normalizeExerciseDBName(name:string):string{
 return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/45\s*[°º]\s*/g,'45 degree ').replace(/[^a-z0-9]+/g,'');
}
export function candidateExerciseDBNames(name:string):string[]{
 const mapped=ALIASES[normalizeExerciseDBName(name)];
 if(mapped)return [...mapped];
 // FOCO already curates exact exercise-name→RepDB English slug pairs.
 const slug=repdbIdForExercise(name);
 if(slug&&/^[a-z0-9-]+$/.test(slug))return [slug.replace(/-/g,' ')];
 if(/^[a-z\d\-\s]+$/i.test(name))return [name];
 return [];
}
export function acceptedExerciseDBName(record:unknown, candidates:readonly string[]):boolean{
 if(!record||typeof record!=='object')return false;
 const name=(record as Item).name;
 return typeof name==='string'&&candidates.some(c=>normalizeExerciseDBName(c)===normalizeExerciseDBName(name));
}
export function safeExerciseDBGif(url:unknown):string|null{
 if(typeof url!=='string')return null;
 try{const u=new URL(url);return u.origin===GIF_ORIGIN&&/^\/media\/[A-Za-z0-9_-]+\.gif$/.test(u.pathname)&&!u.search&&!u.hash?u.href:null;}
 catch{return null;}
}
export function isExerciseDBBetaAllowed():boolean{
 return import.meta.env?.VITE_FOCO_EXERCISEDB_NONCOMMERCIAL_BETA==='true' && import.meta.env?.VITE_FOCO_COMMERCIAL_MODE!=='true';
}
// Provider caching rights are plan-specific. Do not persist ANY response,
// GIF URL, ID or negative result, including through an in-memory result cache.
// Only keep the unresolved request so rapid double taps do not duplicate traffic.
const pending=new Map<string,Promise<ExerciseDBPreviewResult>>();
let lastRequest=0;

export async function getExerciseDBGifPreview(exerciseName:string):Promise<ExerciseDBPreviewResult>{
 if(!isExerciseDBBetaAllowed())return {state:'disabled'};
 const candidates=candidateExerciseDBNames(exerciseName);
 if(!candidates.length)return {state:'no_match'};
 const key=normalizeExerciseDBName(exerciseName);
 if(pending.has(key))return pending.get(key)!;
 // Deliberate, user-initiated calls only. No prefetch or catalogue crawling.
 if(Date.now()-lastRequest<1400)return {state:'rate_limited'};
 lastRequest=Date.now();
 const task=(async():Promise<ExerciseDBPreviewResult>=>{
  // Two *explicitly approved names* at most. No fuzzy substitution:
  // the API's fuzzy suggestions are only candidates, not identity.
  for(const term of [...new Set(candidates)].slice(0,2)){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),8500);
   try{
    const res=await fetch(SEARCH_URL+'?search='+encodeURIComponent(term),{
      signal:controller.signal,headers:{Accept:'application/json'},
      cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'
    });
    if(res.status===429)return {state:'rate_limited'};
    if(!res.ok)return {state:'unavailable'};
    const body:unknown=await res.json();
    const data=body&&typeof body==='object'&&'data' in body?(body as {data:unknown}).data:null;
    for(const record of (Array.isArray(data)?data.slice(0,60):[])){
      if(!acceptedExerciseDBName(record,candidates))continue;
      const item=record as Item,gifUrl=safeExerciseDBGif(item.gifUrl);
      if(gifUrl&&typeof item.name==='string'&&typeof item.exerciseId==='string')
        return {state:'matched',id:item.exerciseId,name:item.name,gifUrl};
    }
   }catch{return {state:'unavailable'};}
   finally{clearTimeout(timeout);}
   // Give the strict OSS rate limiter breathing room between approved variants.
   if(candidates.length>1)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  return {state:'no_match'};
 })();
 pending.set(key,task);
 try{return await task;}
 finally{pending.delete(key);}
}

/** Keeps the existing unit-test helper name without retaining API data. */
export function clearExerciseDBPreviewCacheForTests(){pending.clear();lastRequest=0;}

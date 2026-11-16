export interface PersonalMessage { role:'user'|'assistant'; content:string; references?:{id:string;page:number;rule:string}[]; provider?:string; }
const prefix='foco:personal:v1:';
export function readPersonalConversation(userId:string):PersonalMessage[]{
  try{const value=JSON.parse(sessionStorage.getItem(prefix+encodeURIComponent(userId))||'null');
    if(!value||!Number.isFinite(value.expiresAt)||value.expiresAt<=Date.now()||!Array.isArray(value.messages))return[];
    return value.messages.slice(-24).filter((m:any)=>['user','assistant'].includes(m?.role)&&typeof m.content==='string'&&m.content.length<=5000)
      .map((m:any)=>({role:m.role,content:m.content,references:Array.isArray(m.references)?m.references.filter((r:any)=>/^LAB\d+$/.test(r?.id)&&Number.isInteger(r.page)&&typeof r.rule==='string'):[],provider:typeof m.provider==='string'?m.provider:undefined}));
  }catch{return[];}
}
export function savePersonalConversation(userId:string,messages:PersonalMessage[]):boolean{
  try{sessionStorage.setItem(prefix+encodeURIComponent(userId),JSON.stringify({expiresAt:Date.now()+24*3600_000,messages:messages.slice(-24)}));return true;}catch{return false;}
}
export function clearPersonalConversation(userId:string){try{sessionStorage.removeItem(prefix+encodeURIComponent(userId));}catch{}}

export function clearAllPersonalConversations(){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(prefix))sessionStorage.removeItem(key);}catch{}}

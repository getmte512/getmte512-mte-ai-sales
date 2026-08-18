import{createHmac,timingSafeEqual}from"node:crypto";
export type ResendWebhookEvent={type:string;created_at:string;data:Record<string,unknown>};
function secretBytes(secret:string){const raw=secret.startsWith("whsec_")?secret.slice(6):secret;return Buffer.from(raw,"base64");}
export function verifyResendWebhook(input:{payload:string;id:string|null;timestamp:string|null;signature:string|null;secret:string;nowSeconds?:number}){
 const{id,timestamp,signature,secret}=input;if(!id||!timestamp||!signature||!secret)return false;const ts=Number(timestamp);const now=input.nowSeconds??Math.floor(Date.now()/1000);if(!Number.isFinite(ts)||Math.abs(now-ts)>300)return false;
 const expected=createHmac("sha256",secretBytes(secret)).update(`${id}.${timestamp}.${input.payload}`).digest();
 return signature.split(" ").some(part=>{const[valueVersion,value]=part.split(",",2);if(valueVersion!=="v1"||!value)return false;let actual:Buffer;try{actual=Buffer.from(value,"base64")}catch{return false}return actual.length===expected.length&&timingSafeEqual(actual,expected)});
}
export function parseMessageReferences(headers:Record<string,unknown>){
 const lower=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),String(v??"")]));const inReplyTo=lower["in-reply-to"]?.trim()||null;const references=(lower.references??"").match(/<[^>]+>/g)??[];return{inReplyTo,references};
}
export function extractEmailAddress(value:string){const match=value.match(/<([^>]+)>/);return(match?.[1]??value).trim().toLowerCase();}

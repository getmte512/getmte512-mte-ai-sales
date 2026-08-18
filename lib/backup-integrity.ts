import{createHash}from"node:crypto";
export const BACKUP_FORMAT_VERSION=2 as const;
export const BACKUP_DIGEST_ALGORITHM="sha256" as const;
function canonicalize(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonicalize).join(",")}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;}
export function buildBackupDigest(input:{version:number;exportedAt:string;exportedBy:string;summary:Record<string,number>;data:Record<string,unknown[]>}){return createHash(BACKUP_DIGEST_ALGORITHM).update(canonicalize(input),"utf8").digest("hex");}
export function buildBackupManifest(input:{version:number;exportedAt:string;exportedBy:string;summary:Record<string,number>;data:Record<string,unknown[]>}){return{algorithm:BACKUP_DIGEST_ALGORITHM,digest:buildBackupDigest(input),tableCount:Object.keys(input.data).length,recordCount:Object.values(input.summary).reduce((sum,count)=>sum+count,0)};}

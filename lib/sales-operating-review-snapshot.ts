import{createHash}from"node:crypto";
import type{ReviewPeriod}from"./sales-operating-review";
function canonical(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;}
export function operatingReviewSnapshotHash(input:{period:ReviewPeriod;asOf:string;review:unknown}){return createHash("sha256").update(canonical(input)).digest("hex")}

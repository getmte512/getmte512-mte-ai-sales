import{createHash}from"node:crypto";
import type{ReviewPeriod}from"./sales-operating-review";
function canonical(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;const record=value as Record<string,unknown>;return`{${Object.keys(record).sort().map(key=>`${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;}
function sha(value:unknown){return createHash("sha256").update(canonical(value)).digest("hex")}
export function operatingReviewSnapshotHash(input:{period:ReviewPeriod;asOf:string;review:unknown}){return sha(input)}
export function operatingTargetContextHash(input:{period:ReviewPeriod;asOf:string;targets:unknown;scorecard:unknown}){return sha(input)}

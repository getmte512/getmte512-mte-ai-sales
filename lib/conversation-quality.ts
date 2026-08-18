export type ConversationQualityRecord={status:"pending"|"accepted"|"dismissed";intent_label:string;confidence:"low"|"medium"|"high";model:string;created_at:string;reviewed_at?:string|null};
export type ConversationQualitySummary={reviewed:number;accepted:number;dismissed:number;acceptanceRate:number|null;byIntent:Array<{intent:string;reviewed:number;accepted:number;acceptanceRate:number}>;byConfidence:Array<{confidence:string;reviewed:number;accepted:number;acceptanceRate:number}>;advisories:string[]};

function rate(accepted:number,reviewed:number){return reviewed?Math.round((accepted/reviewed)*100):0}
export function summarizeConversationQuality(records:ConversationQualityRecord[]):ConversationQualitySummary{
 const reviewedRecords=records.filter(record=>record.status!=="pending");
 const accepted=reviewedRecords.filter(record=>record.status==="accepted").length;
 const dismissed=reviewedRecords.filter(record=>record.status==="dismissed").length;
 const group=(key:"intent_label"|"confidence")=>{const map=new Map<string,{reviewed:number;accepted:number}>();for(const record of reviewedRecords){const label=record[key];const current=map.get(label)??{reviewed:0,accepted:0};current.reviewed+=1;if(record.status==="accepted")current.accepted+=1;map.set(label,current)}return [...map.entries()].map(([label,value])=>({[key==="intent_label"?"intent":"confidence"]:label,reviewed:value.reviewed,accepted:value.accepted,acceptanceRate:rate(value.accepted,value.reviewed)}))};
 const byIntent=group("intent_label") as ConversationQualitySummary["byIntent"];
 const byConfidence=group("confidence") as ConversationQualitySummary["byConfidence"];
 const advisories:string[]=[];
 if(reviewedRecords.length<10)advisories.push("Collect at least 10 reviewed recommendations before changing prompts or models from acceptance data.");
 for(const item of byIntent){if(item.reviewed>=5&&item.acceptanceRate<50)advisories.push(`${item.intent} recommendations are accepted only ${item.acceptanceRate}% of the time across ${item.reviewed} reviews; inspect dismissed examples before tuning.`)}
 const high=byConfidence.find(item=>item.confidence==="high");if(high&&high.reviewed>=5&&high.acceptanceRate<60)advisories.push(`High-confidence recommendations are accepted only ${high.acceptanceRate}% of the time; confidence calibration should be reviewed before relying on that label.`);
 if(reviewedRecords.length>=10&&accepted/reviewedRecords.length>=0.8)advisories.push("Acceptance is strong overall; keep current behavior stable and review intent-level exceptions before making changes.");
 return{reviewed:reviewedRecords.length,accepted,dismissed,acceptanceRate:reviewedRecords.length?rate(accepted,reviewedRecords.length):null,byIntent,byConfidence,advisories};
}

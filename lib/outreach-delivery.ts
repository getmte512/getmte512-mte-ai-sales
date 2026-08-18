import{createHash}from"node:crypto";
export type DeliverySnapshot={channel:string;recipient:string;subject:string;body:string};
export function canonicalDeliverySnapshot(input:DeliverySnapshot){return{channel:input.channel.trim().toLowerCase(),recipient:input.recipient.trim().toLowerCase(),subject:input.subject,body:input.body};}
export function outreachDeliveryHash(input:DeliverySnapshot){const snapshot=canonicalDeliverySnapshot(input);return createHash("sha256").update(JSON.stringify(snapshot),"utf8").digest("hex");}

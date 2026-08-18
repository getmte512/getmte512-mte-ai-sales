export function recommendedSampleFollowUp(deliveredOn:string,delayDays=2){
  const delivered=new Date(`${deliveredOn}T12:00:00Z`);
  if(Number.isNaN(delivered.getTime()))throw new Error("A valid sample delivery date is required.");
  delivered.setUTCDate(delivered.getUTCDate()+delayDays);
  return delivered.toISOString().slice(0,10);
}

export function validateSampleTimeline(input:{sentOn?:string|null;deliveredOn?:string|null}){
  if(input.sentOn&&input.deliveredOn&&input.deliveredOn<input.sentOn)throw new Error("Sample delivery cannot be earlier than the shipment date.");
}

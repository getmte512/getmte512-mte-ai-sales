export function applyLeadScoreAdjustment(baseScore:number, adjustment:number|null|undefined){
  return Math.max(0,Math.min(100,baseScore+(adjustment??0)));
}

export function validateLeadScoreAdjustment(input:{adjustment:number;reason:string}){
  const adjustment=Math.trunc(input.adjustment);
  const reason=input.reason.trim();
  if(!Number.isInteger(input.adjustment)||adjustment===0||adjustment < -50||adjustment > 50) throw new Error("Score adjustment must be a whole number from -50 to 50, excluding zero.");
  if(reason.length < 3||reason.length > 500) throw new Error("A reason between 3 and 500 characters is required.");
  return {adjustment,reason};
}

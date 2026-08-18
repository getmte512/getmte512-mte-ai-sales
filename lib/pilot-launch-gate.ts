const requiredVerificationKeys=["invitation","approval_flow","backup_restore"] as const;
export type PilotLaunchEvidence={latestSmokeStatus:string|null;verificationKeys:string[]};
export function evaluatePilotLaunchGate(evidence:PilotLaunchEvidence){const missing=requiredVerificationKeys.filter(key=>!evidence.verificationKeys.includes(key));const smokeReady=evidence.latestSmokeStatus==="ready";return{allowed:smokeReady&&missing.length===0,smokeReady,missingVerifications:missing,reason:!smokeReady?"Record a production smoke test with zero blockers before starting the pilot.":missing.length?`Complete launch verification: ${missing.join(", ")}.`:"Pilot launch gates are satisfied."};}
export function statusStartsPilot(status:string){return status==="invited"||status==="active";}

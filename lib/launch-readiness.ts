export type LaunchGate={name:string;passed:boolean;required:boolean;detail:string};
export type LaunchVerificationEvidence={invitationVerifiedAt:string|null;approvalFlowVerifiedAt:string|null;backupRestoreVerifiedAt:string|null};

function verifiedAt(value:string|undefined){
  const trimmed=value?.trim();
  if(!trimmed)return null;
  const time=Date.parse(trimmed);
  return Number.isFinite(time)&&time<=Date.now()?new Date(time).toISOString():null;
}

export function getLaunchVerificationEvidence(env:Record<string,string|undefined>):LaunchVerificationEvidence{
  return{
    invitationVerifiedAt:verifiedAt(env.LAUNCH_INVITATION_VERIFIED_AT),
    approvalFlowVerifiedAt:verifiedAt(env.LAUNCH_APPROVAL_FLOW_VERIFIED_AT),
    backupRestoreVerifiedAt:verifiedAt(env.LAUNCH_BACKUP_RESTORE_VERIFIED_AT)
  };
}

export function summarizeLaunchReadiness(gates:LaunchGate[]){const requiredBlocked=gates.filter(gate=>gate.required&&!gate.passed);const optionalPending=gates.filter(gate=>!gate.required&&!gate.passed);return{decision:requiredBlocked.length?"not_ready":optionalPending.length?"pilot_ready":"launch_ready",passed:gates.filter(gate=>gate.passed).length,requiredBlocked:requiredBlocked.length,optionalPending:optionalPending.length};}

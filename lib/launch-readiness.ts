export type LaunchGate={name:string;passed:boolean;required:boolean;detail:string};
export type LaunchVerificationEvidence={invitationVerifiedAt:string|null;approvalFlowVerifiedAt:string|null;backupRestoreVerifiedAt:string|null};
export type LaunchVerificationRow={verification_key:"invitation"|"approval_flow"|"backup_restore";verified_at:string};

function verifiedAt(value:string|undefined|null){
  const trimmed=value?.trim();
  if(!trimmed)return null;
  const time=Date.parse(trimmed);
  return Number.isFinite(time)&&time<=Date.now()?new Date(time).toISOString():null;
}

export function getLaunchVerificationEvidence(env:Record<string,string|undefined>,rows:LaunchVerificationRow[]=[]):LaunchVerificationEvidence{
  const byKey=new Map(rows.map(row=>[row.verification_key,verifiedAt(row.verified_at)]));
  return{
    invitationVerifiedAt:byKey.get("invitation")??verifiedAt(env.LAUNCH_INVITATION_VERIFIED_AT),
    approvalFlowVerifiedAt:byKey.get("approval_flow")??verifiedAt(env.LAUNCH_APPROVAL_FLOW_VERIFIED_AT),
    backupRestoreVerifiedAt:byKey.get("backup_restore")??verifiedAt(env.LAUNCH_BACKUP_RESTORE_VERIFIED_AT)
  };
}

export function summarizeLaunchReadiness(gates:LaunchGate[]){const requiredBlocked=gates.filter(gate=>gate.required&&!gate.passed);const optionalPending=gates.filter(gate=>!gate.required&&!gate.passed);return{decision:requiredBlocked.length?"not_ready":optionalPending.length?"pilot_ready":"launch_ready",passed:gates.filter(gate=>gate.passed).length,requiredBlocked:requiredBlocked.length,optionalPending:optionalPending.length};}

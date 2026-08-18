import { createHash } from "node:crypto";
import type { CommandCenterItem } from "./sales-command-center";

export type CommandDecisionOutcome="completed"|"dismissed"|"deferred";
export type CommandDecision={itemFingerprint:string;outcome:CommandDecisionOutcome;deferUntil?:string|null;decidedAt?:string|null};

export function commandDecisionFingerprint(item:Pick<CommandCenterItem,"id"|"kind"|"action"|"reason">){
 return createHash("sha256").update([item.id,item.kind,item.action,item.reason].join("\u001f")).digest("hex");
}

export function applyCommandDecisions(items:CommandCenterItem[],decisions:CommandDecision[],today:string){
 const byFingerprint=new Map(decisions.map(decision=>[decision.itemFingerprint,decision]));
 let completed=0,dismissed=0,deferred=0,expiredDeferrals=0;
 const visible=items.filter(item=>{
  const decision=byFingerprint.get(commandDecisionFingerprint(item));
  if(!decision)return true;
  if(decision.outcome==="completed"){completed++;return false;}
  if(decision.outcome==="dismissed"){dismissed++;return false;}
  if(decision.outcome==="deferred"){
   if(decision.deferUntil&&decision.deferUntil>today){deferred++;return false;}
   expiredDeferrals++;return true;
  }
  return true;
 });
 return{visible,summary:{completed,dismissed,deferred,expiredDeferrals,hidden:completed+dismissed+deferred}};
}

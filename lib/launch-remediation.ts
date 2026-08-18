export type SmokeCheck={name:string;passed:boolean;detail:string};
export type LaunchRemediation={id?:string;check_name:string;status:"open"|"in_progress"|"resolved";owner:string|null;note:string|null;updated_at?:string};

export function blockerPriority(name:string){
  const value=name.toLowerCase();
  if(value.includes("database")||value.includes("administrator")||value.includes("backup"))return 1;
  if(value.includes("shopify"))return 2;
  return 3;
}

export function buildLaunchBlockerQueue(checks:SmokeCheck[],remediations:LaunchRemediation[]){
  const byName=new Map(remediations.map(item=>[item.check_name,item]));
  return checks.filter(check=>!check.passed).map(check=>{
    const saved=byName.get(check.name);
    return{
      checkName:check.name,
      detail:check.detail,
      priority:blockerPriority(check.name),
      status:saved?.status??"open" as const,
      owner:saved?.owner??null,
      note:saved?.note??null,
      updatedAt:saved?.updated_at??null
    };
  }).sort((a,b)=>a.priority-b.priority||a.checkName.localeCompare(b.checkName));
}

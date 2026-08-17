export type PerformanceCheck={name:string;durationMs:number;recordCount:number};
export function summarizePerformance(checks:PerformanceCheck[]){const slow=checks.filter(check=>check.durationMs>1500);return{status:slow.length?"warning":"ready",slowChecks:slow.length,maxDurationMs:Math.max(0,...checks.map(check=>check.durationMs)),totalRecords:checks.reduce((sum,check)=>sum+check.recordCount,0)};}

export type SmokeCheck={name:string;passed:boolean;detail:string};
export function summarizeProductionSmokeTest(checks:SmokeCheck[]){const failed=checks.filter(check=>!check.passed);return{passed:checks.length-failed.length,total:checks.length,failed:failed.length,status:failed.length?"blocked":"ready" as const};}

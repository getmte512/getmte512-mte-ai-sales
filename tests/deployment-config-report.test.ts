import{describe,expect,it}from"vitest";import{readFileSync}from"node:fs";
const script=readFileSync("scripts/deployment-config-report.mjs","utf8");const pkg=JSON.parse(readFileSync("package.json","utf8"));
describe("deployment configuration report",()=>{
 it("exposes a production-safe readiness command",()=>{expect(pkg.scripts["config:production"]).toBe("node scripts/deployment-config-report.mjs --production")});
 it("checks the deployment-critical configuration without printing values",()=>{for(const key of["NEXT_PUBLIC_APP_URL","NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","REVIEW_EVIDENCE_SIGNING_SECRET","REVIEW_EVIDENCE_SIGNING_KEY_ID"]){expect(script).toContain(key)}expect(script).not.toContain("console.log(env");expect(script).not.toContain("console.log(process.env")});
 it("detects partial optional integrations as blockers",()=>{expect(script).toContain('status:configured.length===0?"not_configured":configured.length===group.keys.length?"configured":"partial"');expect(script).toContain("partialOptional")});
});

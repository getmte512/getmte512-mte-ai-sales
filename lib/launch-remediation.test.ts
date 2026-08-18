import{describe,expect,it}from"vitest";import{blockerPriority,buildLaunchBlockerQueue}from"./launch-remediation";
describe("launch remediation queue",()=>{
  it("prioritizes infrastructure and backup blockers ahead of integrations",()=>{expect(blockerPriority("Database: contacts")).toBe(1);expect(blockerPriority("Backup export readiness")).toBe(1);expect(blockerPriority("Shopify credentials")).toBe(2)});
  it("includes only failed checks and preserves remediation state",()=>{const queue=buildLaunchBlockerQueue([{name:"Database: contacts",passed:true,detail:"ok"},{name:"Shopify credentials",passed:false,detail:"missing"}],[{check_name:"Shopify credentials",status:"in_progress",owner:"Ops",note:"credential handoff pending"}]);expect(queue).toEqual([{checkName:"Shopify credentials",detail:"missing",priority:2,status:"in_progress",owner:"Ops",note:"credential handoff pending",updatedAt:null}])});
});

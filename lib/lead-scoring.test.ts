import {describe,expect,it} from "vitest"; import {scoreLead} from "./lead-scoring";
const base={buyer_name:null,job_title:null,email:null,phone:null,linkedin_url:null,website:null,category:null,state:null,completeness:"minimal",email_health:"unverified",research_confidence:null};
describe("scoreLead",()=>{
  it("ranks a source-backed complete reachable buyer high",()=>{const r=scoreLead({...base,buyer_name:"Alex Buyer",job_title:"Category Manager",email:"alex@example.com",phone:"555-0100",category:"Wellness",state:"TX",completeness:"complete",email_health:"historically_delivered",research_confidence:"high"});expect(r.score).toBe(100);expect(r.tier).toBe("high");expect(r.nextAction).toBe("Review for personalized outreach")});
  it("routes incomplete records to research",()=>expect(scoreLead({...base,email:"info@example.com"}).nextAction).toBe("Research buyer and role"));
  it("separates researched records with unresolved verification gaps",()=>expect(scoreLead({...base,email:"info@example.com",notes:"Buyer role could not be confirmed."}).nextAction).toBe("Verification required"));
  it("holds otherwise complete contacts until a research source is recorded",()=>expect(scoreLead({...base,buyer_name:"Alex Buyer",job_title:"Buyer",email:"alex@example.com",completeness:"complete"}).nextAction).toBe("Verification required"));
  it("never prioritizes suppressed contacts",()=>expect(scoreLead({...base,buyer_name:"Buyer",email:"buyer@example.com",email_health:"suppressed"}).score).toBe(0));
});

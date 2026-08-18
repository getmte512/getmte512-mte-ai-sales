import{describe,expect,it}from"vitest";import{compareDiscoveryPriority,scoreDiscoveryCandidate}from"./prospect-discovery-priority";
const base={buyer_name:null,job_title:null,email:null,linkedin_url:null,website:null,category:null,state:null,confidence:"medium" as const};
describe("prospect discovery priority",()=>{
  it("scores transparent source, role, and contactability factors",()=>{const result=scoreDiscoveryCandidate({...base,confidence:"high",buyer_name:"Pat Buyer",job_title:"Category Manager",email:"pat@example.com",linkedin_url:"https://linkedin.com/in/pat",website:"https://example.com",category:"Grocery",state:"TX"});expect(result.score).toBe(100);expect(result.reasons).toContain("high-confidence source");expect(result.reasons).toContain("purchasing decision-maker role");});
  it("does not give decision-maker points just for an unrelated title",()=>{const buyer=scoreDiscoveryCandidate({...base,buyer_name:"A",job_title:"Category Buyer"});const unrelated=scoreDiscoveryCandidate({...base,buyer_name:"B",job_title:"Graphic Designer"});expect(buyer.score).toBeGreaterThan(unrelated.score);});
  it("sorts highest-priority review candidates first",()=>{const low={...base};const high={...base,confidence:"high" as const,buyer_name:"Buyer",job_title:"Purchasing Manager"};expect([low,high].sort(compareDiscoveryPriority)[0]).toEqual(high);});
});

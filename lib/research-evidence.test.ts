import{describe,expect,it}from"vitest";import{chooseResearchSource}from"./research-evidence";

describe("chooseResearchSource",()=>{
  it("prefers a reviewable LinkedIn source and marks it high confidence",()=>expect(chooseResearchSource({linkedinUrl:"https://linkedin.com/in/alex",website:"https://example.com"})).toEqual({sourceType:"linkedin",sourceUrl:"https://linkedin.com/in/alex",confidence:"high"}));
  it("falls back to the company website at medium confidence",()=>expect(chooseResearchSource({website:"https://example.com"})).toEqual({sourceType:"company_website",sourceUrl:"https://example.com",confidence:"medium"}));
  it("refuses to create research evidence without a reviewable source",()=>expect(chooseResearchSource({linkedinUrl:"",website:""})).toBeNull());
});

import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const route=readFileSync(new URL("../app/api/prospect-discovery/search/route.ts",import.meta.url),"utf8");const helper=readFileSync(new URL("./prospect-web-discovery.ts",import.meta.url),"utf8");
describe("web prospect discovery safety contract",()=>{
  it("requires authenticated sales access, explicit search intent, and a server-only credential",()=>{expect(route).toContain("requireSales()");expect(route).toContain('z.literal("SEARCH_FOR_PROSPECTS")');expect(route).toContain("process.env.OPENAI_API_KEY");expect(route).not.toContain("NEXT_PUBLIC_OPENAI");});
  it("queues validated candidates instead of creating contacts or sending outreach",()=>{expect(route).toContain('queue_prospect_discovery_candidate');expect(route).not.toContain('.from("contacts").insert');expect(route).not.toMatch(/send.*email|send.*message|shopify.*order/i);});
  it("requires provider-consulted sources before queueing",()=>{expect(helper).toContain('include:["web_search_call.action.sources"]');expect(helper).toContain("consultedSources.has(source)");expect(helper).toContain('sourceHost?.endsWith("linkedin.com")');expect(helper).toContain("sourceHost!==websiteHost");});
});

import{readFileSync}from"node:fs";import{describe,expect,it}from"vitest";
const migration=readFileSync(new URL("../supabase/migrations/037_prospect_search_provenance.sql",import.meta.url),"utf8");const route=readFileSync(new URL("../app/api/prospect-discovery/search/route.ts",import.meta.url),"utf8");
describe("prospect search provenance",()=>{
  it("links queued web candidates to the active actor-owned search transaction",()=>{expect(migration).toContain("search_run_id uuid references public.prospect_discovery_search_runs");expect(migration).toContain("requested_by=p_actor_id and status='running'");expect(migration).toContain("queue_prospect_discovery_candidate(p_actor_id,p_candidate)");expect(migration).toContain("prospect_discovery_search_candidate_linked");});
  it("uses the provenance-preserving RPC for automated search results",()=>{expect(route).toContain('queue_prospect_discovery_candidate_for_search');expect(route).toContain("p_search_run_id:runId");expect(route).not.toContain('supabase.rpc("queue_prospect_discovery_candidate",{p_actor_id:user.id,p_candidate:candidate}');});
});

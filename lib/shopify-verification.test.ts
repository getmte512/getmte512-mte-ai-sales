import{describe,expect,it}from"vitest";
import{verifyShopifySnapshots}from"./shopify-verification";

const now="2026-08-17T12:00:00.000Z";

describe("Shopify snapshot verification",()=>{
  it("waits safely before the first approved sync",()=>expect(verifyShopifySnapshots({orderCount:0,productCount:0,latestOrderSync:null,latestProductSync:null,failedRuns:0,now}).status).toBe("awaiting_first_sync"));
  it("verifies recent stored snapshots",()=>expect(verifyShopifySnapshots({orderCount:12,productCount:8,latestOrderSync:"2026-08-17T10:00:00.000Z",latestProductSync:"2026-08-17T11:00:00.000Z",failedRuns:0,now})).toMatchObject({status:"verified",orderAgeHours:2,productAgeHours:1}));
  it("flags snapshots older than two days",()=>expect(verifyShopifySnapshots({orderCount:12,productCount:8,latestOrderSync:"2026-08-14T10:00:00.000Z",latestProductSync:"2026-08-17T11:00:00.000Z",failedRuns:0,now}).status).toBe("stale"));
  it("prioritizes failed synchronization runs",()=>expect(verifyShopifySnapshots({orderCount:12,productCount:8,latestOrderSync:"2026-08-17T10:00:00.000Z",latestProductSync:"2026-08-17T11:00:00.000Z",failedRuns:1,now}).status).toBe("attention"));
});

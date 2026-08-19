import{describe,expect,it}from"vitest";import{readFileSync}from"node:fs";
const smoke=readFileSync("app/api/smoke-test/route.ts","utf8");
describe("operating review annotation production smoke",()=>{it("verifies annotation storage without mutating it",()=>{expect(smoke).toContain('from("sales_operating_review_annotations")');expect(smoke).toContain('name:"Milestone 25 schema"');expect(smoke).toContain("migration 055");expect(smoke).not.toContain('rpc("add_sales_operating_review_annotation"')})});

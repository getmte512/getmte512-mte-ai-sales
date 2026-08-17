import{describe,expect,it}from"vitest";import{roleAllows}from"./app-role";
describe("application roles",()=>{it("allows admins everywhere",()=>expect(roleAllows("admin","sales")).toBe(true));it("allows sales users in sales workflows",()=>expect(roleAllows("sales","sales")).toBe(true));it("blocks sales users from admin workflows",()=>expect(roleAllows("sales","admin")).toBe(false));});

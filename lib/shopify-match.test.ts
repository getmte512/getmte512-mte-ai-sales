import {describe,expect,it} from "vitest";
import {matchShopifyCustomers} from "./shopify-match";

const contacts=[{id:"1",email:"buyer@example.com",phone:"(512) 555-1212",company_name:"Health Mart"},{id:"2",email:null,phone:null,company_name:"Other Shop"}];

describe("Shopify customer matching",()=>{
  it("matches normalized email and phone",()=>{const [match]=matchShopifyCustomers([{id:"s1",displayName:"Buyer",email:"BUYER@example.com",phone:"+1 512-555-1212",company:"Health Mart"}],contacts);expect(match.contactId).toBe("1");expect(match.confidence).toBe("exact");expect(match.reasons).toContain("Exact email");});
  it("leaves customers without signals unmatched",()=>{const [match]=matchShopifyCustomers([{id:"s2",displayName:"New",email:null,phone:null,company:"New Store"}],contacts);expect(match.confidence).toBe("unmatched");});
  it("requires review for a company-only match",()=>{const [match]=matchShopifyCustomers([{id:"s3",displayName:"Buyer",email:null,phone:null,company:"Other Shop"}],contacts);expect(match.confidence).toBe("review");});
});

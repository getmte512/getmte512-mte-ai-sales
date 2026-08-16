export type MatchableContact = { id:string; email:string|null; phone:string|null; company_name:string };
export type ShopifyCustomer = { id:string; displayName:string; email:string|null; phone:string|null; company:string|null };
export type CustomerMatch = { customer:ShopifyCustomer; contactId:string|null; confidence:"exact"|"strong"|"review"|"unmatched"; reasons:string[] };

const text=(value:string|null|undefined)=>value?.toLowerCase().replace(/[^a-z0-9]/g,"")??"";
const email=(value:string|null|undefined)=>value?.trim().toLowerCase()??"";
const phone=(value:string|null|undefined)=>value?.replace(/\D/g,"").slice(-10)??"";

export function matchShopifyCustomers(customers:ShopifyCustomer[],contacts:MatchableContact[]):CustomerMatch[]{
  return customers.map(customer=>{
    const ranked=contacts.map(contact=>{
      const reasons:string[]=[];let score=0;
      if(email(customer.email)&&email(customer.email)===email(contact.email)){score+=100;reasons.push("Exact email");}
      if(phone(customer.phone)&&phone(customer.phone)===phone(contact.phone)){score+=80;reasons.push("Exact phone");}
      if(text(customer.company)&&text(customer.company)===text(contact.company_name)){score+=50;reasons.push("Exact company");}
      return {contact,score,reasons};
    }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
    if(!ranked.length)return {customer,contactId:null,confidence:"unmatched",reasons:[]};
    if(ranked[1]?.score===ranked[0].score)return {customer,contactId:null,confidence:"review",reasons:["Multiple CRM records match"]};
    const best=ranked[0];
    return {customer,contactId:best.contact.id,confidence:best.score>=100?"exact":best.score>=80?"strong":"review",reasons:best.reasons};
  });
}

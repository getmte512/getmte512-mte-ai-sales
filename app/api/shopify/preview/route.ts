import {NextResponse} from "next/server";
import {requireUser} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getShopifyReadiness} from "@/lib/shopify-config";
import {matchShopifyCustomers,type ShopifyCustomer} from "@/lib/shopify-match";

const query=`query CustomerMatchPreview { customers(first: 50) { nodes { id displayName email phone defaultAddress { company } } } }`;

export async function GET(){
  try{
    await requireUser();
    const readiness=getShopifyReadiness(process.env);
    if(!readiness.configured)return NextResponse.json({error:"Shopify connection settings are required."},{status:409});
    const shop=process.env.SHOPIFY_SHOP_DOMAIN!.trim().toLowerCase();
    if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))return NextResponse.json({error:"The Shopify shop domain is invalid."},{status:400});
    const response=await fetch(`https://${shop}/admin/api/${readiness.apiVersion}/graphql.json`,{method:"POST",headers:{"content-type":"application/json","x-shopify-access-token":process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!},body:JSON.stringify({query}),cache:"no-store"});
    const result=await response.json();
    if(!response.ok||result.errors)return NextResponse.json({error:"Shopify could not return the customer preview."},{status:502});
    const customers:ShopifyCustomer[]=result.data.customers.nodes.map((item:{id:string;displayName:string;email:string|null;phone:string|null;defaultAddress:{company:string|null}|null})=>({...item,company:item.defaultAddress?.company??null}));
    const supabase=createAdminClient();
    const {data:contacts,error}=await supabase.from("contacts").select("id,email,phone,company_name");
    if(error)throw error;
    const matches=matchShopifyCustomers(customers,contacts??[]);
    return NextResponse.json({matches,summary:{total:matches.length,matched:matches.filter(m=>m.contactId).length,review:matches.filter(m=>m.confidence==="review").length,unmatched:matches.filter(m=>m.confidence==="unmatched").length}});
  }catch(error){const message=error instanceof Error?error.message:"Unable to preview Shopify matches.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message},{status:message==="UNAUTHORIZED"?401:500});}
}

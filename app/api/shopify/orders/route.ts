import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/authorization";
import {createAdminClient} from "@/lib/supabase/admin";
import {getShopifyReadiness} from "@/lib/shopify-config";
import {matchShopifyCustomers,type ShopifyCustomer} from "@/lib/shopify-match";
import {summarizeShopifyOrders,type ShopifyOrderPreview} from "@/lib/shopify-orders";

const query=`query OrderPreview { orders(first: 50, sortKey: CREATED_AT, reverse: true) { nodes { id name createdAt displayFinancialStatus displayFulfillmentStatus totalPriceSet { shopMoney { amount currencyCode } } customer { id displayName email phone defaultAddress { company } } } } }`;

export async function GET(){try{
  await requireAdmin();const readiness=getShopifyReadiness(process.env);
  if(!readiness.configured)return NextResponse.json({error:"Shopify connection settings are required."},{status:409});
  const shop=process.env.SHOPIFY_SHOP_DOMAIN!.trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))return NextResponse.json({error:"The Shopify shop domain is invalid."},{status:400});
  const response=await fetch(`https://${shop}/admin/api/${readiness.apiVersion}/graphql.json`,{method:"POST",headers:{"content-type":"application/json","x-shopify-access-token":process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!},body:JSON.stringify({query}),cache:"no-store"});
  const result=await response.json();if(!response.ok||result.errors)return NextResponse.json({error:"Shopify could not return the order preview."},{status:502});
  const supabase=createAdminClient();const {data:contacts,error}=await supabase.from("contacts").select("id,email,phone,company_name");if(error)throw error;
  const nodes=result.data.orders.nodes as {id:string;name:string;createdAt:string;displayFinancialStatus:string;displayFulfillmentStatus:string;totalPriceSet:{shopMoney:{amount:string;currencyCode:string}};customer:{id:string;displayName:string;email:string|null;phone:string|null;defaultAddress:{company:string|null}|null}|null}[];
  const customers:ShopifyCustomer[]=nodes.filter(node=>node.customer).map(node=>({...node.customer!,company:node.customer!.defaultAddress?.company??null}));
  const customerMatches=new Map(matchShopifyCustomers(customers,contacts??[]).map(match=>[match.customer.id,match.contactId]));
  const orders:ShopifyOrderPreview[]=nodes.map(node=>({id:node.id,name:node.name,createdAt:node.createdAt,financialStatus:node.displayFinancialStatus,fulfillmentStatus:node.displayFulfillmentStatus,amount:Number(node.totalPriceSet.shopMoney.amount),currencyCode:node.totalPriceSet.shopMoney.currencyCode,crmContactId:node.customer?customerMatches.get(node.customer.id)??null:null}));
  return NextResponse.json({orders,summary:summarizeShopifyOrders(orders)});
}catch(error){const message=error instanceof Error?error.message:"Unable to preview Shopify orders.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Administrator access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});}}

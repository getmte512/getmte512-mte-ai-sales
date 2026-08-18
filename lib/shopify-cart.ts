export type ShopifyCartLine={variantGid:string;quantity:number};
export function shopifyNumericId(gid:string,resource:"ProductVariant"){
 const prefix=`gid://shopify/${resource}/`;if(!gid.startsWith(prefix))throw new Error(`Invalid Shopify ${resource} GID.`);const id=gid.slice(prefix.length);if(!/^\d+$/.test(id))throw new Error(`Invalid Shopify ${resource} GID.`);return id;
}
export function buildShopifyCartUrl(shopDomain:string,lines:ShopifyCartLine[]){
 const shop=shopDomain.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))throw new Error("Invalid Shopify shop domain.");if(!lines.length)throw new Error("At least one Shopify cart line is required.");
 const path=lines.map(line=>{if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>1000)throw new Error("Invalid Shopify cart quantity.");return `${shopifyNumericId(line.variantGid,"ProductVariant")}:${line.quantity}`;}).join(",");
 return `https://${shop}/cart/${path}`;
}

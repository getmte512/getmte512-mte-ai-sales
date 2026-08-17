export type ShopifySnapshotVerificationInput={
  orderCount:number;
  productCount:number;
  latestOrderSync:string|null;
  latestProductSync:string|null;
  failedRuns:number;
  now:string;
};

function ageInHours(timestamp:string|null,now:string){
  if(!timestamp)return null;
  const age=(new Date(now).getTime()-new Date(timestamp).getTime())/3600000;
  return Number.isFinite(age)?Math.max(0,Math.round(age)):null;
}

export function verifyShopifySnapshots(input:ShopifySnapshotVerificationInput){
  const orderAgeHours=ageInHours(input.latestOrderSync,input.now);
  const productAgeHours=ageInHours(input.latestProductSync,input.now);
  const empty=input.orderCount===0&&input.productCount===0;
  const stale=[orderAgeHours,productAgeHours].some(age=>age!==null&&age>48);
  const status=input.failedRuns>0?"attention":empty?"awaiting_first_sync":stale?"stale":"verified";
  return{status,orderAgeHours,productAgeHours,orderCount:input.orderCount,productCount:input.productCount,failedRuns:input.failedRuns};
}

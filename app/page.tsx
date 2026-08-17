import{ContactImporter}from"@/components/contact-importer";import{redirect}from"next/navigation";import{requireSales}from"@/lib/authorization";import{signOut}from"./actions";

export default async function Home(){
  let access:Awaited<ReturnType<typeof requireSales>>;
  try{access=await requireSales();}catch(error){
    if(error instanceof Error&&error.message==="UNAUTHORIZED")redirect("/login");
    return <main className="login-shell"><div className="panel login-card"><span className="eyebrow dark">MORE THAN ENERGY</span><h1>Access awaiting assignment</h1><p>Your sign-in works, but an administrator must assign you a sales or administrator role before you can open the CRM.</p><div className="alert error">Contact the MTE administrator to request access.</div><form action={signOut}><button className="secondary account-button">Sign out and use another account</button></form></div></main>;
  }
  return <main><header className="topbar"><div><span className="eyebrow">MORE THAN ENERGY</span><h1>Retail Contact CRM</h1></div><div className="account-controls"><span className="scope-pill">{access.role} access</span><form action={signOut}><button className="sign-out-button">Sign out</button></form></div></header><ContactImporter role={access.role}/></main>;
}

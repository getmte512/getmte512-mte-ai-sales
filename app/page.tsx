import Link from"next/link";import{ContactImporter}from"@/components/contact-importer";import{redirect}from"next/navigation";import{requireRetailer,requireSales}from"@/lib/authorization";import{signOut}from"./actions";

function AwaitingAccess(){return <main className="login-shell"><div className="panel login-card"><span className="eyebrow dark">MORE THAN ENERGY</span><h1>Access awaiting assignment</h1><p>Your sign-in works, but an administrator must assign and approve your account before you can continue.</p><div className="alert error">Contact the MTE administrator to request access.</div><form action={signOut}><button className="secondary account-button">Sign out and use another account</button></form></div></main>}
export default async function Home(){
  let access:Awaited<ReturnType<typeof requireSales>>;
  try{access=await requireSales();}catch(error){
    if(error instanceof Error&&error.message==="UNAUTHORIZED")redirect("/login");
    if(error instanceof Error&&error.message==="FORBIDDEN"){
      try{await requireRetailer();}catch{return <AwaitingAccess/>}
      redirect("/portal");
    }
    return <AwaitingAccess/>;
  }
  const role: "admin"|"sales"=access.role==="admin"?"admin":"sales";
  return <main><header className="topbar"><div><span className="eyebrow">MORE THAN ENERGY</span><h1>Retail Contact CRM</h1></div><div className="account-controls"><span className="scope-pill">{role} access</span>{role==="admin"&&<Link className="sign-out-button" href="/launch">Launch Checklist</Link>}<form action={signOut}><button className="sign-out-button">Sign out</button></form></div></header><ContactImporter role={role}/></main>;
}

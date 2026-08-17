import{NextResponse}from"next/server";import{requireAdmin}from"@/lib/authorization";import{createAdminClient}from"@/lib/supabase/admin";import{getShopifyReadiness}from"@/lib/shopify-config";import{getLaunchVerificationEvidence,summarizeLaunchReadiness,type LaunchGate}from"@/lib/launch-readiness";import{getDeploymentReadiness}from"@/lib/deployment-readiness";

export async function GET(){try{
  await requireAdmin();const supabase=createAdminClient();
  const tables=["contacts","outreach_drafts","sales_pipeline","shopify_sync_runs","shopify_orders","shopify_products","shopify_reconciliation_decisions","reorder_requests","audit_events","pilot_accounts","app_user_roles"];
  const results=await Promise.all(tables.map(table=>supabase.from(table).select(table==="app_user_roles"?"user_id":"id",{head:true,count:"exact"})));
  const databaseReady=results.every(result=>!result.error);const pilotCount=results[tables.indexOf("pilot_accounts")].count??0;
  const[{count:failedSyncs,error:syncError},{count:adminCount,error:roleError}]=await Promise.all([supabase.from("shopify_sync_runs").select("id",{head:true,count:"exact"}).eq("status","failed"),supabase.from("app_user_roles").select("user_id",{head:true,count:"exact"}).eq("role","admin")]);
  const shopify=getShopifyReadiness(process.env);const deployment=getDeploymentReadiness(process.env);const verification=getLaunchVerificationEvidence(process.env);
  const auditReady=!results[tables.indexOf("audit_events")].error;
  const gates:LaunchGate[]=[
    {name:"Core database",passed:databaseReady,required:true,detail:databaseReady?"All required tables respond.":"One or more required tables are unavailable."},
    {name:"Assigned administrator",passed:!roleError&&(adminCount??0)>0,required:true,detail:!roleError&&(adminCount??0)>0?`${adminCount} administrator account is assigned.`:"Assign at least one administrator account."},
    {name:"Production application URL",passed:deployment.appUrlReady,required:true,detail:deployment.detail},
    {name:"Supabase server configuration",passed:deployment.supabaseReady,required:true,detail:deployment.supabaseReady?"Required browser and server settings are present.":"Complete the required Supabase environment settings."},
    {name:"Invitation completion",passed:Boolean(verification.invitationVerifiedAt),required:true,detail:verification.invitationVerifiedAt?`Invitation round-trip verified ${verification.invitationVerifiedAt}.`:"Complete a real invitation/account-setup round-trip, then set LAUNCH_INVITATION_VERIFIED_AT to its verification time."},
    {name:"Approval safeguards",passed:auditReady&&Boolean(verification.approvalFlowVerifiedAt),required:true,detail:auditReady&&verification.approvalFlowVerifiedAt?`Approval flows and audit persistence verified ${verification.approvalFlowVerifiedAt}.`:"Verify outreach, Shopify reconciliation, and reorder approval flows with audit persistence, then set LAUNCH_APPROVAL_FLOW_VERIFIED_AT."},
    {name:"Security headers",passed:deployment.securityHeadersReady,required:true,detail:deployment.securityHeadersReady?"Required browser security headers are configured by Next.js.":"Required browser security-header configuration is incomplete."},
    {name:"Audit trail",passed:auditReady,required:true,detail:auditReady?"Audit-event storage responds.":"Audit-event storage is unavailable."},
    {name:"Backup and recovery",passed:databaseReady&&Boolean(verification.backupRestoreVerifiedAt),required:true,detail:databaseReady&&verification.backupRestoreVerifiedAt?`Backup export/validation recovery drill verified ${verification.backupRestoreVerifiedAt}.`:"Run a real backup export and validation/recovery drill, then set LAUNCH_BACKUP_RESTORE_VERIFIED_AT."},
    {name:"Operational monitoring",passed:!syncError&&(failedSyncs??0)===0,required:true,detail:syncError?"Unable to inspect Shopify sync failures.":(failedSyncs??0)===0?"No failed sync runs.":`${failedSyncs} failed sync runs require attention.`},
    {name:"Controlled pilot",passed:pilotCount>0,required:false,detail:pilotCount>0?`${pilotCount} pilot accounts selected.`:"Select at least one pilot account."},
    {name:"Shopify connection",passed:shopify.configured,required:false,detail:shopify.configured?"Server-only connection settings are present.":"Shopify connection settings remain incomplete."}
  ];
  return NextResponse.json({gates,summary:summarizeLaunchReadiness(gates),checkedAt:new Date().toISOString()});
}catch(error){const message=error instanceof Error?error.message:"Unable to assess launch readiness.";return NextResponse.json({error:message==="UNAUTHORIZED"?"Sign in is required.":message==="FORBIDDEN"?"Administrator access is required.":message},{status:message==="UNAUTHORIZED"?401:message==="FORBIDDEN"?403:500});}}

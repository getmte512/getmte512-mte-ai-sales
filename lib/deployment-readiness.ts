export type DeploymentReadiness={appUrlReady:boolean;supabaseReady:boolean;detail:string};
export function getDeploymentReadiness(env:Record<string,string|undefined>):DeploymentReadiness{
  let appUrlReady=false;
  try{const url=new URL(env.NEXT_PUBLIC_APP_URL??"");appUrlReady=url.protocol==="https:"&&url.hostname!=="localhost";}catch{}
  const supabaseReady=Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()&&env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()&&env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return{appUrlReady,supabaseReady,detail:appUrlReady?"Production HTTPS URL is configured for sign-in and invitation callbacks.":"Set NEXT_PUBLIC_APP_URL to the final HTTPS application address before publishing."};
}

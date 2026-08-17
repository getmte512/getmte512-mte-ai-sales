export type DeploymentReadiness={appUrlReady:boolean;supabaseReady:boolean;securityHeadersReady:boolean;detail:string};
export const requiredSecurityHeaders=["X-Content-Type-Options","X-Frame-Options","Referrer-Policy","Permissions-Policy","Cross-Origin-Opener-Policy"] as const;
export function hasRequiredSecurityHeaders(headers:readonly string[]){const configured=new Set(headers.map(header=>header.toLowerCase()));return requiredSecurityHeaders.every(header=>configured.has(header.toLowerCase()));}
export function getDeploymentReadiness(env:Record<string,string|undefined>):DeploymentReadiness{
  let appUrlReady=false;
  try{const url=new URL(env.NEXT_PUBLIC_APP_URL??"");appUrlReady=url.protocol==="https:"&&url.hostname!=="localhost";}catch{}
  const supabaseReady=Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()&&env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()&&env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const securityHeadersReady=hasRequiredSecurityHeaders(requiredSecurityHeaders);
  return{appUrlReady,supabaseReady,securityHeadersReady,detail:appUrlReady?"Production HTTPS URL is configured for sign-in and invitation callbacks.":"Set NEXT_PUBLIC_APP_URL to the final HTTPS application address before publishing."};
}

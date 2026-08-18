import{existsSync,readFileSync}from"node:fs";

function loadLocalEnvironment(){if(!existsSync(".env.local"))return{};return Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith("#")&&line.includes("=")).map(line=>{const index=line.indexOf("=");return[line.slice(0,index).trim(),line.slice(index+1).trim().replace(/^['"]|['"]$/g,"")]}));}
const env={...loadLocalEnvironment(),...process.env};const production=process.argv.includes("--production");const checks=[];
function check(name,passed,detail){checks.push({name,passed,detail});}
let appUrl;try{appUrl=new URL(env.NEXT_PUBLIC_APP_URL||(production?"":"http://localhost:3001"));}catch{}
check("Application URL",Boolean(appUrl&&(production?appUrl.protocol==="https:"&&appUrl.hostname!=="localhost":appUrl.protocol==="https:"||appUrl.hostname==="localhost")),production?"Final HTTPS address is required.":"HTTPS or localhost is required.");
let supabaseUrl;try{supabaseUrl=new URL(env.NEXT_PUBLIC_SUPABASE_URL??"");}catch{}
check("Supabase URL",Boolean(supabaseUrl?.protocol==="https:"),"Public project URL must use HTTPS.");
check("Supabase browser key",Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),"Public anonymous key must be configured.");
check("Supabase server key",Boolean(env.SUPABASE_SERVICE_ROLE_KEY),"Server-only service role key must be configured.");
check("Secret separation",Boolean(env.SUPABASE_SERVICE_ROLE_KEY&&env.SUPABASE_SERVICE_ROLE_KEY!==env.NEXT_PUBLIC_SUPABASE_ANON_KEY),"Browser and server keys must remain distinct.");
const resendKey=Boolean(env.RESEND_API_KEY);const outreachFrom=Boolean(env.OUTREACH_FROM_EMAIL);check("Outbound email pairing",resendKey===outreachFrom,"Resend key and verified From address must be configured together or both omitted.");if(outreachFrom)check("Outbound From address",/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.OUTREACH_FROM_EMAIL),"Provider From address must be an email address.");
const shop=Boolean(env.SHOPIFY_SHOP_DOMAIN);const shopToken=Boolean(env.SHOPIFY_ADMIN_ACCESS_TOKEN);check("Shopify pairing",shop===shopToken,"Shop domain and server-only token must be configured together or both omitted.");
for(const item of checks)console.log(`${item.passed?"PASS":"FAIL"}  ${item.name} — ${item.detail}`);
const failed=checks.filter(item=>!item.passed);console.log(`\n${checks.length-failed.length}/${checks.length} deployment checks passed. No credential values were printed.`);if(failed.length)process.exitCode=1;

const rawUrl=String(process.env.MTE_PRODUCTION_URL??process.env.NEXT_PUBLIC_APP_URL??"").trim();
const cookie=String(process.env.MTE_PRODUCTION_COOKIE??"").trim();
function fail(message,code=2){console.error(`Production closure: ${message}`);process.exit(code)}
let baseUrl;
try{baseUrl=new URL(rawUrl)}catch{fail("MTE_PRODUCTION_URL or NEXT_PUBLIC_APP_URL must be a valid production HTTPS URL.")}
if(baseUrl.protocol!=="https:"||baseUrl.hostname==="localhost"||baseUrl.hostname==="127.0.0.1")fail("Production closure requires a non-local HTTPS application URL.");
if(!cookie)fail("MTE_PRODUCTION_COOKIE is required. Supply an authenticated admin session cookie; the runner never persists or prints it.");
const endpoints=[
  {name:"systemHealth",path:"/api/health"},
  {name:"smoke",path:"/api/smoke-test"},
  {name:"launchReadiness",path:"/api/launch-readiness"}
];
async function readJson(endpoint){
  const response=await fetch(new URL(endpoint.path,baseUrl),{method:"GET",headers:{accept:"application/json",cookie},redirect:"manual",cache:"no-store"});
  if(response.status>=300&&response.status<400)throw new Error(`${endpoint.path} redirected instead of returning authenticated JSON.`);
  const text=await response.text();
  let body;
  try{body=JSON.parse(text)}catch{throw new Error(`${endpoint.path} returned non-JSON content with HTTP ${response.status}.`)}
  if(!response.ok)throw new Error(`${endpoint.path} returned HTTP ${response.status}: ${body?.error??"request failed"}`);
  return body;
}
let payloads;
try{payloads=Object.fromEntries(await Promise.all(endpoints.map(async endpoint=>[endpoint.name,await readJson(endpoint)])))}catch(error){fail(error instanceof Error?error.message:"Unable to read production closure endpoints.",1)}
const healthChecks=Array.isArray(payloads.systemHealth?.checks)?payloads.systemHealth.checks:[];
const healthBlocked=healthChecks.filter(check=>check?.status==="blocked");
const smokeSummary=payloads.smoke?.summary??{};
const smokeReady=smokeSummary.status==="ready"&&Number(smokeSummary.failed??1)===0;
const gates=Array.isArray(payloads.launchReadiness?.gates)?payloads.launchReadiness.gates:[];
const requiredBlocked=gates.filter(gate=>gate?.required===true&&gate?.passed!==true);
const optionalPending=gates.filter(gate=>gate?.required===false&&gate?.passed!==true);
const result={
  checkedAt:new Date().toISOString(),
  applicationUrl:baseUrl.origin,
  readOnly:true,
  productionReady:healthBlocked.length===0&&smokeReady&&requiredBlocked.length===0,
  systemHealth:{blocked:healthBlocked.map(check=>({name:check.name,detail:check.detail})),summary:payloads.systemHealth?.summary??null},
  smoke:{ready:smokeReady,summary:smokeSummary,blocked:(Array.isArray(payloads.smoke?.checks)?payloads.smoke.checks:[]).filter(check=>check?.passed!==true).map(check=>({name:check.name,detail:check.detail}))},
  launchReadiness:{decision:payloads.launchReadiness?.summary?.decision??null,requiredBlocked:requiredBlocked.map(gate=>({name:gate.name,detail:gate.detail})),optionalPending:optionalPending.map(gate=>({name:gate.name,detail:gate.detail})),verification:payloads.launchReadiness?.verification??null}
};
console.log(JSON.stringify(result,null,2));
if(!result.productionReady)process.exitCode=1;

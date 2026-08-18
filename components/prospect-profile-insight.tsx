import{buildProspectProfileInsight}from"@/lib/prospect-profile-insights";
type Props={profile:{accepted_count:number;rejected_count:number;review_reason_counts?:Record<string,number>}};
export function ProspectProfileInsight({profile}:Props){const reviewed=profile.accepted_count+profile.rejected_count;const insight=buildProspectProfileInsight(profile.review_reason_counts??{},reviewed);return <p><strong>Profile insight:</strong> {insight.message}</p>}

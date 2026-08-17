export function draftStatusAuditAction(status:"draft"|"awaiting_approval"|"approved"|"rejected"|"sent"){
  return{
    draft:"outreach_draft_saved",
    awaiting_approval:"outreach_draft_submitted",
    approved:"outreach_draft_approved",
    rejected:"outreach_draft_revision_requested",
    sent:"outreach_draft_marked_sent"
  }[status];
}

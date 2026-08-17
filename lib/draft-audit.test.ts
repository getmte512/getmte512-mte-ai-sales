import{describe,expect,it}from"vitest";
import{draftStatusAuditAction}from"./draft-audit";

describe("draft audit actions",()=>{
  it("labels approvals",()=>expect(draftStatusAuditAction("approved")).toBe("outreach_draft_approved"));
  it("labels revision requests",()=>expect(draftStatusAuditAction("rejected")).toBe("outreach_draft_revision_requested"));
  it("labels confirmed sends",()=>expect(draftStatusAuditAction("sent")).toBe("outreach_draft_marked_sent"));
  it("labels approval-queue submissions",()=>expect(draftStatusAuditAction("awaiting_approval")).toBe("outreach_draft_submitted"));
});

export type OutreachDraftInput = { buyerName: string; companyName: string; category?: string | null; channel?: "email" | "linkedin" };
export type OutreachDraft = { subject: string; body: string };
export function createOutreachDraft(input: OutreachDraftInput): OutreachDraft {
  const firstName = input.buyerName.split(/[\s/]+/).find(Boolean) ?? input.buyerName;
  const context = input.category ? ` your work in ${input.category.toLowerCase()}` : ` what ${input.companyName} offers its customers`;
  if (input.channel === "linkedin") return { subject: "LinkedIn message", body: `Hi ${firstName} — I’m with More Than Energy. Based on${context}, I thought our clean-energy products could be a strong fit for your customers. Would you be open to a quick look at the line?` };
  return { subject: `More Than Energy for ${input.companyName}`, body: `Hi ${firstName},\n\nI’m reaching out from More Than Energy. Based on${context}, I thought our clean-energy products could be a strong fit for your customers.\n\nWould you be open to taking a quick look at the line? I’d be happy to send product details and discuss a small sample set for ${input.companyName}.\n\nBest,\nScott\nMore Than Energy` };
}

import { describe, expect, it } from "vitest";
import { suggestMapping } from "./mapping";
import { reviewRows } from "./review";

const headers = ["Store Name", "Contact Name", "Email Address", "Status", "Opened", "Clicked", "Unsubscribed", "Reported as spam"];
const mapping = suggestMapping(headers);

describe("retail contact review", () => {
  it("maps the MTE export headers", () => {
    expect(mapping["Store Name"]).toBe("company");
    expect(mapping["Contact Name"]).toBe("buyerName");
    expect(mapping["Email Address"]).toBe("email");
  });

  it("cleans and flags incomplete contacts", () => {
    const result = reviewRows([{ "Store Name": "  The   Shop ", "Contact Name": "", "Email Address": " BUYER@EXAMPLE.COM ", Status: "Delivered", Opened: "Opened", Clicked: "Not Clicked", Unsubscribed: "", "Reported as spam": "" }], mapping, headers);
    expect(result.contacts[0].company).toBe("The Shop");
    expect(result.contacts[0].email).toBe("buyer@example.com");
    expect(result.contacts[0].status).toBe("warning");
    expect(result.contacts[0].opened).toBe(true);
  });

  it("blocks a row with no company", () => {
    const result = reviewRows([{ "Store Name": "", "Contact Name": "Buyer", "Email Address": "buyer@example.com", Status: "Delivered", Opened: "", Clicked: "", Unsubscribed: "", "Reported as spam": "" }], mapping, headers);
    expect(result.contacts[0].status).toBe("invalid");
  });

  it("detects duplicate emails inside one file", () => {
    const rows = [1, 2].map((n) => ({ "Store Name": `Store ${n}`, "Contact Name": `Buyer ${n}`, "Email Address": "same@example.com", Status: "Delivered", Opened: "", Clicked: "", Unsubscribed: "", "Reported as spam": "" }));
    const result = reviewRows(rows, mapping, headers);
    expect(result.summary.duplicates).toBe(1);
    expect(result.contacts[1].duplicateOfRow).toBe(2);
  });

  it("suppresses unsubscribe, complaint, hard bounce, and suppressed records", () => {
    const cases = [
      { status: "Delivered", unsubscribed: "Yes", spam: "", reason: "unsubscribed" },
      { status: "Spam", unsubscribed: "", spam: "", reason: "spam_complaint" },
      { status: "Hard Bounced", unsubscribed: "", spam: "", reason: "hard_bounce" },
      { status: "Suppressed", unsubscribed: "", spam: "", reason: "previously_suppressed" },
    ];
    for (const item of cases) {
      const result = reviewRows([{ "Store Name": "Store", "Contact Name": "Buyer", "Email Address": `${item.reason}@example.com`, Status: item.status, Opened: "", Clicked: "", Unsubscribed: item.unsubscribed, "Reported as spam": item.spam }], mapping, headers);
      expect(result.contacts[0].suppressionReason).toBe(item.reason);
    }
  });
});

import fs from "node:fs";
import assert from "node:assert/strict";
import { suggestMapping } from "../lib/contact-import/mapping.ts";
import { reviewRows } from "../lib/contact-import/review.ts";

function parseCsv(text) {
  const records = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); records.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); records.push(row); }
  const [headers, ...values] = records.filter((record) => record.some(Boolean));
  return { headers, rows: values.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]))) };
}

const input = process.argv[2];
if (!input) throw new Error("Pass the path to an MTE CSV file.");
const { headers, rows } = parseCsv(fs.readFileSync(input, "utf8").replace(/^\uFEFF/, ""));
const pilot = rows.slice(0, 20);
const preview = reviewRows(pilot, suggestMapping(headers), headers);

assert.equal(pilot.length, Math.min(20, rows.length));
assert.equal(preview.summary.total, pilot.length);
assert.equal(preview.headers.length, headers.length);
assert.equal(preview.mapping["Store Name"], "company");
assert.equal(preview.mapping["Contact Name"], "buyerName");
assert.equal(preview.mapping["Email Address"], "email");
assert.equal(preview.summary.total, preview.summary.valid + preview.summary.warnings + preview.summary.invalid + preview.summary.duplicates);
assert.ok(preview.contacts.every((contact) => contact.sourceRow >= 2));

const syntheticHeaders = ["Store Name", "Contact Name", "Email Address", "Status", "Opened", "Clicked", "Unsubscribed", "Reported as spam"];
const syntheticMapping = suggestMapping(syntheticHeaders);
const synthetic = reviewRows([
  { "Store Name": "Test Store", "Contact Name": "Buyer One", "Email Address": " SAME@EXAMPLE.COM ", Status: "Delivered", Opened: "Opened", Clicked: "", Unsubscribed: "", "Reported as spam": "" },
  { "Store Name": "Second Store", "Contact Name": "Buyer Two", "Email Address": "same@example.com", Status: "Delivered", Opened: "", Clicked: "", Unsubscribed: "", "Reported as spam": "" },
  { "Store Name": "Unsubscribed Store", "Contact Name": "Buyer Three", "Email Address": "unsubscribe@example.com", Status: "Delivered", Opened: "", Clicked: "", Unsubscribed: "Yes", "Reported as spam": "" },
  { "Store Name": "Complaint Store", "Contact Name": "Buyer Four", "Email Address": "complaint@example.com", Status: "Spam", Opened: "", Clicked: "", Unsubscribed: "", "Reported as spam": "Yes" },
  { "Store Name": "", "Contact Name": "Buyer Five", "Email Address": "invalid@example.com", Status: "Delivered", Opened: "", Clicked: "", Unsubscribed: "", "Reported as spam": "" },
], syntheticMapping, syntheticHeaders);
assert.equal(synthetic.summary.duplicates, 1);
assert.equal(synthetic.contacts[0].email, "same@example.com");
assert.equal(synthetic.contacts[2].suppressionReason, "unsubscribed");
assert.equal(synthetic.contacts[3].suppressionReason, "spam_complaint");
assert.equal(synthetic.contacts[4].status, "invalid");

console.log(JSON.stringify({
  sourceRows: rows.length,
  pilotRows: pilot.length,
  summary: preview.summary,
  mappedColumns: preview.mapping,
  syntheticChecks: "passed",
}, null, 2));

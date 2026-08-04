# Development Plan

## Phase 1 — Foundation

### Goal

Create the technical foundation for the MTE AI Sales Platform.

### Tasks

- Initialize Next.js with TypeScript
- Add Tailwind CSS
- Connect Supabase
- Configure PostgreSQL
- Add secure environment variables
- Create authentication
- Create a private admin dashboard
- Add basic application navigation

### Completion Criteria

- The application runs locally
- A user can sign in securely
- The dashboard is protected
- The database connection works
- No credentials are stored in the repository

---

## Phase 2 — Core CRM

### Goal

Create a lightweight CRM for retailers, buyers, prospects, follow-ups, and samples.

### Tasks

- Build the retailers page
- Build the buyers page
- Build the prospect detail page
- Add prospect status tracking
- Add notes and activity history
- Add follow-up dates
- Add sample tracking
- Add duplicate detection

### Completion Criteria

- Users can create, edit, and view retailers
- Users can create, edit, and view buyers
- Buyers can be connected to retailers
- Follow-ups can be scheduled
- Samples can be tracked from request through delivery
- Duplicate records are flagged

---

## Phase 3 — CSV Import

### Goal

Allow MTE to import retail buyer lists safely.

### Tasks

- Create CSV upload screen
- Add column mapping
- Add preview before import
- Validate required fields
- Detect duplicates
- Show import errors
- Create import history

### Completion Criteria

- A CSV can be uploaded successfully
- Users can map columns before importing
- Duplicate contacts are identified
- Invalid rows are clearly reported
- Imported contacts appear in the CRM

---

## Phase 4 — AI Research and Scoring

### Goal

Help MTE understand and prioritize each retail opportunity.

### Tasks

- Build the Retail Research Agent
- Build the Buyer Persona Agent
- Build the Prospect Scoring Agent
- Store research results in the CRM
- Show score explanations
- Allow users to rerun research

### Completion Criteria

- Each retailer can receive an AI research summary
- Each buyer can receive a buyer persona
- Each prospect receives a score from 0 to 100
- Scores include clear reasons
- AI results can be reviewed before saving

---

## Phase 5 — Outreach and Approval

### Goal

Generate personalized outreach while keeping MTE in full control.

### Tasks

- Build the Outreach Agent
- Generate email drafts
- Generate text message drafts
- Generate LinkedIn message drafts
- Create an approval queue
- Allow editing, approval, and rejection
- Record sent messages
- Schedule the next follow-up

### Approval Workflow

Drafted → Awaiting Approval → Approved → Sent → Follow-up Scheduled

### Completion Criteria

- AI can create personalized drafts
- No message sends automatically
- Users can edit drafts
- Users can approve or reject drafts
- Sent activity is recorded in the CRM

---

## Phase 6 — Follow-Ups and Samples

### Goal

Prevent opportunities from going cold.

### Tasks

- Build the Follow-Up Agent
- Build the Sample Agent
- Recommend follow-up timing
- Recommend communication method
- Track sample requests
- Track shipping information
- Track delivery status
- Track sample-to-sale conversion

### Completion Criteria

- Follow-ups appear in a daily queue
- Overdue follow-ups are clearly flagged
- Sample status is visible
- Delivered samples trigger a recommended follow-up
- Sample conversion can be measured

---

## Phase 7 — Sales Reporting

### Goal

Give MTE clear visibility into sales activity and account performance.

### Tasks

- Build the Sales Reporting Agent
- Import or enter sales data
- Report sales by retailer
- Report sales by product and flavor
- Track reorders
- Track new accounts
- Track pipeline value
- Track outreach response rates
- Track sample conversion
- Generate weekly and monthly summaries

### Completion Criteria

- Reports can be filtered by date
- Sales and reorder activity are visible
- Pipeline performance is measurable
- Weekly and monthly executive summaries can be generated
- Accounts needing attention are flagged

---

## Phase 8 — Sales Strategy

### Goal

Turn CRM data into a prioritized daily sales plan.

### Tasks

- Build the Sales Strategy Agent
- Rank highest-value opportunities
- Identify stalled accounts
- Recommend daily outreach
- Recommend sample follow-ups
- Identify reorder opportunities
- Highlight account risks

### Completion Criteria

- The dashboard shows daily priorities
- Recommendations explain why each account matters
- Users can mark recommendations complete
- Completed actions update CRM activity

---

## Phase 9 — Pilot Testing

### Goal

Validate the platform using 10–20 real MTE contacts.

### Test Areas

- CSV import
- Duplicate detection
- Retail research quality
- Buyer persona quality
- Prospect scoring
- Email and text drafts
- Approval workflow
- Follow-up recommendations
- Sample tracking
- Sales reporting

### Completion Criteria

- Critical bugs are resolved
- Imported data is accurate
- AI outputs are useful and editable
- No messages send without approval
- Scott can complete the daily sales workflow inside the platform

---

## Phase 10 — Production Launch

### Goal

Prepare the platform for regular use by MTE.

### Tasks

- Security review
- Permission review
- Database backup plan
- Error monitoring
- Performance testing
- Production deployment
- User documentation
- Launch checklist

### Completion Criteria

- The application is deployed securely
- Production data is backed up
- Errors are monitored
- Access is restricted to approved users
- The system is ready for full contact import

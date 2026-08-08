# Zoho People — Reference UI Spec (from `Pictures\Screenshots\new3`)

Extracted from ~300 screenshots of a live Zoho People tenant (`nygrowdigitalpvtltd`), to guide matching hrms-app's theme, layout, and form fields when we build out more modules. Skipping **Travel, Marketplace, Developer Space** for now per team lead — documented here anyway for later reference, since they were in the folder.

---

## Global UI patterns (apply everywhere)

- **App shell**: left icon sidebar (Home, Onboarding, Leave Tracker, Attendance, Time Tracker, Performance, More, Operations, Reports). Top bar: back-arrow + module name + horizontal sub-tabs, then far right: `+` (quick add), search, bell (notifications), gear (settings), avatar.
- **List screen toolbar** (near-universal): saved "View" selector dropdown + Edit link → "All Data" scope filter → primary **Add X** button (blue) → expand icon → filter icon (opens right-side slide-out panel) → `...` overflow menu (Import / Export / History Export / Bulk File Upload / Export Access Log, varies by list).
- **Filter drawer**: right-side panel titled "Filter", field-specific dropdowns/date ranges, **Apply** / **Reset** buttons at bottom. Active filters shown as removable chips above the list with a "Reset" link.
- **Empty states**: consistent illustration + bold one-line message + short helper description + primary CTA button. Used on every single empty list/tab — worth a shared `<EmptyState icon title description ctaLabel />` component.
- **Add/Edit modals**: large right-docked panel, title bar + X close, sectioned content with subheadings, scrollable body, sticky footer. Footer button pattern varies by form weight:
  - Simple settings/lookup forms: **Save / Cancel**
  - Transactional "Add Record" forms: **Submit / Submit and New / Save Draft / Cancel**
- **Required fields**: red asterisk. **Dropdowns**: "Select" placeholder, often with an inline "+" to add a new option on the fly without leaving the form. **Dates**: `dd-MMM-yyyy` format with calendar icon; date-times add `hh:mm AM/PM`.
- **"Rule builder" row** (used for shift eligibility, assign-shift criteria, holiday applicability): `[field-type dropdown] "is" [value select] [delete icon]`, sometimes with "Add Criteria" + "OR" connector.
- **Employee search screens** ("User-specific Operations", appears once per module: Attendance, Shift, Time Tracker, Leave Tracker, Compensation, Employee Information): single search box + "Please begin typing to search for an employee" empty-state illustration.
- **Weekly grid views** (Employee Shift Mapping, Job Schedule): Employee name column × Sun–Sat date columns, weekend cells visually tinted, Weekly/Daily toggle, date-range nav with calendar icon.
- **Column customization** ("Edit View" modal): two-pane drag/drop list picker (available fields ↔ selected/ordered columns) with `>> > < <<` transfer buttons — separate from the criteria-based filter drawer.
- **Read-only "View Record" panels** mirror the Add form's field grouping/order exactly, showing `-` for empty values.
- **Repeatable row groups** (Education, Experience, Expense line items): "Add Row" button, per-row delete icon.
- **File upload**: always 3 source options — Desktop / Zoho WorkDrive (cloud) / Others — plus file-type and size-limit helper text.
- **Sensitive-data step-up gate** (used for Compensation/salary): "Verify your Identity" modal with lock icon before showing the page, no cancel option.
- **Multi-step wizards** (Add Candidate is single-modal; Offboarding/Performance "Getting Started" setup, FTP Connection, Timesheet creation): numbered step indicator at top, Next/Back navigation, final step swaps to Save/Submit.

---

## Module index

1. [My Space](#1-my-space) — personal hub (Overview tabs, Dashboard widgets, Calendar, Delegation)
2. [Team](#2-team) — Projects, Approvals
3. [Organization](#3-organization) — Overview/Services, Announcements, Policies
4. [Onboarding](#4-onboarding) — Candidates
5. [Operations hub](#5-operations-hub) — module launcher grid
6. [Attendance](#6-attendance)
7. [Shift](#7-shift)
8. [Time Tracker](#8-time-tracker)
9. [Leave Tracker](#9-leave-tracker)
10. [Files](#10-files)
11. [Employee Information](#11-employee-information) — **includes Departments/Designations** (relevant to our Settings page)
12. [Performance](#12-performance)
13. [Travel](#13-travel-skipped-for-now)
14. [Employee Engagement](#14-employee-engagement)
15. [Compensation](#15-compensation)
16. [HR Letters](#16-hr-letters)
17. [Offboarding](#17-offboarding)
18. [Tasks](#18-tasks)
19. [General](#19-general)
20. [OKR + OKR Settings](#20-okr--okr-settings)
21. [Data Administration](#21-data-administration)
22. [Reports](#22-reports)
23. [Marketplace (skipped for now)](#23-marketplace-skipped-for-now)
24. [Developer Space (skipped for now)](#24-developer-space-skipped-for-now)
25. [Zia (AI Assistant)](#25-zia-ai-assistant)

---

## 1. My Space

Persistent widget on every My Space page: employee mini-card (avatar, ID+name, check-in state, live HH:MM:SS worked-time counter, **Check-out** button).

### Overview (tabbed employee detail panel)
Tab strip: Activities, Feeds, Profile, Approvals, Leave, Attendance, Time Logs, Timesheets, Jobs, Files, Career History, Goals, Feedback, Related Data — plus a **Customize Tabs** slide-over (toggle switches per tab, draggable reorder, "Activities" locked).

- **Activities**: greeting card, announcement card, "Work Schedule" 7-day strip (shift/hours per day).
- **Feeds**: social composer ("Type @ to mention"), filter chips (All/Status/Announcement/Approvals/Mail Alerts/Holidays).
- **Profile**: Shift, Time zone, Email info cards; "About Me" (empty: pencil + "Write a short introduction"); "Tags" (empty: + "Add Tags").
- **Approvals**: empty state "All set! No requests pending approval".
- **Leave**: gated — "You can't view leave information... as Date of Joining is not yet updated."
- **Attendance**: "This Week" table, one row per weekday: shift+hours, check-in/out summary, weekend rows highlighted.
- **Time Logs**: Select Project / Select Job (dropdowns), "What are you working on?" (text), Billable/Non-billable, running-timer button.
- **Timesheets**: empty state "No timesheets added for current month".
- **Jobs** — list + View modal + Edit modal:
  - List row: Job Name+Project, Estimated/Logged Hours, Status badge.
  - Fields: Job Name*, Project Name (dropdown+add), Start/End Date, Hours, Assignees* (per-user hrs + RPH + delete), Rate Per Hour, Description, Attachment, Reminder, Billable Status, work item.
- **Files**: empty state "Personal uploads and files shared with you will be displayed here".
- **Career History**: gated same as Leave (needs Date of Joining).
- **Goals**: sub-tabs This week/All, empty "No active Goals available".
- **Feedback**: empty "No Feedback given yet".
- **Related Data**: accordion rows — Exit Details, Travel Expense, Travel Request (each with count + add + expand).
  - **Add Exit Details modal**: Separation (Employee ID*, Separation date*, Interviewer*, Reason for leaving+add); Questionnaire (Working here again+add, 3 textareas); Checklist (8 paired text fields e.g. "Company Vehicle handed in").
  - **Add Travel Expense modal**: Expense Details (Employee ID*, Travel ID*+add, readonly Place/Purpose); Expense grid (Description, Date, Ticket, Lodging, Boarding, Phone, Local conveyance, Incidentals, Others, Currency) — "Add Row".
  - **Add Travel Request modal**: Employee ID*, Employee Department+add, Expected departure date, Purpose of visit, Is billable+add, Place of visit, Expected arrival date, Expected duration (days), Customer name.

### Dashboard (customizable widget grid)
URL: `.../home/myspace/dashboard`. Sub-nav: Overview, Dashboard, Calendar, Delegation.
Widgets (each empty-state + drag handle): Birthday, New Hires, Favorites, Quick Links (+add), Announcements (+add), pay-period, Upcoming Holidays, My Pending Tasks (count badge), My Files (Org/Employee toggle), Work Anniversary, Wedding Anniversary, Employee Engagement (pending surveys count).

### Calendar
Monthly attendance/leave grid, prev/next month nav, today highlighted, weekend columns shaded, exception days show colored pill (e.g. red "Absent").

### Delegation
Empty state: "No delegations added currently" + explanation + **Add Delegation**.
**Setup Delegation modal**: Delegator* (prefilled self), Delegatee* (dropdown), Type (dropdown "Temporary") + date-range picker, Notification (radio: Delegator and Delegatee / Delegatee), Description (textarea).

---

## 2. Team

### Projects — Project Detail (tabs: Feeds | Project Performance | Jobs | Users | Attachments)
- Left info card: avatar/initial, name, status, "Assign Project Head", Cost, Users count, Description.
- **Feeds**: composer + empty "No Feeds Yet".
- **Project Performance**: stat cards — Estimated vs logged hours, Billable vs non-billable, In-Progress vs Completed (donut), Top 5 active Jobs, Overdue Jobs, Top/Least 5 contributors, User-Jobs status table, User estimated-vs-logged table, Weekly report.
- **Jobs**: table (checkbox, Job Name+project tag, Start/End Date, Est/Logged Hours w/ progress bar, Status, Users avatar-stack) + **Add Job modal** (same field set as My Space > Jobs above).
- **Users**: User|Department toggle. User rows: avatar, name, email, status, Role (dropdown User/Manager), Rate Per Hour, delete. Department sub-view empty: "Assign Departments" button.
- **Attachments**: empty "No attachments added. Click here to upload" + Upload button.

### Approvals
Filter chips (Status/Approver/Employee Status) + Reset. Empty: "no results that fit your criteria". Filter drawer: Approver, Record owner, Forms, Status, Employee Status dropdowns + Apply/Reset.

---

## 3. Organization

### Overview — Services tab
Org card (logo, name, country, Edit Cover Photo) + Quick Links (+add). Service tiles grid: Onboarding, Leave Tracker, Attendance, Time Tracker, Performance, Files, Employee Engagement, HR Letters, Travel, Tasks, Compensation, General, OKR.
**Add Quick Link modal**: Link Name*, Link URL*.

### Overview — Location tab
Empty state "No Location Found".

### Announcements
Tabs: Overview | Announcements | Policies | Employee Tree | Department Tree | Department Directory | Birthday Folks | New Hires | Calendar.
List card: avatar, title, poster+date, like/comment counts. Filter drawer: Category, Location, Status, Type(Pinned checkbox).
**New Announcement modal**: Title, rich-text Message body (full WYSIWYG toolbar), Attachments; Publish Settings — Categories (multi-select), Expiry (datetime), Locations (multi-select), Advanced Settings, Disable Comments (checkbox), Pin announcement (checkbox), Send email notifications (checkbox), Notify any others (emails).

### Policies
Empty state: "No shared files to display" + Manage button, list/grid toggle.

---

## 4. Onboarding

### Candidate — List View
Toolbar: saved view + "View All Data" scope (Reportees+My Data / Reportees' Data / Direct Reportees' Data / My Data), Add Candidate, expand, filter, `...` (Import/Export/History Export/Bulk File Upload/Export Access Log).
Columns: First/Last name, Email ID, Official Email, Onboarding Status, Department, Source of Hire, PAN/Aadhaar/UAN (masked).

**Add Candidate modal** (multi-section):
- Candidate Details: Email ID*, First name*, Phone* (+country code), Last name*, UAN, Official Email, Aadhaar, PAN, Photo (upload).
- Address Details: Present address (line1/2, City, Country, State, Postal Code); Permanent address (checkbox "Same as Present" + same fields).
- Professional Details: Experience, Location, Source of Hire, Title, Skill Set, Current Salary, Highest Qualification, Department, Additional information, Offer Letter (upload), Tentative Joining Date.
- Education (repeatable): School Name, Degree/Diploma, Field of Study, Date of Completion, Notes.
- Experience (repeatable): Occupation, Company, Summary, Duration, Currently Work Here.
- Buttons: Submit / Submit and New / Save Draft / Cancel.

**View Record** mirrors Add form as read-only label/value pairs, `-` for empty.
**Edit View modal**: view name + dual-list column picker (available ↔ selected, drag reorder, `>> > < <<`).

---

## 5. Operations hub
Module launcher: search bar "Search Operations" + tile grid (18 tiles): Onboarding, Attendance, Shift, Time Tracker, Leave Tracker, Files, Employee Information, Performance, Travel, Employee Engagement, Compensation, HR Letters, Offboarding, Tasks, General, OKR, Approvals, Data Administration.

---

## 6. Attendance

Sub-tabs: User-specific Operations | Regularization | On Duty | Biometric ID mapping | Check-in/out Import & Export.

- **Regularization** list: month nav, Status filter, Add Request, filter chip "User/Employee Profile", empty "No regularization requests have been raised currently".
  **Request Regularization modal**: Employee Name, Period (Day), Date, Attachment; table per day: Check-in*, Check-out* (datetime), Total Hours (auto), Description.
- **On Duty** list: same pattern. **Request On Duty modal**: Employee Name, Period (date range), Units (Days), Type (On Duty), Attachment; table: Duration* per day (e.g. Full Day), Session; Reason.
- **Biometric ID mapping**: empty "No user IDs mapped currently" + **Add User ID Mapping modal** (Employee Name, Mapper ID*).
- **Check-in/out Import & Export**: two panels — Import (file drop, xls/xlsx/csv, max 5MB) / Export (radio XLS/XLSX/CSV, "Include all check-in/check-out entries" checkbox).

Color legend used on Regularization/On Duty: Unpaid leave, Absent, Paid leave, On Duty, Weekend, Holidays.

---

## 7. Shift

Tabs: User-specific Operations | Manage Shifts | Employee Shift Mapping | Shift Group.

- **Manage Shifts** list: Shift name, Shift time (e.g. "09:00 AM - 06:00 PM").
  **Add Shift modal**: Shift name*, Color swatch, From*/To* (time), Shift Margin (checkbox), Core Working Hours (checkbox), Weekends based on (radio Location/Shift), Provide shift allowance (checkbox), Eligibility criteria (rule builder: Departments is [Select]).
- **Employee Shift Mapping**: weekly grid (Employee × Sun-Sat, shift+time per cell), Weekly/Daily toggle, **Assign shift modal** (Applicable to* rule builder, Shift name, From/To dates, Reason). Filter drawer: Period, From/To, Employee, "Show only direct reportees", Department, Shift(s).
- **Shift Group**: empty "No employees have been mapped to a shift group". **Assign Shift Groups modal**: Shift Group*, Employee*, Effective period From/To*.

---

## 8. Time Tracker

Tabs: User-specific Operations | Jobs | Projects | Timesheets | Job Schedule | Clients | Bills and Invoices | Employee Wage Rate | Time Logs Import & Export.

- **Jobs**: grouping Employee/Department toggle; table (Job Name+project, dates, Est/Logged Hours, Status, Users). Add Job modal — same as My Space/Team Jobs modal.
- **Projects**: table (Project Name, Est/Logged Hours, Status, Jobs count). **Add Project modal**: Project Name*, Client Name+add, Project Cost, Project Head (default self)+RPH, Project Manager, Project Users, Departments, Description.
- **Timesheets**: date nav + status filter, empty "No timesheets found... click Create Timesheet". **Create Timesheet modal**: Period, Employee, Clients/Projects/Jobs (multi-select "All..."), Billable Status → Next.
- **Job Schedule**: weekly grid, Day/Week toggle, Clone button ("0 pending changes", Published badge), clone-confirm dialog.
- **Clients** — **Add Client modal**: Client (Name*, Currency*, Billing Method); Contacts (Email, First/Last Name, Phone, Mobile, Fax); Details (Street Address, City, State, ZIP, Country, Industry, Company Size, Description).
- **Bills and Invoices**: empty "No bills have been generated currently". **Generate Bill modal**: Clients* (Select), Period, Employee, Projects, Jobs, Approval status → Next.
- **Employee Wage Rate**: **Add wage rate modal**: Employee name*, Rate per hour*, Overtime RPH, Extended overtime RPH.
- **Time Logs Import & Export**: Import panel (xls/xlsx/csv, 5MB) / Export panel (radio XLS/XLSX/CSV/TSV, "Include additional employee fields" checkbox).

---

## 9. Leave Tracker

Tabs: User-specific Operations | Leave Requests | Holidays | Customize Balance | Customize Policy | Exceptional Working days.

- **Leave Requests** list: Employee Name, Leave type, Type (Paid/Unpaid badge), Leave period (date range), Days/hours, Date of request.
  **Apply Leave modal**: Employee ID* (default self), Leave type*, Date From/To*, Team Email ID, Reason for leave.
- **Holidays**: date-range picker, list/calendar toggle, "My Holidays" scope, empty "No holiday data to display currently".
  **Add Holidays modal**: Name*, Date*, "Set holiday applicability" rule builder (Shifts is [Select]), Classification* (default Holiday), Description, reminder-days-before dropdown, "Customize Email Template" link, toggles (Notify via feeds / Reprocess leave applications), note "Shift based holiday overrides location based holiday".
- **Customize Balance**: table Employee × Paid types (Casual/Earned/Maternity/Paternity/Sabbatical/Sick) + Unpaid (Leave Without Pay). **Correction modal**: Employee selector, table per leave type — Date, Existing balance (ro), New balance, Reason.
- **Customize Policy**: table Leave policy | Type | Unit(Days) | Balance | Actions (View History, Rerun Policy).
- **Exceptional Working days**: **Add modal**: Name*, Date*, "Applicable for" rule builder (Shifts), Description. Note: "can only be added on weekends".

---

## 10. Files

Sub-tabs: (implicit) Organization Files | Employee Files | HR Forms & Templates | Folders.

- **Organization Files**: Location/Department left filter. Empty "No organization file added" + **Add Organization Files modal**: source (Desktop/WorkDrive/Others, 10MB max), File name*, Description, Share with* (multi-select), Folder*; File settings (expiry date, "Mark as organization policy document" checkbox, Acknowledgement/Consent toggle+radio, deadline); File permissions (Allow download — Employee checkbox); Notifications (Feeds/Email checkboxes).
- **Employee Files**: table (Name, Shared with tag, Folder tag, Updated on, Actions). **Add Employee File modal**: source picker, File name*, File access* (radio Employee/Role), Employee Status (radio Active/Inactive), Employee*, Description, Folder*; Acknowledgement (No deadline / Enforce mandatory deadline+date); Permissions (View access + Download access: Employee, Reporting manager checkboxes); Notifications.
- **HR Forms & Templates**: table (Name+created date, Description, Actions) — e.g. "Company Handbook Template". Row click opens document preview overlay.
- **Folders**: card grid (folder icon+name), **Add Folder modal** (Folder name*, Place under dropdown).

---

## 11. Employee Information

Tabs: Employees | User-specific Operations | Insights | Departments | Designations | HR Process | Groups | Delegation.

### Employees (master directory)
Toolbar: saved view+Edit, "All Data" filter, **Add Employee(s)** button, expand/filter, `...` (Import/Export/History Export/Profile Photo Upload/Export Access Log).
Columns: Employee ID, First/Last Name, Nick name, Email address, Photo, Department, Designation, Zoho Role, Employment Type, Employee Status.

**Add Employee(s) — 4-step wizard**: 1 Selection (license usage bar, method cards: Invitation/Domain Email/Zoho Mail/Google Workspace/Microsoft 365) → 2 Create User Account (Employee ID*+Generate button, First Name*, Last Name*, Email address*) → 3 Edit User Data → 4 Alerts.

### User-specific Operations
Search Employee box, empty "Please begin typing to search for an employee".

### Insights (analytics dashboard)
3 stat cards: Headcount & growth rate, Employee addition & growth rate, Employee attrition & growth rate (Month + YOY %). 2 charts: "Employee addition trend" / "Employee attrition trend" (6-month line/area, dual-axis Count/Percentage).

### Departments ⭐ (relevant to our Settings page)
List columns: **Department Name, Mail Alias, Added By, Added Time, Modified By, Modified Time, Department Code**.
**Add Department modal**: **Department Name\*** (text), **Department Code** (text), **Mail Alias** (text), **Department Lead** (dropdown select), **Parent Department** (dropdown select + inline "+" add). Buttons: Submit / Submit and New / Cancel.
→ *Our current hrms-app Settings only has Department Name — Zoho also tracks Code, Mail Alias, Lead, and a Parent Department hierarchy.*

### Designations ⭐ (relevant to our Settings page)
List columns: **Designation Name, Mail Alias, Added By, Added Time, Modified By, Modified Time, Designation Code**.
**Add Designation modal**: **Designation Name\*** (text), **Designation Code** (text), **Mail Alias** (text). Buttons: Submit / Submit and New / Cancel.
→ *Same gap — we only have the name field currently.*

### HR Process
Table: Status | Employee | Key Field | Value | Effective date | Process | Reason. **Initiate Process** picker: 3 cards — Department Change / Location Change / Designation Change. Step 1: "Select employees" search + info banner ("date of joining is mandatory") → Next.

### Groups
**Add Group modal**: Group name*, Description, Group email address, Administrator* (chip, pre-filled), Members (typeahead), "Notify newly added employees" checkbox.

### Delegation
Same pattern as My Space > Delegation.

---

## 12. Performance

**Getting Started** 3-step onboarding wizard (no data forms yet, just explainer):
1. Review Methods — 4 cards: Key Result Areas (KRA), Goals, Skill Set, Competency.
2. Review Types — 4 cards: Self Review, Multi-Rater Review, Manager Review, Continuous Review.
3. "How to use performance management" — 5-step flow diagram: Create appraisal template → Specify review parameters → Select reviewers/customize review → Setup rating and normalization → Initiate appraisal cycle.
Final button: "Getting Started" launches the real setup.

---

## 13. Travel (skipped for now)

Sub-tabs: Travel Request | Travel Expense.
- **Travel Request** list columns: Employee ID, Travel ID, Employee Department, Place of visit, Expected departure/arrival dates, Purpose of visit, Expected duration (days), Is billable to customer, Customer name.
  **Add modal**: same fields, 2-column layout. Buttons: Submit/Submit and New/Save Draft/Cancel.
- **Travel Expense** list columns: Employee ID, Travel ID (+audit cols). **Add modal**: Expense Details (Employee ID*, Travel ID*+add, readonly Place/Purpose) + Expense line-item grid (Description, Date, Ticket, Lodging, Boarding, Phone, Local conveyance, Incidentals, Others, Currency).

---

## 14. Employee Engagement

Sub-tabs: Metrics | Templates | Question Pool.

- **Metrics**: toggle-card grid of 15 default metrics (Employee happiness, Organizational change, Volume of work, etc.). **Add Metric modal**: Metric name* only.
- **Templates**: "Default Template (10)" card grid (banner image, title, question count, survey/pulse type icon). **Add Engagement Template — 3-step wizard**: 1 Setup (Name*, Description, Survey flow radio [Single Metric/Question-Based/Grouped Question], Display image picker, Layout radio [one-question-per-page / all-in-one-page]) → 2 Questions → 3 Theme.
- **Question Pool**: **Add Questions modal**, left rail picks question type (Yes/No, NPS, Star, Rating Scale, Single choice, Multiple choice, Comment, Date), right panel shows type-specific config (scale type, choices list, star levels, etc.) — all with "Enable comments" advanced option.

---

## 15. Compensation

Sub-tabs: User-specific Operations | Employee Salary | Salary Revision History | Salary Revision Letters | Hike Push Sanction.
**Every salary-related tab is gated behind a "Verify your Identity" step-up modal** (lock icon, no cancel).
Salary Revision History has pill sub-filters: Total / Pending / Processed / Rejected-Cancelled Revisions.

---

## 16. HR Letters

Sub-tabs: Address Proof | Bonafide Letter | Experience Letter.
All three share the same list pattern (columns vary slightly) and a near-identical "Add X" modal:
- **Address Proof**: EmployeeID*, Date of request* (default today), readonly Date of Joining/Designation, Reason for request* (dropdown), "Is there any change in Present address*" (dropdown).
- **Bonafide Letter**: EmployeeID*, Date of request*, readonly Date of Joining/Designation/Department, Reason for request*.
- **Experience Letter**: same as Bonafide + readonly **Current Experience** field.
All: Submit / Submit and New / Save Draft / Cancel.

---

## 17. Offboarding

**Getting Started** overview: feature cards (Resignation Flow, Clearances, Exit Interview, Generate exit documents, Track Offboarding) → **3-step setup wizard**:
1. Preferences — "Enable notice period" toggle, Standard notice period (number+unit), HR partner (multi-select chips).
2. Permissions — "Resignation request can be raised by" checkboxes (Employee/self, Reportee Manager, HR partner).
3. Clearances — checkboxes for pre-defined clearance types (IT, HR, Admin clearance).

---

## 18. Tasks

Tabs: Task | Checklist.
- **Task**: sub-tabs Pending/High Priority/Completed/Overdue/All Tasks/Form View. Form View table: Task name, Due Date, Priority, Status, Task owner.
  **Add Task modal**: Task owner, Task name*, Description, Start Date, Due Date, Reminder (datetime), Priority (dropdown, default Moderate), Status* (dropdown, default Open).
  Filter drawer: Task name, Priority, Related Forms.
- **Checklist**: sub-tabs Pending/Completed, empty "No checklists to list here". Filter drawer: checklist name, Related Forms, Checklist initiator.

---

## 19. General

Tabs: General | Exit Details.
**Exit Details** list columns: Employee ID, Interviewer, Separation date, Reason for leaving, Working for org again, + open-ended feedback columns.
**Add Exit Details modal**: same as My Space > Related Data > Exit Details (Separation / Questionnaire / Checklist sections, see §1).

---

## 20. OKR + OKR Settings

### OKR (Operations)
**Getting Started**: explainer + 3 cards (Objectives, Key Results, OKR cycle) + "OKR cycle Start Month" dropdown + quarter breakdown banner.

### Settings > OKR (tabs: Configuration | Approvals | Automation | Permissions)
- **Configuration > General**: OKR cycle Start Month dropdown; OKR status table (Color swatch, Status name, Deviation range min/max %, delete) — rows: Yet to Start, On Track, Need Attention, At Risk, Off Track, Completed + "Add Status"; "Location based OKRs" enable toggle.
- **Configuration > Objectives**: Access permissions table (Add checkbox × Employees/Reporting Manager/Department Head/Location Administrator); Approvals toggles (trigger on add / trigger on align).
- **Configuration > Key Results**: "Trigger approval when checking in key results" toggle; "Allow employees to assign key results to" radio (Reportees/All Employees).
- **Approvals**: empty "No approvals are currently configured" + **Add Approval** wizard (steps: Approval Details → Criteria → Approvals → Messages). Approval Details: Form name, Approval name*, Description. Approvals section: Configure Approver button OR Auto Approve/Auto Reject radio. Messages: From, Cc/Bcc/Reply To, To (chips), Subject*, Body (template dropdown + rich text w/ merge vars), Attachments.
- **Automation > Workflows**: empty state + Add Workflow.
  - **Actions > Email Alerts**: Add Email Alert modal (Form*, Email alert name*, Description, Message section From/To/Subject/Body).
  - **Actions > Checklists & Tasks**: Add Checklist modal (Form*, Checklist name*) → Next.
  - **Actions > Webhooks**: sub-tabs Webhooks/Failures/Success, filter drawer (Webhooks, Days).
  - **Actions > Custom Functions**: empty + Add Custom Function.
  - **Templates > Email Templates**: list (Name, Form name) + Add Email Template modal (merge-field rich text editor).
  - **Templates > Letter Templates**: same as Email Templates.
  - **Workflow & Custom Button Logs**: audit log, empty state.
- **Permissions > OKR administrators**: "Module administrators" toggle + description.

---

## 21. Data Administration

Tabs: Import Log | Export Log | Activity Log | Localization | **Recycle Bin**.
Recycle Bin: form-selector filter, table (EmployeeID, form fields, Deleted By, Deleted Time), empty "Records deleted will be listed here. Deleted records can be restored within 30 days."

---

## 22. Reports

Tabs: My Reports | Team Reports | Organization Reports | Analytics | Schedulers.
- **My/Team/Org Reports**: multi-column card list grouped by module (Employee Information, Leave Tracker, Attendance, Time Tracker, OKR, Files), each report = star (favorite) + name link. "Access Permissions" button opens a parallel view with module-level + per-report toggle switches instead of stars.
- **Analytics**: left rail filters by module, empty "No reports have been generated yet" + **Create Report** (Report Name, Report Type dropdown, Report Based On — dependent on module).
- **Schedulers**: **Add Report Scheduler modal**: Report scheduler name*, Description, Start date and time* (datetime), Frequency (default Once), Time zone; "Select report" section; Message section (From, Cc/Bcc/Reply To, To*, Subject*, Body rich text w/ merge fields).

---

## 23. Marketplace (skipped for now)

Tabs: Extensions | Zoho | Third-party Integrations | FTP Connection.
- **Extensions**: All/Installed/Updates sub-tabs, filter bar (Category/Edition/Price/Rating/Deployment), tag cloud, card grid (icon, name, rating, price).
- **Zoho** / **Third-party Integrations**: card grid, each with description + action button (Configure/View Details/Access/Enable/Explore Templates).
- **FTP Connection**: landing page → **3-step Configure wizard**: 1 FTP Connection Details (protocol type*, host*+port, username*, password*) → 2 FTP Configuration → 3 Field Mapping.

---

## 24. Developer Space (skipped for now)

Tabs: Zoho People API | Connections | Standalone Function | Widgets | Web Tab | Variables.
- **Zoho People API**: expandable list of forms with API/link names + copy icon.
- **Connections**: My Connections (empty, "Create Connection") / Shared Connections (empty, read-only) / Default Services (grid, 107 pre-built) / Custom Services (**Create Service**: Service Name*, Service Link Name*, Authentication Type*, Parameter Type, Parameter Key*, Parameter Display Name*).
- **Standalone Function**: Deluge script editor modal — name*, method name*, return type*, code editor w/ drag-drop action palette (Basic/Condition/Notifications/Integrations/Collection snippets).
- **Widgets** / **Web Tab**: near-identical modals — Name*, Description, Type/Position*, Hosting* (Internal/External), Attachment* (.zip, 5MB), Index page*, "Applicable for" radio (Administrators Only/All Employees/designated roles).
- **Variables**: empty "No Variable created yet" + **Create modal** (Name*, API name*, Description, Variable type*, Group under*).

---

## 25. Zia (AI Assistant)

Settings > Zia > Configuration: "Enable Zia AI" toggle (off by default), data-sharing disclosure banner, API Key Source radio (Zoho Key Services / BYOK), Custom Instructions text block, role-based access section.

---

## Immediate takeaway for hrms-app

The **Departments** and **Designations** tabs we just shipped in `/settings` are intentionally the "not too big" version. Zoho's actual fields are:

| | Zoho fields | Our current fields |
|---|---|---|
| Department | Name*, Code, Mail Alias, Department Lead, Parent Department | Name only |
| Designation | Name*, Code, Mail Alias | Name only |

If the team wants to match "same theme, all the fields," Department Lead + Parent Department (hierarchy) and the Code/Mail Alias columns on both would be the next additions — but that needs new DB columns on both tables, not just UI.

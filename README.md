# FOP Attendance CRM

A restrained, mobile-friendly attendance CRM for Festival of Praise. Built with Next.js 14, Supabase Auth/Postgres and Vercel.

## Current implementation
- Supabase email/password sign-in; protected app routes and sign-out.
- Explicit `app_metadata.role` authorisation: `super_admin` or `admin`. Users without an assigned role have no app/database access.
- Live contact directory with add/edit, search and CSV import review with duplicate checks.
- Session creation for Super Admins and session-based attendance marking for authorised admins.
- Multi-date attendance report with per-session summaries and CSV export.
- Row-level security policies and a restrained responsive design system.

## Setup
1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in local environment and Vercel. Never expose a service-role key to the browser.
2. Apply `supabase/migrations/202610200001_fop_attendance_schema.sql` in the Supabase SQL editor (or run it through your normal migration workflow).
3. In Supabase Auth, create/invite the initial administrator. Disable public sign-ups if the project does not need open registration.
4. Assign role claims through a trusted server/admin process only. Set the user's **app_metadata** to `{ "role": "super_admin" }` for the primary administrator, or `{ "role": "admin" }` for check-in administrators. Do not use editable `user_metadata` for authorisation.
5. Install dependencies with `npm install`, then run `npm run dev`. Before deployment, run `npm run build`.
6. Deploy the branch to Vercel after environment variables are configured.

## Roles
- **Super Admin**: contacts, sessions, attendance, imports, reports and administration.
- **Admin**: contacts and attendance; no report access or session-creation privileges.
- **Unassigned**: no protected app or database access.

## Import notes
The current in-app importer supports CSV with a header row. It previews detected rows and checks existing email addresses and phone numbers before inserting. Excel files should be saved as CSV for this first implementation. PDF extraction/OCR is not yet implemented; extracted PDF data should be reviewed in a spreadsheet before importing.

## QR check-in
The current implementation includes the manual search/check-in workflow. Public QR check-in is not yet enabled: a generic event QR cannot safely identify a person by itself. The next QR iteration should validate the member and session before recording attendance, with duplicate protection and an admin fallback.

## Data and reporting behaviour
Attendance is one record per contact per event. A saved status can be corrected by an authorised admin. Reports include recorded attendance only; a person with no record is not automatically classified as absent. This avoids reporting a false absence before a register has been reconciled.

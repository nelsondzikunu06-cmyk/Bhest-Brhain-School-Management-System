# School Management System — Build Plan

A complete school management platform with navy/gold/white theme, dark mode, and Ghana cedis (₵) currency.

## Stack
- TanStack Start + React + Tailwind v4 (already scaffolded)
- Lovable Cloud (Supabase) for auth, database, storage
- shadcn/ui sidebar, jsPDF for receipts/report cards

## Design System
- Colors: Navy (#0B1E3F), Gold (#D4A537), White, with dark mode variants
- Sidebar layout with collapsible navigation
- Light/Dark mode toggle in header (persists in localStorage)
- Mobile-responsive

## Auth
- `/auth` — admin email/password login (signup + signin)
- `/parent-auth` — separate parent login
- `_authenticated/*` — admin-only routes
- `_parent/*` — parent-only routes
- Roles stored in `user_roles` table (admin, parent) with `has_role()` security definer

## Database (Supabase)
- `students` — id, full_name, dob, class, parent_name, parent_phone, parent_email, fee_balance, enrollment_date, medical_conditions, status, photo_url, parent_user_id
- `fee_structures` — class, amount
- `fees` — student_id, amount_paid, payment_date, payment_method, balance
- `attendance` — student_id, date, status (unique on student+date)
- `grades` — student_id, subject, score, term, academic_year, teacher_comment
- `announcements` — title, body, created_at
- `user_roles` — user_id, role (enum: admin, parent)
- `profiles` — user_id, full_name
- Storage bucket: `student-photos` (public)
- RLS: admins full access; parents read-only on their child's rows

## Pages

**Admin (`_authenticated`)**
1. **Dashboard** — KPI cards (students, staff placeholder, fees collected ₵, attendance rate), recent activity feed, quick action buttons, attendance trend chart
2. **Students** — searchable table, add/edit dialog with passport photo upload, delete
3. **Fees** — fee structure manager per class, record payment form, balances table, Print Receipt PDF
4. **Attendance** — pick class → list students → present/absent toggle, save
5. **Grades** — pick student/term → enter subject scores, show class average + individual performance
6. **Report Cards** — pick class + term → generate PDF report card per student (info, photo, grades, class avg, attendance summary, comments)
7. **Announcements** — post messages visible to parents

**Parent (`_parent`)**
- Dashboard showing their child(ren): grades, attendance %, fee balance, announcements

## Technical Details
- PDF generation: `jspdf` + `jspdf-autotable` (client-side)
- Photo upload via Supabase Storage; URL stored on student row and shown everywhere the student appears
- Currency formatter: `₵{amount.toLocaleString('en-GH')}`
- Theme: CSS class `dark` on `<html>`, toggle persisted
- Parent ↔ student link via `students.parent_user_id` set by admin (email match on parent creation)

## Out of scope (flag to user)
- SMS/email notifications
- Staff CRUD (dashboard shows count from a placeholder)
- Multi-school / multi-tenant
- Teacher logins (only admin + parent roles)

Confirm and I'll enable Lovable Cloud and build it.

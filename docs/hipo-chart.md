# Complete Hierarchical Input-Process-Output (HIPO) Specification

This document presents the complete **Hierarchical Input-Process-Output (HIPO)** specification for **E-KODAK: Photography Service Management System with Real-Time Tracking**, directly grounded in the active codebase, database schema, and operational workflows.

---

## 📑 Master Architecture Hierarchy (30 System Processes across 6 Modules)

```text
E-KODAK SYSTEM
├── MODULE 1: User Authentication & Access Control (Processes 1 - 4)
├── MODULE 2: Customer Booking & Self-Service Portal (Processes 5 - 12)
├── MODULE 3: Photographer Field Operations & Mobile Companion (Processes 13 - 17)
├── MODULE 4: Studio Administration & Treasury Management (Processes 18 - 23)
├── MODULE 5: School Masterlists & Yearbook Compilation (Processes 24 - 28)
└── MODULE 6: System Communications & Notifications (Processes 29 - 30)
```

---

## 📋 Comprehensive HIPO Process Tables

### MODULE 1: User Authentication & Access Control

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **1** | **User Registration Process** | Client full name, email, phone number, password, and role selection | Validates email uniqueness, enforces password rules, creates Supabase Auth user, and triggers `on_auth_user_created` to provision `profiles` row | Registered user record, initial profile with role `customer`, verification email, and redirect to login |
| **2** | **User Login & Session Authentication** | Email address and password credentials | Authenticates credentials against `auth.users`, retrieves user role from `profiles`, and generates secure JWT session token | Authenticated session, active user state, and redirection to role-specific dashboard (Customer, Photographer, Admin) |
| **3** | **Password Reset & Security Update** | Registered email address, new password, and confirmation password | Validates password reset token, checks password security format, encrypts and updates credentials in database | Password update confirmation message and prompt to re-authenticate |
| **4** | **User Logout Process** | User logout trigger from navigation bar | Terminates active Supabase session token and clears local storage/cached authentication state | Cleared browser session and redirection to Landing Page |

---

### MODULE 2: Customer Booking & Self-Service Portal

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **5** | **Service Catalog & Pricing Exploration** | Category filter selection (Graduation, Studio Portrait, Events) | Queries `service_categories`, `services`, and `add_ons` for active offerings, base rates, and tier inclusions | Categorized interactive pricing display, package cards, sample photos, and downpayment requirements |
| **6** | **Photo Session Booking & Scheduling** | Selected package tier, optional add-ons, student details, appointment date, and time slot | Evaluates calendar availability, prevents double-booking, computes total pricing and downpayment, stores booking with status `Pending` | Stored booking record, reserved calendar slot, and redirection to downpayment payment page |
| **7** | **Downpayment Submission & Proof Upload** | Payment channel (GCash, Maya, Bank Transfer), reference number, deposit amount, and receipt screenshot | Uploads image to Supabase Storage (`receipts`), records entry in `payments` linked to `booking_id`, sets payment status to `Pending Verification` | Stored payment submission record and confirmation prompt for customer |
| **8** | **Digital Pass & QR Code Generation** | Unique booking reference ID and secure transaction token | Trigger `generate_booking_number()` creates reference (`EK-YYYYMMDD-XXXX`), passes token to QR engine (`qrcode.react`) to generate vector graphic | Scannable digital tracking pass containing QR code, appointment details, venue map, and public pass URL |
| **9** | **Public Pass Milestone Tracking** | Booking reference number or public pass URL token | Queries `bookings` and `booking_status_history` for timestamped stage progression (Captured, Editing, Printing, Ready for Pickup) | Real-time interactive progress tracker with animated status timeline and studio instructions |
| **10** | **Automated AI Studio Inquiry Assistant** | Client natural language question regarding packages, studio operating hours, or policies | Transmits prompt and studio knowledge base to Google Gemini API (`@google/genai`), parses conversational response | Instant automated conversational answer displayed in the AI chat bubble |
| **11** | **Soft Copy Proofing & Photo Download** | Client request to access finalized session photos | Queries `photo_outputs` for approved deliverable files, checks payment completion (`fully_paid`), generates secure signed download URLs | Watermarked photo proofing gallery and high-resolution downloadable digital image assets |
| **12** | **Appointment Rescheduling or Cancellation** | Requested new date/time slot or cancellation reason | Validates studio rescheduling window policies, updates appointment date in `bookings`, and records audit note in `booking_status_history` | Reschedule confirmation notification or cancellation receipt |

---

### MODULE 3: Photographer Field Operations & Mobile Companion

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **13** | **Photographer Availability Configuration** | Working calendar dates, daily start time, end time, and off-duty blackout dates | Inserts or updates records in `photographer_availability`, toggles active status in `photographer_profiles` | Updated availability calendar preventing booking slot conflicts on photographer shifts |
| **14** | **Assigned Shoot Roster Inspection** | Photographer authentication token and active date filter | Queries `bookings` assigned to the authenticated `photographer_id`, joins customer profile details and service package inclusions | Chronological queue of assigned photo sessions, client shoot briefs, and venue requirements |
| **15** | **On-Site QR Pass Scanning & Check-In** | Scanned customer QR code token captured using mobile camera (`expo-camera` / `jsqr`) | Decodes QR token string, queries database for matching `booking_token`, logs scan event (timestamp, photographer ID) into `qr_scan_logs` | Instant client identification confirmation, shoot dossier display, and on-site check-in verification |
| **16** | **Live Production Milestone Update** | Selected workflow milestone stage (`Captured`, `Editing`, `Printing`, `Ready for Release`) and photographer remarks | Updates `booking.status`, inserts audit row in `booking_status_history`, triggers `trg_create_delivery_on_ready` if applicable, dispatches in-app notification | Milestone state updated in database, public pass tracking progress refreshed, and automated client alert triggered |
| **17** | **Photographer Photo Upload & Deliverables** | High-resolution edited photo files linked to specific `booking_id` | Validates image format and resolution, batch-uploads files to Supabase Storage (`deliverables`), creates records in `photo_outputs` | Stored deliverable photo records, notification to admin for final review, and soft-copy readiness flag |

---

### MODULE 4: Studio Administration & Treasury Management

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **18** | **Master Booking Queue & Calendar Scheduling** | Filter criteria (date range, service category, milestone status), walk-in client details, or photographer reassignment | Queries comprehensive booking records, updates appointment dates, manually overrides schedule conflicts, or assigns designated photographers | Centralized studio master calendar, assigned shoot rosters, and updated booking cards |
| **19** | **Payment Verification & Treasury Recording** | Admin review of uploaded customer payment screenshot, physical cash receipt amount, or transaction reference | Validates transaction legitimacy, updates `payments.payment_type` to `verified`, executes `trg_update_booking_balance` to recalculate remaining balance, updates `booking.status` to `Confirmed` | Confirmed booking state, recorded treasury ledger transaction, and printable official receipt voucher |
| **20** | **Service Package, Tier & Add-on Management** | Package name, category, slug, tier inclusions, base price, required downpayment amount, and optional add-on items | Inserts or updates records in `service_categories`, `services`, and `add_ons`, activates/deactivates offerings | Synchronized studio service catalog updated across web booking wizards |
| **21** | **Customer Directory & Profile Oversight** | Search query (student name, email, school ID, contact number) | Queries `profiles` table, aggregates customer booking history, total transaction value, and active reservation status | Comprehensive client dossier, contact information, and lifetime booking records |
| **22** | **Photographer Directory & Assignment Management** | Photographer account details, specializations, assigned session ID | Updates `photographer_profiles`, links photographer ID to `bookings.photographer_id`, checks for schedule overlaps | Assigned photographer dispatch, updated booking card, and roster notification sent to photographer |
| **23** | **Studio Settings & CMS Configuration** | Operating hours, studio venue address, GCash/Maya payment QR codes, announcement bulletins, and studio policies | Updates records in `studio_settings`, `announcements`, `faqs`, and `gallery_items` | Updated public landing page content, refreshed studio policies, and updated payment receiver QR graphics |

---

### MODULE 5: School Masterlists & Yearbook Compilation

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **24** | **School Masterlist Document OCR Parsing** | Uploaded school class roster document (PDF, Word docx, or spreadsheet image) | Client-side document parser (`pdfjs-dist` / `docx`) executes text extraction and table tokenization, parsing student names, ID numbers, sections, graduation packages, and mottos | Structured interactive student preview grid with column validation and manual edit capabilities |
| **25** | **School Masterlist Roster Persistence** | Validated student roster preview data and designated academic section/school name | Batch inserts student records into the studio database, creating student roster entities linked to graduation projects | Saved school section roster in database and confirmation of stored student records |
| **26** | **Graduation Portrait Batch Linking** | ZIP archive containing individual 2x2 graduation portraits named by student ID numbers | Uncompresses image files, extracts student IDs from filenames, matches and binds portrait image URLs to student database records | Matched portrait roster with visual gallery indicator showing completed vs missing student photos |
| **27** | **Interactive 3D Digital Flipbook Preview** | Selected yearbook layout templates, school color themes, and mapped student records | Compiles digital pages in memory and renders interactive 3D page-flip canvas preview | Realistic interactive 3D digital flipbook allowing stakeholders to review yearbook pages prior to physical printing |
| **28** | **Preflight Validation & Print-Ready PDF Export** | Admin export command, selected print resolution (300 DPI), and page bleed specifications | Runs preflight completeness audit (verifying all students have photos and mottos), compiles vector typography and high-res imagery using `jspdf` / `jspdf-autotable` | Exported multi-page, high-resolution, print-ready graduation yearbook PDF document |

---

### MODULE 6: System Communications & Notifications

| # | Process Name | INPUT | PROCESS | OUTPUT |
|---|---|---|---|---|
| **29** | **Real-Time In-App Notification Trigger** | Booking milestone update, payment approval, or assignment change event | Inserts row into `notifications`, triggers Supabase Realtime broadcast to subscribed client or photographer sockets | Instant push toast notification and badge counter increment on the user's dashboard |
| **30** | **Transactional Email Confirmation Dispatch** | Booking confirmation, downpayment receipt, or photo release trigger | Assembles HTML email template with booking details and QR pass link, transmits via EmailJS / SMTP service, logs entry into `email_logs` | Delivered email confirmation to client inbox and recorded audit log |

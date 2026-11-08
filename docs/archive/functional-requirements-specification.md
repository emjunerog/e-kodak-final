# E-Kodak: Comprehensive Functional Requirements Specification (FRS)

## 1. Document Overview & Scope

This specification formalizes the **Functional Requirements (FR)** implemented within the **E-Kodak Photography Service Management System**. 

The requirements are listed in **strict chronological process sequence**, tracing a customer and studio order through its entire lifecycle:
1. **User Onboarding & Discovery** (FR-01 to FR-04)
2. **Session Booking & Scheduling** (FR-05 to FR-07)
3. **Payment & Booking Confirmation** (FR-08 to FR-10)
4. **Studio Check-in & Photographer Assignment** (FR-11 to FR-15)
5. **Photo Production & Quality Tracking** (FR-16 to FR-18)
6. **Academic Masterlists & Yearbook Publishing** (FR-19 to FR-26)
7. **Deliverable Release & Rescheduling** (FR-27 to FR-28)
8. **Studio Operations, Analytics & Maintenance** (FR-29 to FR-36)

---

## 2. Process-Sequential Functional Requirements Catalog

| Req ID | Module / Functional Requirement | Primary Role | Lifecycle Process Stage | Source Code Implementation | Database Tables |
|---|---|---|---|---|---|
| **FR-01** | **Register** | Guest | Stage 1: Onboarding | [Register.jsx](file:///d:/E-kodak%20Final/src/pages/auth/Register.jsx) | `auth.users`, `profiles` |
| **FR-02** | **Login with Role-Based Access** | All | Stage 1: Authentication | [Login.jsx](file:///d:/E-kodak%20Final/src/pages/auth/Login.jsx), [ProtectedRoute.jsx](file:///d:/E-kodak%20Final/src/components/auth/ProtectedRoute.jsx) | `auth.users`, `profiles.role` |
| **FR-03** | **View Service Packages & Pricing** | Customer | Stage 1: Package Discovery | [Services.jsx](file:///d:/E-kodak%20Final/src/pages/Services.jsx) | `services`, `add_ons` |
| **FR-04** | **Ask AI Assistant for Inquiries** | Customer | Stage 1: Client Guidance | [AIAssistant.jsx](file:///d:/E-kodak%20Final/src/components/ai/AIAssistant.jsx), [ai.js](file:///d:/E-kodak%20Final/src/lib/ai.js) | Gemini 2.5 API |
| **FR-05** | **Book Photo Session** | Customer | Stage 2: Booking Wizard | [BookSessionPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/BookSessionPage.jsx) | `bookings`, `services` |
| **FR-06** | **Upload Reference Photos** | Customer | Stage 2: Requirement Upload | [ReferenceImageUploader.jsx](file:///d:/E-kodak%20Final/src/components/booking/ReferenceImageUploader.jsx) | Supabase Storage (`reference-images`) |
| **FR-07** | **View & Select Available Schedule** | Customer | Stage 2: Slot Selection | [InteractiveCalendar.jsx](file:///d:/E-kodak%20Final/src/components/booking/InteractiveCalendar.jsx), [liveAvailabilityService.js](file:///d:/E-kodak%20Final/src/services/liveAvailabilityService.js) | `bookings`, `photographer_availability` |
| **FR-08** | **Submit Payment & View Billing** | Customer | Stage 3: Payment | [PaymentsPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/PaymentsPage.jsx), [customerPaymentService.js](file:///d:/E-kodak%20Final/src/services/customerPaymentService.js) | `payments`, `bookings` |
| **FR-09** | **Verify Proof of Payment** | Staff, Admin | Stage 3: Verification | [AdminPayments.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminPayments.jsx) | `payments.is_verified` |
| **FR-10** | **Confirm Booking & View Status** | Staff, Customer | Stage 3: Confirmation | [AdminBookingDetail.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminBookingDetail.jsx) | `bookings.status` |
| **FR-11** | **Generate Booking QR Code** | Customer, Staff | Stage 4: Pass Generation | [QRPass.jsx](file:///d:/E-kodak%20Final/src/components/booking/QRPass.jsx), [PublicPassPage.jsx](file:///d:/E-kodak%20Final/src/pages/PublicPassPage.jsx) | `bookings.qr_token` |
| **FR-12** | **Scan QR Code for Check-in** | Staff | Stage 4: Studio Check-in | [StaffQRScannerModal.jsx](file:///d:/E-kodak%20Final/src/components/admin/StaffQRScannerModal.jsx) | `bookings.qr_token` |
| **FR-13** | **Manage Photographer Availability** | Photographer | Stage 4: Availability | [PhotographerAvailability.jsx](file:///d:/E-kodak%20Final/src/pages/photographer/PhotographerAvailability.jsx) | `photographer_availability` |
| **FR-14** | **Manage Photographer Assignments** | Admin, Staff | Stage 4: Staff Dispatch | [AdminBookingDetail.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminBookingDetail.jsx) | `bookings.photographer_id` |
| **FR-15** | **View Assigned Shoots** | Photographer | Stage 4: Shoot Briefing | [PhotographerDashboard.jsx](file:///d:/E-kodak%20Final/src/pages/photographer/PhotographerDashboard.jsx) | `bookings` |
| **FR-16** | **Track Photo Production Status** | Customer, Staff | Stage 5: Milestone Tracking | [BookingProgressPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/BookingProgressPage.jsx) | `bookings.status`, `booking_status_history` |
| **FR-17** | **Upload Photo Deliverables** | Photographer | Stage 5: Lab Submission | [PhotographerUploads.jsx](file:///d:/E-kodak%20Final/src/pages/photographer/PhotographerUploads.jsx) | `photo_outputs`, Supabase Storage |
| **FR-18** | **Manage Workstation Transfers** | Staff, Admin | Stage 5: Lab Handoffs | [workstationService.js](file:///d:/E-kodak%20Final/src/services/workstationService.js) | `workstation_transfers` |
| **FR-19** | **Upload School Masterlist** | Customer, Staff | Stage 6: Roster Ingestion | [documentConverterService.js](file:///d:/E-kodak%20Final/src/services/documentConverterService.js) | Local File Upload |
| **FR-20** | **Scan & Parse Masterlist** | Staff, Admin | Stage 6: Roster Extraction | [pdfMasterlistScannerService.js](file:///d:/E-kodak%20Final/src/services/pdfMasterlistScannerService.js) | Document Parser |
| **FR-21** | **Manage School Masterlists** | Admin, Staff | Stage 6: Roster Directory | [SchoolMasterlistUploader.jsx](file:///d:/E-kodak%20Final/src/components/dashboard/SchoolMasterlistUploader.jsx) | In-memory / JSON payload |
| **FR-22** | **Manage Yearbook Projects** | Admin | Stage 6: Yearbook Setup | [AdminYearbookGenerator.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminYearbookGenerator.jsx), [yearbookService.js](file:///d:/E-kodak%20Final/src/services/yearbookService.js) | `yearbook_projects` |
| **FR-23** | **Manage Yearbook Page Layouts** | Admin | Stage 6: Design Layouts | [AdminYearbookGenerator.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminYearbookGenerator.jsx) | `yearbook_projects` |
| **FR-24** | **Upload Yearbook Student Photos** | Admin, Staff | Stage 6: Portrait Linking | [BatchPhotoUploadModal.jsx](file:///d:/E-kodak%20Final/src/components/admin/yearbook/BatchPhotoUploadModal.jsx) | `photo_outputs` |
| **FR-25** | **View Yearbook Flipbook** | All | Stage 6: Digital Proof | [YearbookFlipbook.jsx](file:///d:/E-kodak%20Final/src/components/admin/yearbook/YearbookFlipbook.jsx) | UI Component |
| **FR-26** | **Export Yearbook (PDF/Print)** | Admin | Stage 6: Print Production | [YearbookExportModal.jsx](file:///d:/E-kodak%20Final/src/components/admin/yearbook/YearbookExportModal.jsx) | Exporter Service |
| **FR-27** | **View & Download Soft Copies** | Customer | Stage 7: Client Release | [SoftCopiesPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/SoftCopiesPage.jsx) | `photo_outputs` |
| **FR-28** | **Request Booking Reschedule** | Customer | Stage 7: Exceptions | [BookingDetailsPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/BookingDetailsPage.jsx) | `bookings` |
| **FR-29** | **View Analytical Dashboard** | Admin | Stage 8: Executive View | [AdminDashboard.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminDashboard.jsx) | `bookings`, `payments` |
| **FR-30** | **Manage User Accounts** | Admin | Stage 8: User Administration | [AdminCustomers.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminCustomers.jsx), [AdminStaff.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminStaff.jsx) | `profiles` |
| **FR-31** | **Manage Studio Announcements & FAQs** | Admin | Stage 8: CMS Management | [AdminCMS.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminCMS.jsx) | `announcements`, `faqs` |
| **FR-32** | **Manage In-App Notifications** | All | Stage 8: Alerts | [NotificationsPage.jsx](file:///d:/E-kodak%20Final/src/pages/dashboard/NotificationsPage.jsx) | `notifications` |
| **FR-33** | **View SMS Notification Logs** | Admin | Stage 8: SMS Audit | [AdminSmsLogs.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminSmsLogs.jsx) | `sms_logs` |
| **FR-34** | **View Activity Logs & Audit Trail** | Admin | Stage 8: Security Audit | [AdminActivityLogsPage.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminActivityLogsPage.jsx) | `admin_activity_logs` |
| **FR-35** | **Manage Studio Settings** | Admin | Stage 8: Configuration | [AdminSettings.jsx](file:///d:/E-kodak%20Final/src/pages/admin/AdminSettings.jsx) | `studio_settings` |
| **FR-36** | **Logout** | All | Stage 8: Session Termination | [Header.jsx](file:///d:/E-kodak%20Final/src/components/dashboard/Header.jsx) | `auth.users` |

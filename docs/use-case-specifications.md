# Use Case Specifications & Role-to-Requirement Mapping

This document presents the formal **Use Case Specifications** and **Role-to-Requirement Mapping** for **E-KODAK: Photography Service Management System with Real-Time Tracking**, grounded directly in the verified functional requirements and user roles: **Client / Customer**, **Photographer**, and **Administrator**.

---

## 👥 System Actors Overview

The E-Kodak system defines three primary actors:

1. **Client / Customer**: Public users, prospective clients, and graduating students who browse photography services, book sessions, submit downpayments, track milestone progress via public QR passes, consult the automated Gemini AI assistant, preview 3D digital yearbooks, and download soft copies.
2. **Photographer**: Studio photographers who configure working shift availability, inspect chronological shoot rosters with client session briefs, scan customer QR passes on-site for check-in, update production milestone stages, and upload retouched photo deliverables directly into the studio digital vault.
3. **Administrator**: Studio owners and managers who oversee the master appointment calendar, verify GCash/Maya and cash payments, record treasury ledger entries, configure service package tiers and add-ons, manage customer and photographer directories, upload and OCR-parse school masterlists, compile 3D flipbook yearbooks and print-ready PDFs, and manage studio settings and bulletins.

---

## 📊 Figure 7: Use Case Diagram for Client / Customer

- **High-Resolution PNG (Instant View, Zero Lag)**: [`docs/figures/use-case-client.png`](file:///d:/E-kodak%20Final/docs/figures/use-case-client.png)
- **Draw.io Master File (Tab 1)**: [`docs/figures/use-case-diagrams.drawio`](file:///d:/E-kodak%20Final/docs/figures/use-case-diagrams.drawio)

### Client / Customer Functional Requirements Mapping
| Use Case ID | Use Case Name | Description / Scope |
|:---:|---|---|
| **UC-001** | **Register Account** | Enables clients to create an account using their personal and academic details. |
| **UC-002** | **Login to Customer Portal** | Enables clients to authenticate securely using email and password credentials. |
| **UC-003** | **Browse Service Packages & Pricing** | Enables users to explore service categories, package tiers, inclusions, and prices. |
| **UC-005** | **Inquire with Gemini AI Assistant** | Enables clients to ask questions and receive automated answers regarding packages and studio policies. |
| **UC-007, UC-008** | **Book Photo Session & Select Schedule** | Enables clients to select package options, enter student information, and choose open calendar time slots. |
| **UC-010** | **Submit Downpayment & Payment Proof** | Enables clients to submit downpayments via GCash, Maya, or bank transfer with reference verification. |
| **UC-011, UC-012** | **Generate & Access Digital QR Pass** | Enables generation of a digital booking pass with a unique QR code and session credential voucher. |
| **UC-006, UC-013** | **Track Real-Time Milestone Status** | Enables clients to monitor production stage progress (Captured, Editing, Printing, Ready for Pickup). |
| **UC-014** | **View & Download Released Soft Copies** | Enables clients to view watermarked proofs and download released high-resolution digital photos. |
| **UC-028** | **Preview 3D Digital Yearbook Flipbook** | Enables users to preview compiled yearbook pages in an interactive 3D digital flipbook format. |
| **UC-036** | **Logout** | Enables users to terminate their active session securely and clear cached tokens. |

---

## 📊 Figure 8: Use Case Diagram for Photographer

- **High-Resolution PNG (Instant View, Zero Lag)**: [`docs/figures/use-case-photographer.png`](file:///d:/E-kodak%20Final/docs/figures/use-case-photographer.png)
- **Draw.io Master File (Tab 2)**: [`docs/figures/use-case-diagrams.drawio`](file:///d:/E-kodak%20Final/docs/figures/use-case-diagrams.drawio)

### Photographer Functional Requirements Mapping
| Use Case ID | Use Case Name | Description / Scope |
|:---:|---|---|
| **UC-002** | **Login to Photographer Portal** | Enables photographers to authenticate securely and access their field dashboard. |
| **UC-019** | **Configure Shift Availability & Blackouts** | Enables photographers to configure working schedules and block off-duty calendar dates. |
| **UC-020** | **View Assigned Shoot Roster & Briefs** | Enables photographers to view their schedule of assigned shoots, client briefs, and package requirements. |
| **UC-016** | **Scan Customer QR Pass for Check-In** | Enables photographers to scan customer booking QR codes using a mobile camera for on-site check-in. |
| **UC-013** | **Update Live Production Milestone Status** | Enables photographers to update photo production stages (e.g., Captured, Editing, Ready for Release). |
| **UC-021** | **Upload Retouched Photo Deliverables** | Enables photographers to upload captured and edited photo sets directly to the studio storage vault. |
| **UC-036** | **Logout** | Enables photographers to terminate their session securely. |

---

## 📊 Figure 9: Use Case Diagram for Administrator

- **High-Resolution PNG (Instant View, Zero Lag)**: [`docs/figures/use-case-admin.png`](file:///d:/E-kodak%20Final/docs/figures/use-case-admin.png)
- **Draw.io Master File (Tab 3)**: [`docs/figures/use-case-diagrams.drawio`](file:///d:/E-kodak%20Final/docs/figures/use-case-diagrams.drawio)

### Administrator Functional Requirements Mapping
| Use Case ID | Use Case Name | Description / Scope |
|:---:|---|---|
| **UC-002** | **Login to Admin Dashboard** | Enables administrators to authenticate securely and access the management hub. |
| **UC-031** | **Manage Master Booking Queue & Assignments** | Enables the admin to monitor all reservations, override calendar slots, and assign photographers. |
| **UC-033** | **Verify Payments & Record Treasury Ledger** | Enables the admin to verify payment proofs, record cash receipts, and issue printable vouchers. |
| **UC-034** | **Manage Service Packages, Tiers & Add-Ons** | Enables the admin to configure service categories, package tiers, inclusions, and add-on pricing. |
| **UC-032** | **Manage Customer & Photographer Directory** | Enables the admin to search client academic profiles, view lifetime bookings, and manage accounts. |
| **UC-022, UC-023, UC-024** | **Upload & OCR Parse School Masterlists** | Enables uploading, automated OCR text extraction, and management of student class section rosters. |
| **UC-025, UC-027, UC-029** | **Manage Yearbook Projects & Print PDF Export** | Enables managing yearbook publications, batch-linking portraits, and compiling 300 DPI print-ready PDFs. |
| **UC-035** | **Configure Studio Settings & CMS Bulletin** | Enables the admin to configure operating hours, GCash/Maya QR codes, studio policies, and announcements. |
| **UC-036** | **Logout** | Enables administrators to terminate their active session securely. |


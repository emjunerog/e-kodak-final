# Entity-Relationship Diagram (ERD) & Database Specification

This document presents the complete **Entity-Relationship Diagram (ERD)** and relational data dictionary for **E-KODAK: Photography Service Management System with Real-Time Tracking**, grounded directly in the production **Supabase PostgreSQL** database schema.

---

## 🏛️ System Database Architecture Overview

The E-Kodak database is structured into four cohesive operational clusters:

1. **Identity, Access Control & Auditing (Column 1)**: Manages role-based accounts (`customer`, `admin`, `photographer`), specialized photographer profiles, shift schedules, administrative activity logs, and user notifications.
2. **Service Catalog & Studio Offerings (Column 2)**: Defines hierarchical photo packages, pricing tiers, downpayment rules, optional add-ons, studio operating parameters, and portfolio galleries.
3. **Core Bookings & Financial Ledger (Column 3 - Central Transaction Hub)**: The core operational hub linking customers, services, and photographers. Tracks appointment schedules, GCash/Maya downpayments, milestone transitions, and mobile QR scan check-ins.
4. **Production, Deliverables & Communications (Column 4)**: Tracks photo studio workflow transitions, raw photo assets, physical print releases/pickups, and automated email confirmation dispatches.

---

## 📊 Figure 6: Entity-Relationship Diagram (ERD)

The ERD is rendered using standard **Information Engineering (Crow's Foot)** notation, with explicit Primary Key (`PK`) and Foreign Key (`FK`) attributes organized into a balanced four-column grid layout matching institutional thesis standards.

- **High-Resolution PNG (Instant View, Zero Lag)**: [`docs/figures/erd-diagram.png`](file:///d:/E-kodak%20Final/docs/figures/erd-diagram.png)
- **Editable Draw.io Diagram**: [`docs/figures/erd-diagram.drawio`](file:///d:/E-kodak%20Final/docs/figures/erd-diagram.drawio)

---

## 📋 Comprehensive Database Data Dictionary

### 1. Identity, Access Control & Auditing

#### 1.1 `profiles`
Central user account table provisioned automatically upon Supabase Auth registration (`auth.users`).
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | References Supabase `auth.users(id)` ON DELETE CASCADE |
| `role` | | `TEXT` | No | Role assignment: `'customer'`, `'admin'`, `'photographer'` |
| `first_name` | | `TEXT` | Yes | First name of the account owner |
| `last_name` | | `TEXT` | Yes | Last name / surname |
| `middle_name` | | `TEXT` | Yes | Middle name / maternal surname |
| `email` | | `TEXT` | Yes | Registered contact email |
| `phone` | | `TEXT` | Yes | Mobile contact number |
| `address` | | `TEXT` | Yes | Residential or campus address |
| `avatar_url` | | `TEXT` | Yes | Storage URL for profile display avatar |
| `is_active` | | `BOOLEAN` | No | Account status flag (Default: `TRUE`) |
| `studio_specs` | | `JSONB` | Yes | Specialized equipment or studio preferences |
| `badges` | | `JSONB` | Yes | Account verification and loyalty metadata |
| `created_at` | | `TIMESTAMPTZ`| No | Account creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Record last update timestamp |

#### 1.2 `photographer_profiles`
Specialized attributes for studio photographers.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK, FK** | `UUID` | No | References `profiles(id)` ON DELETE CASCADE |
| `specialization`| | `TEXT` | Yes | Photography focus (e.g., Portraiture, Graduation, Events) |
| `bio` | | `TEXT` | Yes | Professional biography and portfolio link |
| `is_available` | | `BOOLEAN` | No | Duty availability toggle (Default: `TRUE`) |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Update timestamp |

#### 1.3 `photographer_availability`
Calendar shift availability and off-duty blackout slots.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `photographer_id`| **FK** | `UUID` | No | References `photographer_profiles(id)` ON DELETE CASCADE |
| `availability_date`| | `DATE` | No | Scheduled working shift date |
| `start_time` | | `TIME` | No | Shift commencement time |
| `end_time` | | `TIME` | No | Shift completion time |
| `is_available` | | `BOOLEAN` | No | Available flag (Default: `TRUE`) |
| `status` | | `TEXT` | No | Status descriptor (`'available'`, `'booked'`, `'blocked'`) |
| `notes` | | `TEXT` | Yes | Administrative shift remarks |
| `created_at` | | `TIMESTAMPTZ`| No | Record creation timestamp |

#### 1.4 `admin_activity_logs`
Immutable audit log recording sensitive administrative updates and operations.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `admin_id` | **FK** | `UUID` | Yes | References `profiles(id)` ON DELETE SET NULL |
| `admin_name` | | `TEXT` | Yes | Snapshot name of administrator |
| `admin_role` | | `TEXT` | Yes | Role snapshot at action time |
| `action_type` | | `TEXT` | No | Action type (`'CREATE'`, `'UPDATE'`, `'DELETE'`, `'VERIFY'`) |
| `entity_type` | | `TEXT` | No | Target table (`'bookings'`, `'payments'`, `'services'`) |
| `entity_id` | | `TEXT` | Yes | Target entity identifier |
| `entity_label` | | `TEXT` | Yes | Human-readable entity description |
| `description` | | `TEXT` | Yes | Narrative description of operation |
| `details` | | `JSONB` | Yes | Pre- and post-operation state payload |
| `ip_address` | | `TEXT` | Yes | Originating client network IP |
| `created_at` | | `TIMESTAMPTZ`| No | Audit event timestamp |

#### 1.5 `notifications`
Real-time user alerts and workflow notifications.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `user_id` | **FK** | `UUID` | No | References `profiles(id)` ON DELETE CASCADE |
| `booking_id` | **FK** | `UUID` | Yes | References `bookings(id)` ON DELETE SET NULL |
| `title` | | `TEXT` | No | Notification subject header |
| `message` | | `TEXT` | No | Notification message content |
| `notification_type`| | `TEXT` | No | Category (`'booking_update'`, `'payment_confirmed'`, `'ready'`) |
| `is_read` | | `BOOLEAN` | No | Read status flag (Default: `FALSE`) |
| `created_at` | | `TIMESTAMPTZ`| No | Dispatch timestamp |

---

### 2. Service Catalog & Studio Offerings

#### 2.1 `service_categories`
Top-level classification for photography service packages.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `name` | | `TEXT` | No | Category title (e.g., `'Graduation'`, `'Portrait'`, `'Events'`) |
| `description` | | `TEXT` | Yes | Overview of category services |
| `is_active` | | `BOOLEAN` | No | Active offering flag (Default: `TRUE`) |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Update timestamp |

#### 2.2 `services`
Concrete photography packages with pricing and package inclusions.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `category_id` | **FK** | `UUID` | No | References `service_categories(id)` ON DELETE CASCADE |
| `name` | | `TEXT` | No | Package name (e.g., `'Classic Graduation'`, `'Toga Deluxe'`) |
| `slug` | | `TEXT` | No | URL-safe identifier (Unique) |
| `tagline` | | `TEXT` | Yes | Short promotional subtitle |
| `description` | | `TEXT` | Yes | In-depth package specifications |
| `base_price` | | `NUMERIC` | No | Standard package base cost in PHP |
| `down_payment_amount`| | `NUMERIC`| No | Required reservation deposit in PHP |
| `inclusions` | | `ARRAY` | Yes | Array of package inclusions (prints, soft copies) |
| `tiers` | | `JSONB` | Yes | Multi-tier variants and optional upgrades |
| `cover_image` | | `TEXT` | Yes | Primary portfolio showcase photo |
| `gallery_images`| | `ARRAY` | Yes | Sample gallery image URLs |
| `is_active` | | `BOOLEAN` | No | Offering visibility toggle (Default: `TRUE`) |
| `sort_order` | | `INTEGER` | No | Display sequence index |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Update timestamp |

#### 2.3 `add_ons`
Supplementary options available during booking reservation.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `name` | | `TEXT` | No | Add-on item name (e.g., `'Wooden Frame 8x10'`, `'Rush Edit'`) |
| `price` | | `TEXT` | No | Price string / amount |
| `is_active` | | `BOOLEAN` | No | Availability toggle (Default: `TRUE`) |
| `sort_order` | | `INTEGER` | No | Order priority |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |

#### 2.4 `studio_settings`
Global studio operational configuration, venue address, and contact details.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `contact_email` | | `TEXT` | Yes | Official studio communication email |
| `contact_phone` | | `TEXT` | Yes | Official customer care mobile number |
| `address` | | `TEXT` | Yes | Physical studio studio facility address |
| `business_hours`| | `TEXT` | Yes | Operating schedule hours |
| `social_links` | | `JSONB` | Yes | Studio social media URLs |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Update timestamp |

#### 2.5 `gallery_items`
Public portfolio showcase for prospective clients.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `title` | | `TEXT` | No | Title of showcased portrait |
| `category` | | `TEXT` | No | Classification category |
| `image_url` | | `TEXT` | No | Storage URL of portfolio photograph |
| `before_image` | | `TEXT` | Yes | Raw unretouched preview for editing showcase |
| `is_public` | | `BOOLEAN` | No | Public landing page visibility (Default: `TRUE`) |
| `is_featured` | | `BOOLEAN` | No | Featured carousel highlight flag |
| `likes` | | `INTEGER` | No | Community interaction counter |
| `badges` | | `ARRAY` | Yes | Award or feature metadata tags |
| `sort_order` | | `INTEGER` | No | Sequence priority |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |

---

### 3. Core Bookings & Financial Ledger

#### 3.1 `bookings`
Central transactional entity connecting customers, packages, schedules, and photographers.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_number`| | `TEXT` | No | Formatted code (e.g., `'EK-20261109-001'`) |
| `booking_token` | | `UUID` | No | Secure public tracking pass token |
| `customer_id` | **FK** | `UUID` | No | References `profiles(id)` ON DELETE RESTRICT |
| `service_id` | **FK** | `UUID` | No | References `services(id)` ON DELETE RESTRICT |
| `photographer_id`| **FK**| `UUID` | Yes | References `photographer_profiles(id)` ON DELETE SET NULL |
| `tier_name` | | `TEXT` | Yes | Specific tier selection name |
| `event_date` | | `DATE` | No | Appointment calendar date |
| `preferred_time`| | `TIME` | No | Session time slot |
| `location` | | `TEXT` | Yes | Shoot venue (Studio room or on-location campus) |
| `notes` | | `TEXT` | Yes | Special instructions / shoot requests |
| `status` | | `TEXT` | No | Milestone stage (`'Pending'`, `'Confirmed'`, `'Captured'`, `'Editing'`, `'Printing'`, `'Ready'`, `'Completed'`, `'Cancelled'`) |
| `payment_status`| | `TEXT` | No | Payment state (`'unpaid'`, `'partially_paid'`, `'fully_paid'`) |
| `total_amount` | | `NUMERIC` | No | Aggregate session bill in PHP |
| `down_payment_amount`| | `NUMERIC`| No | Required reservation deposit in PHP |
| `remaining_balance`| | `NUMERIC` | No | Outstanding account balance in PHP |
| `down_payment_confirmed`| | `BOOLEAN`| No | Admin deposit approval verification flag |
| `qr_code_path` | | `TEXT` | Yes | Supabase Storage path for digital QR pass image |
| `student_id` | | `TEXT` | Yes | School roster student ID number |
| `school` | | `TEXT` | Yes | Academic institution affiliation |
| `track` | | `TEXT` | Yes | Senior High strand or College department |
| `batch` | | `TEXT` | Yes | Graduating batch year |
| `section` | | `TEXT` | Yes | Class section assignment |
| `yearbook_motto`| | `TEXT` | Yes | Student graduation quote/motto |
| `created_at` | | `TIMESTAMPTZ`| No | Booking creation timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Last modification timestamp |

#### 3.2 `payments`
Financial transaction records for deposits and settlement balances.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `recorded_by` | **FK** | `UUID` | Yes | References `profiles(id)` (Admin verifier) |
| `amount` | | `NUMERIC` | No | Payment amount received in PHP |
| `payment_type` | | `TEXT` | No | Category (`'down_payment'`, `'final_balance'`, `'add_on'`) |
| `payment_method`| | `TEXT` | No | Channel (`'gcash'`, `'maya'`, `'cash'`, `'bank_transfer'`) |
| `reference_number`| | `TEXT` | Yes | Electronic bank/e-wallet reference code |
| `payment_date` | | `TIMESTAMPTZ`| No | Transaction timestamp |
| `notes` | | `TEXT` | Yes | Admin verification notes / receipt verification |
| `created_at` | | `TIMESTAMPTZ`| No | Record logging timestamp |

#### 3.3 `booking_status_history`
Chronological audit trail of booking lifecycle state transitions.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `changed_by` | **FK** | `UUID` | Yes | References `profiles(id)` |
| `status` | | `TEXT` | No | Resulting status milestone |
| `remarks` | | `TEXT` | Yes | Operational transition notes |
| `created_at` | | `TIMESTAMPTZ`| No | Milestone transition timestamp |

#### 3.4 `qr_scan_logs`
Verification log tracking mobile scanner events on physical shoot check-ins.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `scanned_by` | **FK** | `UUID` | No | References `profiles(id)` (Staff/Photographer ID) |
| `scan_type` | | `TEXT` | No | Event type (`'check_in'`, `'stage_verify'`, `'pickup'`) |
| `scan_result` | | `TEXT` | No | Verification outcome (`'SUCCESS'`, `'INVALID_TOKEN'`) |
| `user_agent` | | `TEXT` | Yes | Mobile browser device info |
| `ip_address` | | `INET` | Yes | Client network IP address |
| `created_at` | | `TIMESTAMPTZ`| No | Scan timestamp |

---

### 4. Production, Deliverables & Communications

#### 4.1 `photo_outputs`
Deliverable digital photography assets and proofing gallery assets.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `uploaded_by` | **FK** | `UUID` | No | References `profiles(id)` (Photographer/Editor) |
| `file_path` | | `TEXT` | No | Supabase Storage path (`deliverables/`) |
| `file_name` | | `TEXT` | No | Original filename |
| `file_type` | | `TEXT` | No | MIME format (`'image/jpeg'`, `'image/png'`) |
| `file_size` | | `BIGINT` | No | Asset size in bytes |
| `status` | | `TEXT` | No | Asset state (`'uploaded'`, `'approved'`, `'released'`) |
| `created_at` | | `TIMESTAMPTZ`| No | Upload timestamp |
| `updated_at` | | `TIMESTAMPTZ`| No | Last status update timestamp |

#### 4.2 `workstation_transfers`
Production routing between studio stations (Raw Capture $\rightarrow$ Retouching $\rightarrow$ Print Lab).
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `sender_id` | **FK** | `UUID` | No | References `profiles(id)` (Dispatching workstation operator) |
| `resolved_by` | **FK** | `UUID` | Yes | References `profiles(id)` (Receiving station operator) |
| `sender_role` | | `TEXT` | No | Source role (`'photographer'`, `'editor'`, `'admin'`) |
| `target_role` | | `TEXT` | No | Destination role |
| `transfer_type` | | `TEXT` | No | Transfer purpose (`'edit_request'`, `'print_batch'`) |
| `priority` | | `TEXT` | No | Urgency level (`'normal'`, `'rush'`, `'urgent'`) |
| `title` | | `TEXT` | No | Routing title |
| `message` | | `TEXT` | Yes | Workstation instructions |
| `status` | | `TEXT` | No | Transfer state (`'pending'`, `'in_progress'`, `'completed'`) |
| `resolved_at` | | `TIMESTAMPTZ`| Yes | Resolution timestamp |
| `created_at` | | `TIMESTAMPTZ`| No | Creation timestamp |

#### 4.3 `booking_deliveries`
Fulfillment and release records for physical photo packages and prints.
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | No | References `bookings(id)` ON DELETE CASCADE |
| `delivery_type` | | `TEXT` | No | Method (`'studio_pickup'`, `'courier_delivery'`) |
| `status` | | `TEXT` | No | Delivery state (`'ready_for_pickup'`, `'dispatched'`, `'claimed'`) |
| `tracking_number`| | `TEXT` | Yes | Courier tracking code (if applicable) |
| `carrier` | | `TEXT` | Yes | Dispatch courier provider |
| `dispatch_address`| | `JSONB` | Yes | Physical delivery destination |
| `delivered_at` | | `TIMESTAMPTZ`| Yes | Handover timestamp |
| `notes` | | `TEXT` | Yes | Pickup verification notes |
| `created_at` | | `TIMESTAMPTZ`| No | Record creation timestamp |

#### 4.4 `email_logs`
Delivery log of automated transaction emails (confirmation, receipts, photo releases).
| Column Name | Key | Data Type | Nullable | Description / Constraints |
|---|:---:|---|:---:|---|
| `id` | **PK** | `UUID` | No | Primary key identifier |
| `booking_id` | **FK** | `UUID` | Yes | References `bookings(id)` ON DELETE SET NULL |
| `recipient_email`| | `TEXT` | No | Customer destination address |
| `recipient_name` | | `TEXT` | Yes | Customer name |
| `subject` | | `TEXT` | No | Email subject line |
| `notification_type`| | `TEXT` | No | Template category (`'booking_confirmation'`, `'payment_receipt'`) |
| `status` | | `TEXT` | No | Delivery state (`'sent'`, `'delivered'`, `'failed'`) |
| `sent_at` | | `TIMESTAMPTZ`| Yes | Dispatch completion timestamp |
| `created_at` | | `TIMESTAMPTZ`| No | Dispatch record creation timestamp |

---

## 🔗 Cardinality & Relationship Matrix

| Parent Table (1) | Child Table (N) | Foreign Key Column | Cardinality | Business Rule / Referential Integrity |
|---|---|---|:---:|---|
| `profiles` | `photographer_profiles` | `id` | **1 : 1** | Exactly one specialized profile for each user holding the photographer role. |
| `photographer_profiles` | `photographer_availability` | `photographer_id` | **1 : N** | A photographer manages multiple shift and blackout entries. |
| `profiles` | `admin_activity_logs` | `admin_id` | **1 : N** | An administrator performs many auditable actions (`SET NULL` on deletion). |
| `profiles` | `studio_settings` | `admin_id` | **1 : 1** | An administrator configures and maintains the studio operational parameters and payment QRs. |
| `profiles` | `notifications` | `user_id` | **1 : N** | A user receives multiple system notifications. |
| `service_categories` | `services` | `category_id` | **1 : N** | A category groups multiple package offerings. |
| `service_categories` | `gallery_items` | `category_id` | **1 : N** | A category classifies and groups public portfolio gallery showcase items. |
| `services` | `add_ons` | `service_id` | **1 : N** | A photography service package provides optional add-on offerings (frames, rush edits). |
| `add_ons` | `bookings` | `service_id` | **1 : N** | Optional add-on items are selected and attached to customer booking sessions. |
| `studio_settings` | `bookings` | `studio_id` | **1 : N** | Studio operating hours, venue address, and payment QR configurations govern customer appointments. |
| `profiles` | `bookings` | `customer_id` | **1 : N** | A customer places one or more photography reservations. |
| `services` | `bookings` | `service_id` | **1 : N** | A service package is reserved across many customer bookings. |
| `photographer_profiles` | `bookings` | `photographer_id` | **1 : N** | A photographer is assigned to conduct multiple photo sessions. |
| `bookings` | `payments` | `booking_id` | **1 : N** | A booking can have multiple payment installments (downpayment + balance). |
| `profiles` | `payments` | `recorded_by` | **1 : N** | An admin records and verifies multiple customer payment transactions. |
| `bookings` | `booking_status_history` | `booking_id` | **1 : N** | A booking transitions through multiple timestamped milestones. |
| `profiles` | `booking_status_history` | `changed_by` | **1 : N** | An operator logs milestone transitions across bookings. |
| `bookings` | `qr_scan_logs` | `booking_id` | **1 : N** | A customer's QR pass is scanned at various check-in checkpoints. |
| `profiles` | `qr_scan_logs` | `scanned_by` | **1 : N** | A staff member scans multiple customer QR passes. |
| `bookings` | `photo_outputs` | `booking_id` | **1 : N** | A booking produces multiple high-resolution photo deliverables. |
| `profiles` | `photo_outputs` | `uploaded_by` | **1 : N** | A photographer uploads batches of photo assets. |
| `bookings` | `workstation_transfers` | `booking_id` | **1 : N** | A booking session is routed through multiple studio workstations. |
| `profiles` | `workstation_transfers` | `sender_id` | **1 : N** | An operator routes multiple job tickets. |
| `bookings` | `booking_deliveries` | `booking_id` | **1 : N** | A booking tracks delivery and pickup milestones. |
| `bookings` | `email_logs` | `booking_id` | **1 : N** | A booking generates multiple automated email receipts and passes. |
| `bookings` | `notifications` | `booking_id` | **1 : N** | A booking triggers targeted in-app updates. |


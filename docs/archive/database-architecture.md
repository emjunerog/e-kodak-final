# E-Kodak Photography Service Management System
## Database Architecture Documentation

This document describes the Phase 3 database architecture for the E-Kodak Capstone Project. It is built on Supabase (PostgreSQL) and designed to support role-based access, automated booking workflows, secure payments, and future mobile app/QR integration.

---

## 1. Overview
The architecture is structured around the core `bookings` table, which acts as the central transaction record connecting `profiles` (customers and staff), `services`, `payments`, and `photo_outputs`.

### Architecture Features:
- **Role-Based Access Control (RBAC)** via `profiles.role` and Row Level Security (RLS).
- **Normalized Data**: Services, categories, users, and transactions are cleanly separated.
- **Workflow State Machine**: `bookings.status` and `payments.payment_status` enforce business rules.
- **Auditability**: `booking_status_history` tracks all critical workflow changes.
- **Storage Integration**: Supabase Storage buckets manage customer-uploaded references and studio-uploaded photo outputs securely.

---

## 2. Table Summary

| Table | Purpose |
|---|---|
| `profiles` | App-level user data linked to `auth.users`. Stores role, name, and contact details. |
| `service_categories` | Organizes services into broad groupings (e.g., Portrait, Event). |
| `services` | Photography packages offered by the studio, with base pricing and down payment amounts. |
| `photographer_profiles` | Additional bio and specialization data for photographers. |
| `photographer_availability` | Schedule blocks and availability status for photographers. |
| `bookings` | **Core Transaction.** Links a customer, service, date, and payment status. |
| `booking_status_history` | Audit log of every status change for a booking. |
| `payments` | Records of individual transactions (down payments, final payments) that update the booking balance. |
| `notifications` | In-app alerts for users (e.g., booking confirmed, photos ready). |
| `sms_logs` | Audit trail of sent SMS messages via external providers. |
| `photo_outputs` | Metadata and storage paths for final delivered photos. |

---

## 3. Data Dictionary

### `profiles`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Matches `auth.users.id`. |
| `role` | TEXT | Enforced via CHECK constraint: 'customer', 'admin', 'photographer', 'staff'. |
| `first_name` | TEXT | User's first name. |
| `last_name` | TEXT | User's last name. |
| `middle_name` | TEXT | User's middle name. |
| `phone` | TEXT | Contact number. |
| `address` | TEXT | Home address. |
| `avatar_url` | TEXT | Profile picture URL. |
| `is_active` | BOOLEAN | Account status (default: true). |

### `service_categories`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `name` | TEXT | Unique category name (e.g., 'Graduation'). |
| `description` | TEXT | Category description. |

### `services`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `category_id` | UUID (FK) | References `service_categories.id`. |
| `slug` | TEXT | Unique URL identifier. |
| `name` | TEXT | Package name. |
| `base_price` | NUMERIC | Base numeric price. |
| `down_payment_amount` | NUMERIC | Required down payment amount. |
| `tiers` | JSONB | Legacy/UI-specific pricing tier definitions. |

### `bookings`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `booking_number` | TEXT | Human-readable ID (e.g., BK-2026-00001) via trigger. |
| `booking_token` | UUID | Secure token for future QR generation. |
| `customer_id` | UUID (FK) | References `profiles.id`. |
| `service_id` | UUID (FK) | References `services.id`. |
| `photographer_id` | UUID (FK) | References `photographer_profiles.id`. |
| `event_date` | DATE | Date of the shoot. |
| `status` | TEXT | Enforced via CHECK constraint. |
| `total_amount` | NUMERIC | Total cost of the booking. |
| `down_payment_amount` | NUMERIC | Required down payment. |
| `remaining_balance` | NUMERIC | Auto-calculated remaining balance. |
| `payment_status` | TEXT | 'UNPAID', 'PARTIAL', 'PAID'. |

### `booking_status_history`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `booking_id` | UUID (FK) | References `bookings.id`. |
| `status` | TEXT | The new status applied. |
| `changed_by` | UUID (FK) | References `profiles.id` of the staff/admin. |
| `remarks` | TEXT | Optional context for the change. |

### `payments`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `booking_id` | UUID (FK) | References `bookings.id`. |
| `amount` | NUMERIC | Payment amount (must be > 0). |
| `payment_type` | TEXT | 'DOWN_PAYMENT', 'FINAL_PAYMENT', 'OTHER'. |
| `payment_method` | TEXT | 'CASH', 'BANK_TRANSFER', 'E_WALLET', 'OTHER'. |
| `recorded_by` | UUID (FK) | References `profiles.id` (staff member). |

### `photo_outputs`
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Auto-generated. |
| `booking_id` | UUID (FK) | References `bookings.id`. |
| `file_path` | TEXT | Supabase Storage path. |
| `status` | TEXT | 'UPLOADED', 'EDITING', 'READY', 'RELEASED'. |
| `uploaded_by` | UUID (FK) | References `profiles.id` (photographer/editor). |

---

## 4. Workflows & State Machines

### Booking Lifecycle (`bookings.status`)
1. **PENDING**: Customer submits request.
2. **CONFIRMED**: Staff verifies availability and approves quote.
3. **PHOTOGRAPHER_ASSIGNED**: Photographer linked to booking.
4. **CAPTURE**: Day of the shoot.
5. **EDITING**: Photos are being post-processed.
6. **PRINTING**: Physical outputs being generated (if applicable).
7. **READY**: Outputs are complete but pending final payment.
8. **COMPLETED**: Fully paid and delivered.
9. **REJECTED**: Staff rejects initial request.
10. **CANCELLED**: Booking cancelled by staff/customer.

### Payment Architecture (`payments` -> `bookings`)
The system uses an event-driven calculation for balances.
1. A payment is inserted into `payments`.
2. A PostgreSQL trigger (`trg_update_booking_balance`) automatically fires.
3. The trigger recalculates the total sum of payments for that booking.
4. It updates `bookings.remaining_balance`.
5. It automatically updates `bookings.payment_status` ('UNPAID', 'PARTIAL', 'PAID').

---

## 4. Security & Role-Based Access Control (RBAC)

E-Kodak relies on Supabase Row Level Security (RLS) combined with strict Database Triggers to enforce authorization. We **never** rely solely on the frontend to enforce security.

### 4.1 Strict Trigger Protections (Phase 3.1)
Because PostgreSQL RLS does not natively restrict updates on a per-column basis easily, we enforce column-level immutability using `BEFORE INSERT` and `BEFORE UPDATE` triggers:

- **Profile Protection**: Customers cannot elevate their `role` or `is_active` status. The `trg_enforce_profile_security` trigger blocks these updates unless the actor is a staff or admin.
- **Booking Insert Protection**: When a customer books, `trg_secure_booking_insert` completely ignores client-provided statuses, photographer IDs, and prices. It forces `status = 'PENDING'`, `payment_status = 'UNPAID'`, and calculates prices purely from the server-side `services` table.
- **Booking Immutability**: `trg_secure_booking_update` prevents anyone from modifying `id`, `booking_number`, `booking_token`, or `customer_id` after a booking is created.
- **Notification Immutability**: Customers can only update the `is_read` status of their notifications. Any attempt to modify the `message` or `title` is blocked by `trg_secure_notification_update`.

### 4.2 Row Level Security (RLS) Policies

**1. Customer (Role: `customer`)**
- Can `SELECT` their own profile, bookings, payments, and notifications.
- Can `INSERT` bookings (subject to the strict trigger above).
- Can `UPDATE` their own profile data (first name, address, etc.).
- Can `UPDATE` `is_read` on their notifications.
- Can `SELECT` from `photo_outputs` and the `photo-outputs` storage bucket **ONLY IF** the photo status is `RELEASED`.

**2. Photographer (Role: `photographer`)**
- `bookings.photographer_id` references `photographer_profiles.id`, which is a 1:1 map to `auth.users.id`.
- Photographers can `SELECT` bookings where `photographer_id = auth.uid()`.
- Can `ALL` manage `photo_outputs` assigned to them.
- Cannot view bookings or availability of other photographers.

**3. Staff (Role: `staff`) & Admin (Role: `admin`)**
- Full `ALL` access across `bookings`, `booking_status_history`, `payments`, `photographer_availability`, `sms_logs`, `services`, and `service_categories`.

**4. Public (Unauthenticated)**
- Can `SELECT` active `services`, `service_categories`, and public gallery tables.
- Denied from all `INSERT`, `UPDATE`, and `DELETE` operations.

---

## 6. Future Integrations

### QR Architecture
The `bookings.booking_token` (UUID) is generated automatically upon booking creation. This non-sequential token will be embedded into a QR code. The mobile app will scan this QR, send the token to a secure edge function, and retrieve the booking status without exposing sequential IDs.

### SMS Architecture
The `sms_logs` table acts as a transactional outbox. A database webhook or edge function will listen for specific `booking_status_history` inserts (e.g., status='CONFIRMED') and trigger the third-party SMS API, recording the result in `sms_logs`.

### Realtime Architecture
Supabase Realtime subscriptions will be enabled on `booking_status_history` and `notifications` tables. The React frontend and Expo mobile app will listen to these channels to update the UI instantly when staff progress a booking.

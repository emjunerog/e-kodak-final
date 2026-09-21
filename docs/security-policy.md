# E-Kodak Photography Service Management System — Information Security and Acceptable Use Policy

---

## 1. Title

**E-Kodak Information Security and Acceptable Use Policy**

*Effective Date: September 10, 2026*
*Version: 1.0*

---

## 2. Purpose

This policy establishes rules to protect the E-Kodak Photography Service Management System and its information resources from unauthorized access, misuse, data breaches, and security threats. It defines the acceptable use of all system components — including the web application, customer dashboard, admin panel, photographer module, Supabase database, and cloud storage — to ensure confidentiality, integrity, and availability of customer data, booking records, payment information, and photographic outputs.

---

## 3. Scope

This policy applies to **all individuals** who access or interact with the E-Kodak system, including but not limited to:

- **Customers** — registered users who book photography services, view galleries, and manage their accounts via the customer dashboard (`/dashboard`).
- **Photographers** — assigned staff who manage bookings, upload photo outputs, and set their availability via the photographer module (`/photographer`).
- **Staff** — studio employees who process bookings, record payments, manage customers, and operate the admin panel (`/admin`).
- **Administrators** — system owners with full access to all administrative functions, including user management, security settings, CMS, and service configuration.
- **Third-Party Integrators** — any external services connected to the system (e.g., Google OAuth, Gemini AI assistant, SMS providers).
- **The general public** — unauthenticated visitors who access the public-facing landing pages (Home, Services, Gallery, About, Contact).

This policy covers all system environments: development, staging, and production.

---

## 4. Policy Statements

The following security rules govern the use and operation of the E-Kodak system:

### 4.1 Authentication and Access Control

- All users must authenticate through the designated login portal (`/login`) using either **email/password with OTP verification** or **Google OAuth**.
- Passwords must be maintained as **confidential**. Users must not share login credentials, session tokens, or one-time verification codes with anyone.
- **Role-Based Access Control (RBAC)** is enforced through the `profiles.role` field using PostgreSQL CHECK constraints. Only four roles are permitted: `customer`, `photographer`, `staff`, and `admin`. Users cannot self-elevate their role; the `trg_enforce_profile_security` database trigger blocks unauthorized role changes.
- **Row Level Security (RLS)** is enabled on every database table. Customers can only access their own profiles, bookings, payments, and notifications. Photographers can only view bookings assigned to them. Unauthenticated users are restricted to read-only access of public content (services, gallery, FAQs).
- Multi-factor authentication via **email OTP** is required for all new customer registrations before account access is granted.

### 4.2 Account and Session Security

- Users must not share accounts. Each individual must use their own uniquely registered account.
- Users must **log out** of the system when using shared or public devices to prevent session hijacking.
- User sessions are managed by Supabase Auth and are subject to automatic token expiration and refresh. The system includes a safety timeout (3.5 seconds) to prevent indefinite loading states from stale sessions.
- Administrative and staff accounts (e.g., `admine_kodak@gmail.com`, `staffe_kodak@gmail.com`) follow a separate authentication flow with administrative access verification.

### 4.3 Data Integrity and Immutability

- **Booking data integrity** is enforced server-side. The `trg_secure_booking_insert` trigger ignores client-provided statuses, photographer IDs, and prices during booking creation — forcing `status = 'PENDING'`, `payment_status = 'UNPAID'`, and recalculating prices from the `services` table.
- **Booking immutability** is enforced by the `trg_secure_booking_update` trigger, which prevents modification of `id`, `booking_number`, `booking_token`, and `customer_id` after creation.
- **Notification integrity** is protected by the `trg_secure_notification_update` trigger. Customers can only update the `is_read` field of their notifications; all other fields (`message`, `title`) are immutable.
- **Payment calculations** are automated through the `trg_update_booking_balance` database trigger. The remaining balance and payment status are recalculated server-side every time a payment record is inserted — preventing manual tampering.
- All booking status changes are permanently recorded in the `booking_status_history` audit log, including the `changed_by` user and optional remarks.

### 4.4 Unauthorized Software and Configuration

- Unauthorized software installation, plugins, or browser extensions that tamper with the E-Kodak frontend, intercept API calls, or modify Supabase requests are **strictly prohibited**.
- The `.env` file containing Supabase credentials and API keys must never be committed to version control. The `.gitignore` file must remain configured to exclude `.env` at all times.
- The **Supabase `service_role` key** must never be placed in any `VITE_`-prefixed environment variable or any client-side code. Only the public `anon` key is permitted on the frontend.
- API keys for third-party services (e.g., `VITE_GEMINI_API_KEY`) are treated as **publicly exposed** on the client side and must only be used for local development. In production, all AI requests must be routed through a backend proxy.

### 4.5 Security Incident Reporting

- **Security incidents must be reported immediately** to the system administrator. Incidents include but are not limited to: unauthorized access to accounts, suspicious booking or payment activity, data breaches, leaked API keys, or compromised credentials.
- All staff are obligated to report any observed vulnerabilities, unusual system behavior, or attempted social engineering attacks.
- The `sms_logs` table and `booking_status_history` table serve as audit trails and must be reviewed regularly for anomalous activity.

### 4.6 Confidential Information Handling

- **Confidential information** — including customer personal data (names, phone numbers, addresses), payment records, booking tokens, and photographic outputs — must only be accessed by authorized individuals in the course of their assigned duties.
- Photo outputs in the `photo-outputs` storage bucket are access-controlled: customers can only view photos with a status of `RELEASED`. Unreleased photos (status: `UPLOADED`, `EDITING`, or `READY`) are restricted to the assigned photographer and admin/staff.
- Customer profile data (stored in the `profiles` table) is protected by RLS. Customers can view and update only their own records. Bulk access to customer data is restricted to admin and staff roles.

### 4.7 Secure Storage and Transmission

- All data in transit between the client and Supabase is encrypted using **HTTPS/TLS**.
- Supabase Storage buckets (`avatars`, `photo-outputs`, `reference-photos`) must have proper access policies configured. Public read access should only be enabled where explicitly intended (e.g., avatar URLs).
- The `booking_token` (UUID) used for future QR code integration is a **non-sequential, cryptographically generated** identifier that does not expose booking order or volume information.

---

## 5. Responsibilities

### 5.1 System Administrator (Admin Role)

| Responsibility | Description |
|---|---|
| Monitor systems | Regularly review admin dashboard, security logs, booking status history, and SMS logs for unusual activity. |
| Manage access controls | Assign, modify, and revoke user roles via the admin panel (`/admin/security`). Ensure no unauthorized role escalations occur. |
| Protect credentials | Securely store and rotate Supabase API keys, service role keys, and third-party integrations. Never expose secrets in client-side code. |
| Enforce RLS policies | Verify that all Row Level Security policies are active on every table. Audit new tables or schema changes for RLS compliance. |
| Manage database triggers | Ensure all security triggers (`trg_enforce_profile_security`, `trg_secure_booking_insert`, `trg_secure_booking_update`, `trg_secure_notification_update`, `trg_update_booking_balance`) remain active and unmodified. |
| Incident response | Investigate reported security incidents, deactivate compromised accounts (`is_active = false`), and implement corrective measures. |
| Backup and recovery | Ensure regular database backups are performed and recovery procedures are tested. |

### 5.2 Staff (Staff Role)

| Responsibility | Description |
|---|---|
| Follow security policies | Adhere to all rules outlined in this policy when processing bookings, payments, and managing customers. |
| Protect account credentials | Never share admin panel login credentials or leave sessions unattended. |
| Report incidents | Immediately report any suspected security breaches, unusual booking patterns, or unauthorized access attempts. |
| Handle data responsibly | Access customer personal data and payment records only for legitimate business purposes. |

### 5.3 Photographers (Photographer Role)

| Responsibility | Description |
|---|---|
| Protect account credentials | Maintain confidentiality of their login credentials and ensure proper logout on shared devices. |
| Secure photo outputs | Upload photos only to authorized storage paths and follow the photo lifecycle (`UPLOADED` → `EDITING` → `READY` → `RELEASED`). |
| Respect data boundaries | Access only bookings assigned to them. Do not attempt to access other photographers' bookings or customer data. |

### 5.4 Customers (Customer Role)

| Responsibility | Description |
|---|---|
| Follow security policies | Adhere to the acceptable use terms and this security policy when using the system. |
| Protect account credentials | Keep passwords confidential. Use strong, unique passwords. Complete OTP verification when required. |
| Report suspicious activity | Notify the studio immediately if unauthorized access to their account or bookings is detected. |
| Respect system boundaries | Do not attempt to bypass access controls, tamper with booking data, modify API requests, or access content not intended for their role. |

---

## 6. Enforcement

Violations of this security policy may result in the following actions, applied at the discretion of the system administrator based on the severity and frequency of the violation:

| Severity | Action |
|---|---|
| **Minor Violation** | Verbal or written warning to the user. Examples: leaving sessions active on shared devices, weak password practices. |
| **Moderate Violation** | Temporary account suspension (`is_active = false`) and mandatory security review. Examples: sharing account credentials, accessing data outside assigned role. |
| **Serious Violation** | Permanent account suspension and removal of system access. Examples: deliberate data tampering, unauthorized role escalation attempts, leaking API keys or customer data. |
| **Critical Violation** | Permanent account termination, potential legal action, and notification to affected parties. Examples: data breaches involving customer personal information, payment fraud, malicious exploitation of system vulnerabilities. |

### Enforcement Mechanisms

The E-Kodak system enforces this policy through multiple technical layers:

- **Database Triggers** — `BEFORE INSERT` and `BEFORE UPDATE` triggers automatically block prohibited actions (role escalation, booking data tampering, notification modification) at the PostgreSQL level, regardless of frontend behavior.
- **Row Level Security (RLS)** — PostgreSQL policies enforce data isolation so that users can only access records permitted by their role.
- **Protected Routes** — The React frontend uses `ProtectedRoute`, `AdminProtectedRoute`, and `PhotographerProtectedRoute` wrapper components to gate access to role-specific pages. These are complementary to server-side enforcement.
- **Audit Logging** — The `booking_status_history` table records every status transition, including who made the change and when. The `sms_logs` table tracks all outbound communications.
- **Account Deactivation** — The `is_active` field on the `profiles` table enables immediate revocation of access without deleting user data.

---

*This policy is subject to periodic review and updates as the E-Kodak system evolves. All users will be notified of material changes.*

*Document prepared for: E-Kodak Photography Service Management System — Capstone Project*
*Last updated: September 10, 2026*

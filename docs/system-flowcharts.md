# E-KODAK System Flowcharts (Standardized Connector & Line Routing Notation)

This document presents the complete **23-Flowchart Architecture** for **E-KODAK: Photography Service Management System with Real-Time Tracking**, standardized to follow academic flowcharting conventions and the Professor's Reference Diagram across the **Master Flowchart**, **Three Role Continuation Flowcharts (`A`, `J`, `O`)**, and **19 Use-Case Sub-Flows (`B`–`I`, `K`–`N`, `P`–`V`)**.

> [!NOTE] Studio Operations Flowchart
> For the end-to-end studio operational workflow (from client acquisition and downpayments to photoshoot execution, editing, framing QA, and payment release), see the dedicated **[`Studio Operations Flowchart`](file:///d:/E-kodak%20Final/docs/studio-operations-flowchart.md)**.

---

## 📐 Standardized Notation & Line Routing Conventions

1. **Database Connector `1` (`[Cylinder: Database] <-- [Pentagon: 1]` & Inline `Circle 1`):**
   * The standalone **`Database`** cylinder with its downward-pointing Reference pentagon **`1`** is placed at the top right of `flowchart-master`, near `START`.
   * Every inline database operation across all charts is drawn as a **rectangular process box** keeping its exact text (`Read DB: …` or `Write DB: …`), followed immediately by a small **inline circle `1`** (arrow enters the top of circle `1` and leaves the bottom of circle `1`).
2. **Direct Orthogonal Line Routing (No Extra `2`–`6` Circular Connectors):**
   * All retry loops, lockout paths, and page returns use **direct orthogonal (horizontal and vertical) flowlines** with explicit arrowheads and `Yes`/`No` decision labels—matching the Professor's Reference Diagram where `1` is the sole circular connector (reserved for the Database).
   * In `flowchart-master`:
     * Customer Registration (`Redirect to Login Page`) routes cleanly up the outer-left margin into the vertical flowline above `Display Login Page`.
     * Forgot Password (`Display Password Reset Success`) routes cleanly up the outer-right margin into the vertical flowline above `Display Login Page`.
     * `Display Account Locked (Try Again After 15m)`, `Display Invalid Email or Password Error`, and both `Write DB: auth.users (Temp Lockout 15m)` (`Circle 1`) paths route cleanly via dedicated non-crossing vertical channels into the flowline above `Enter Email & Password`.
     * `Display Invalid/Expired OTP Error & Retry` routes cleanly into the flowline above `Enter OTP Code (or Select Resend OTP)`.
3. **Off-Page Pentagon Connectors (`A`–`V`):**
   * **Role Dashboard Header Pentagons (`A`, `J`, `O`):** At the bottom of `flowchart-master`, `Authenticate Session & Route by Role` branches into `Display Customer Dashboard` → **`Pentagon A`**, `Display Photographer Dashboard` → **`Pentagon J`**, and `Display Admin Dashboard` → **`Pentagon O`**, which match the top entry pentagons on `flowchart-role-customer`, `flowchart-role-photographer`, and `flowchart-role-admin`.
   * **Use-Case Sub-Flow Pentagons (`B`–`I`, `K`–`N`, `P`–`V`):** Exit beside each dashboard function box (or handoff box) and match the top entry pentagon of `flowchart-B` through `flowchart-V`. Every sub-flow ends at its parent Role Dashboard Return Pentagon (`A` for `B`–`I`, `J` for `K`–`N`, and `O` for `P`–`V`).

---

## 🗄️ Complete 23-Chart Index (`A`–`V` and `1`)

| Chart | Header / Entry | Inline DB `Circle 1` Count | Off-Page Exit / Return Pentagons |
| :--- | :---: | :---: | :--- |
| **`flowchart-master`** | `START` | **6** (+ Top-Right `Database <-- Pentagon 1`) | Exits: `A`, `J`, `O` |
| **`flowchart-role-customer`** | **`A`** | **0** | Exits: `B`–`I`; Return: `A` |
| **`flowchart-B`** | **`B`** | **1** | Handoff: `D`; Return: `A` |
| **`flowchart-C`** | **`C`** | **1** | Handoff: `D`; Return: `A` |
| **`flowchart-D`** | **`D`** | **2** | Handoff: `E`; Return: `A` |
| **`flowchart-E`** | **`E`** | **4** | Handoff: `F`; Return: `A` |
| **`flowchart-F`** | **`F`** | **2** | Handoff: `G`; Return: `A` |
| **`flowchart-G`** | **`G`** | **2** | Handoff: `H`; Return: `A` |
| **`flowchart-H`** | **`H`** | **1** | Handoff: `E`; Return: `A` |
| **`flowchart-I`** | **`I`** | **1** | Return: `A` |
| **`flowchart-role-photographer`** | **`J`** | **0** | Exits: `K`–`N`; Return: `J` |
| **`flowchart-K`** | **`K`** | **3** | Return: `J` |
| **`flowchart-L`** | **`L`** | **4** | Handoff: `M`; Return: `J` |
| **`flowchart-M`** | **`M`** | **2** | Handoff: `N`; Return: `J` |
| **`flowchart-N`** | **`N`** | **5** | Return: `J` |
| **`flowchart-role-admin`** | **`O`** | **0** | Exits: `P`–`V`; Return: `O` |
| **`flowchart-P`** | **`P`** | **4** | Return: `O` |
| **`flowchart-Q`** | **`Q`** | **5** | Return: `O` |
| **`flowchart-R`** | **`R`** | **3** | Return: `O` |
| **`flowchart-S`** | **`S`** | **3** | Return: `O` |
| **`flowchart-T`** | **`T`** | **2** | Handoff: `U`; Return: `O` |
| **`flowchart-U`** | **`U`** | **4** | Return: `O` |
| **`flowchart-V`** | **`V`** | **5** | Return: `O` |

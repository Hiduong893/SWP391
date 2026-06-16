USE master;
GO

CREATE DATABASE CarRentalPlatform
    COLLATE Vietnamese_CI_AS;
GO
 
USE CarRentalPlatform;
GO

-- ============================================================
-- SECTION 1: AUTHENTICATION & USER MANAGEMENT
-- UC01: Register | UC02: Login | UC03: Logout
-- UC04: KYC | UC05: Change Password | UC06: Forgot Password
-- UC26: User List (Admin) | UC30: Role Management (Admin)
-- ============================================================

-- 1.1 Role table -- separates role definitions from users (SRP)
CREATE TABLE Role (
    role_id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50)  NOT NULL UNIQUE,   -- Guest | Renter | CarOwner | Admin | CustomerService
    description NVARCHAR(200),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- 1.2 Main user table -- stores credentials and profile only
CREATE TABLE [User] (
    user_id          INT           IDENTITY(1,1) PRIMARY KEY,
    email            NVARCHAR(255) NOT NULL UNIQUE,
    password_hash    NVARCHAR(500) NULL,           -- NULL when using Google OAuth
    full_name        NVARCHAR(200) NOT NULL,
    phone            NVARCHAR(20)  NULL,
    avatar_url       NVARCHAR(500) NULL,
    google_id        NVARCHAR(200) NULL UNIQUE,    -- UC02: Google login
    date_of_birth    DATE          NULL,
    gender           NVARCHAR(10)  NULL,           -- Male | Female | Other
    is_active        BIT           NOT NULL DEFAULT 1,
    is_email_verified BIT          NOT NULL DEFAULT 0,
    created_at       DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- 1.3 UserRole (UC30: Role Assignment)
CREATE TABLE UserRole (
    user_role_id INT       IDENTITY(1,1) PRIMARY KEY,
    user_id      INT       NOT NULL,
    role_id      INT       NOT NULL,
    assigned_by  INT       NULL,   -- Admin who assigned
    assigned_at  DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_UserRole_User     FOREIGN KEY (user_id)     REFERENCES [User](user_id),
    CONSTRAINT FK_UserRole_Role     FOREIGN KEY (role_id)     REFERENCES Role(role_id),
    CONSTRAINT FK_UserRole_Assigner FOREIGN KEY (assigned_by) REFERENCES [User](user_id),
    CONSTRAINT UQ_UserRole          UNIQUE (user_id, role_id)
);
 
-- 1.4 OTPVerification -- UC06: Forgot Password / Email Verification
-- Isolated table to avoid polluting the User table with transient data
CREATE TABLE OTPVerification (
    otp_id      INT           IDENTITY(1,1) PRIMARY KEY,
    user_id     INT           NOT NULL,
    otp_code    NVARCHAR(10)  NOT NULL,
    otp_type    NVARCHAR(30)  NOT NULL,  -- ForgotPassword | EmailVerify
    is_used     BIT           NOT NULL DEFAULT 0,
    expires_at  DATETIME2     NOT NULL,
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_OTP_User FOREIGN KEY (user_id) REFERENCES [User](user_id)
);

-- 1.5 Xác thực KYC -- UC04: Identity Verification | UC31: CS verifies accounts
-- Separate table because a user can have multiple documents
CREATE TABLE KYC (
    kyc_id           INT           IDENTITY(1,1) PRIMARY KEY,
    user_id          INT           NOT NULL,
    document_type    NVARCHAR(50)  NOT NULL,    -- NationalID | DriverLicense | VehicleRegistration
    document_number  NVARCHAR(100) NOT NULL,
    full_name_on_doc NVARCHAR(200) NULL,
    date_of_birth_on_doc DATE      NULL,
    front_image_url  NVARCHAR(500) NOT NULL,
    back_image_url   NVARCHAR(500) NULL,
    status           NVARCHAR(20)  NOT NULL DEFAULT 'Pending',  -- Pending | Approved | Rejected
    reviewer_id      INT           NULL,        -- CustomerService who reviewed
    review_note      NVARCHAR(500) NULL,
    submitted_at     DATETIME2     NOT NULL DEFAULT GETDATE(),
    reviewed_at      DATETIME2     NULL,
    CONSTRAINT FK_KYC_User     FOREIGN KEY (user_id)     REFERENCES [User](user_id),
    CONSTRAINT FK_KYC_Reviewer FOREIGN KEY (reviewer_id) REFERENCES [User](user_id),
    CONSTRAINT CHK_KYC_Status  CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

-- ============================================================
-- SECTION 2: VEHICLE MANAGEMENT
-- UC08: View Vehicles | UC09: Search & Filter
-- UC10: View Vehicle Detail | UC21: Manage Vehicles (Owner)
-- UC25: Owner vehicle list | UC27: Admin vehicle moderation
-- ============================================================
 
-- 2.1 Brand -- normalized car brand data
CREATE TABLE Brand (
    brand_id   INT           IDENTITY(1,1) PRIMARY KEY,
    brand_name NVARCHAR(100) NOT NULL UNIQUE,   -- Toyota | Hyundai | Kia | Honda | Mazda | ...
    logo_url   NVARCHAR(500) NULL,
    is_active  BIT           NOT NULL DEFAULT 1
);
 
-- 2.2 VehicleCategory -- normalized vehicle type data
CREATE TABLE VehicleCategory (
    category_id   INT           IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL UNIQUE,  -- Sedan | SUV | Hatchback | Crossover
    description   NVARCHAR(500) NULL,
    is_active     BIT           NOT NULL DEFAULT 1
);

-- 2.3 Vehicle -- core vehicle table
CREATE TABLE Vehicle (
    vehicle_id          INT            IDENTITY(1,1) PRIMARY KEY,
    owner_id            INT            NOT NULL,
    brand_id            INT            NOT NULL,
    category_id         INT            NOT NULL,
    model_name          NVARCHAR(100)  NOT NULL,
    license_plate       NVARCHAR(20)   NOT NULL UNIQUE,
    year_of_manufacture INT            NOT NULL,
    color               NVARCHAR(50)   NULL,
    seat_count          INT            NOT NULL,
    description         NVARCHAR(2000) NULL,
    daily_price         DECIMAL(18,2)  NOT NULL,
    hourly_price        DECIMAL(18,2)  NULL,
    deposit_amount      DECIMAL(18,2)  NOT NULL,           -- Required deposit (tiền cọc)
    location_address    NVARCHAR(500)  NULL,
    latitude            DECIMAL(10,7)  NULL,
    longitude           DECIMAL(10,7)  NULL,
    -- Status lifecycle: Pending → Available | Rejected
    --                   Available → Rented | Maintenance | Inactive
    status              NVARCHAR(30)   NOT NULL DEFAULT 'Pending',
    rejection_reason    NVARCHAR(500)  NULL,               -- UC27: Admin rejects vehicle
    is_active           BIT            NOT NULL DEFAULT 1,
    approved_by         INT            NULL,               -- Admin who approved
    approved_at         DATETIME2      NULL,
    created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Vehicle_Owner    FOREIGN KEY (owner_id)    REFERENCES [User](user_id),
    CONSTRAINT FK_Vehicle_Brand    FOREIGN KEY (brand_id)    REFERENCES Brand(brand_id),
    CONSTRAINT FK_Vehicle_Category FOREIGN KEY (category_id) REFERENCES VehicleCategory(category_id),
    CONSTRAINT FK_Vehicle_Approver FOREIGN KEY (approved_by) REFERENCES [User](user_id),
    CONSTRAINT CHK_Vehicle_Status  CHECK (status IN ('Pending','Available','Rented','Maintenance','Rejected','Inactive')),
    CONSTRAINT CHK_Vehicle_Price   CHECK (daily_price > 0),
    CONSTRAINT CHK_Vehicle_Deposit CHECK (deposit_amount >= 0),
    CONSTRAINT CHK_Vehicle_Seats   CHECK (seat_count > 0)
);
 
 -- 2.4 VehicleImage -- 1:N with Vehicle, avoids multi-value column
CREATE TABLE VehicleImage (
    image_id   INT           IDENTITY(1,1) PRIMARY KEY,
    vehicle_id INT           NOT NULL,
    image_url  NVARCHAR(500) NOT NULL,
    is_primary BIT           NOT NULL DEFAULT 0,
    sort_order INT           NOT NULL DEFAULT 0,
    uploaded_at DATETIME2   NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_VehicleImage_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);

-- 2.5 VehicleDocument -- Legal papers for vehicle (giấy tờ xe)
CREATE TABLE VehicleDocument (
    doc_id        INT           IDENTITY(1,1) PRIMARY KEY,
    vehicle_id    INT           NOT NULL,
    document_type NVARCHAR(50)  NOT NULL,   -- Registration | Insurance | TechnicalInspection
    document_url  NVARCHAR(500) NOT NULL,
    expiry_date   DATE          NULL,
    uploaded_at   DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_VehicleDoc_Vehicle FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);
 
-- 2.6 VehicleFeature -- Amenities (GPS, Dash cam, Baby seat, ...) -- normalized M:N
CREATE TABLE Feature (
    feature_id   INT           IDENTITY(1,1) PRIMARY KEY,
    feature_name NVARCHAR(100) NOT NULL UNIQUE,
    icon_url     NVARCHAR(300) NULL
);
 
CREATE TABLE VehicleFeature (
    vehicle_id INT NOT NULL,
    feature_id INT NOT NULL,
    CONSTRAINT PK_VehicleFeature      PRIMARY KEY (vehicle_id, feature_id),
    CONSTRAINT FK_VehicleFeature_V    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    CONSTRAINT FK_VehicleFeature_F    FOREIGN KEY (feature_id) REFERENCES Feature(feature_id)
);


-- ============================================================
-- SECTION 3: BOOKING & HANDOVER
-- UC13: Book Vehicle | UC15: Track Booking | UC18: Handover
-- UC20: Cancel Booking | UC22: Owner Approve/Reject
-- ============================================================
 
-- 3.1 Booking -- central entity linking Renter ↔ Vehicle
CREATE TABLE Booking (
    booking_id          INT            IDENTITY(1,1) PRIMARY KEY,
    renter_id           INT            NOT NULL,
    vehicle_id          INT            NOT NULL,
    start_datetime      DATETIME2      NOT NULL,
    end_datetime        DATETIME2      NOT NULL,
    pickup_address      NVARCHAR(500)  NULL,
    return_address      NVARCHAR(500)  NULL,
    rental_price        DECIMAL(18,2)  NOT NULL,   -- Base rental fee
    deposit_amount      DECIMAL(18,2)  NOT NULL,   -- Deposit locked during rental
    platform_fee        DECIMAL(18,2)  NOT NULL DEFAULT 0,  -- Platform service fee
    discount_amount     DECIMAL(18,2)  NOT NULL DEFAULT 0,
    total_amount        DECIMAL(18,2)  NOT NULL,   -- = rental_price + deposit - discount + platform_fee
    -- Status lifecycle:
    -- Pending → Approved | Rejected (UC22: Owner decision)
    -- Approved → Active (UC18: Pickup confirmed)
    -- Active → Completed (UC18: Return confirmed)
    -- Any state → Cancelled (UC20)
    -- Any state → Disputed
    status              NVARCHAR(30)   NOT NULL DEFAULT 'Pending',
    owner_note          NVARCHAR(500)  NULL,        -- Owner's response note (approve/reject)
    cancellation_reason NVARCHAR(500)  NULL,
    cancelled_by        INT            NULL,        -- user_id who cancelled
    cancelled_at        DATETIME2      NULL,
    created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Booking_Renter    FOREIGN KEY (renter_id)   REFERENCES [User](user_id),
    CONSTRAINT FK_Booking_Vehicle   FOREIGN KEY (vehicle_id)  REFERENCES Vehicle(vehicle_id),
    CONSTRAINT FK_Booking_Canceller FOREIGN KEY (cancelled_by) REFERENCES [User](user_id),
    CONSTRAINT CHK_Booking_Dates    CHECK (end_datetime > start_datetime),
    CONSTRAINT CHK_Booking_Status   CHECK (status IN ('Pending','Approved','Rejected','Active','Completed','Cancelled','Disputed'))
);

-- 3.2 BookingHandover -- UC18: Electronic handover record (biên bản bàn giao điện tử)
-- Split into Pickup and Return so each can be confirmed independently
CREATE TABLE BookingHandover (
    handover_id          INT            IDENTITY(1,1) PRIMARY KEY,
    booking_id           INT            NOT NULL,
    handover_type        NVARCHAR(10)   NOT NULL,   -- Pickup | Return
    fuel_level           NVARCHAR(20)   NULL,        -- Full | 3/4 | 1/2 | 1/4 | Empty
    odometer_km          INT            NULL,
    vehicle_condition    NVARCHAR(1000) NULL,        -- Free-text condition notes
    confirmed_by_renter  BIT            NOT NULL DEFAULT 0,
    confirmed_by_owner   BIT            NOT NULL DEFAULT 0,
    renter_confirmed_at  DATETIME2      NULL,
    owner_confirmed_at   DATETIME2      NULL,
    handover_time        DATETIME2      NULL,        -- Actual time of handover
    created_at           DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Handover_Booking  FOREIGN KEY (booking_id)  REFERENCES Booking(booking_id),
    CONSTRAINT CHK_Handover_Type    CHECK (handover_type IN ('Pickup', 'Return')),
    CONSTRAINT UQ_Handover_Booking  UNIQUE (booking_id, handover_type)
);
 
-- 3.3 HandoverImage -- Photos taken during Pickup/Return
CREATE TABLE HandoverImage (
    image_id    INT           IDENTITY(1,1) PRIMARY KEY,
    handover_id INT           NOT NULL,
    image_url   NVARCHAR(500) NOT NULL,
    uploaded_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_HandoverImage_Handover FOREIGN KEY (handover_id) REFERENCES BookingHandover(handover_id)
);
 
 
-- ============================================================
-- SECTION 4: PAYMENT & WALLET
-- UC14: Payment & Deposit | UC19: View Wallet & History
-- UC24: Link Bank Account | UC28: Admin manage transactions
-- ============================================================
 
-- 4.1 Payment -- records each financial transaction with VNPAY
CREATE TABLE Payment (
    payment_id       INT            IDENTITY(1,1) PRIMARY KEY,
    booking_id       INT            NOT NULL,
    payer_id         INT            NOT NULL,
    amount           DECIMAL(18,2)  NOT NULL,
    payment_type     NVARCHAR(30)   NOT NULL,   -- RentalFee | Deposit | Refund | Compensation | PlatformFee
    payment_method   NVARCHAR(30)   NOT NULL,   -- VNPay | Wallet | BankTransfer
    transaction_code NVARCHAR(200)  NULL,        -- VNPAY reference code
    -- Gateway stores raw response for audit trail and dispute resolution
    gateway_response NVARCHAR(MAX)  NULL,
    status           NVARCHAR(20)   NOT NULL DEFAULT 'Pending',  -- Pending | Success | Failed | Refunded
    note             NVARCHAR(500)  NULL,
    paid_at          DATETIME2      NULL,
    created_at       DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Payment_Booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id),
    CONSTRAINT FK_Payment_Payer   FOREIGN KEY (payer_id)   REFERENCES [User](user_id),
    CONSTRAINT CHK_Payment_Amount CHECK (amount > 0),
    CONSTRAINT CHK_Payment_Status CHECK (status IN ('Pending', 'Success', 'Failed', 'Refunded'))
);
 
-- 4.2 Wallet -- UC19, UC24: One wallet per user
CREATE TABLE Wallet (
    wallet_id           INT            IDENTITY(1,1) PRIMARY KEY,
    user_id             INT            NOT NULL UNIQUE,
    balance             DECIMAL(18,2)  NOT NULL DEFAULT 0,
    bank_account_number NVARCHAR(30)   NULL,
    bank_name           NVARCHAR(100)  NULL,
    bank_branch         NVARCHAR(200)  NULL,
    is_bank_verified    BIT            NOT NULL DEFAULT 0,
    created_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Wallet_User    FOREIGN KEY (user_id) REFERENCES [User](user_id),
    CONSTRAINT CHK_Wallet_Balance CHECK (balance >= 0)
);
 
-- 4.3 WalletTransaction -- Full ledger history (append-only, never updated)
-- balance_before/after ensures full auditability without recalculating
CREATE TABLE WalletTransaction (
    txn_id           INT            IDENTITY(1,1) PRIMARY KEY,
    wallet_id        INT            NOT NULL,
    booking_id       INT            NULL,         -- NULL for top-up / withdrawal
    amount           DECIMAL(18,2)  NOT NULL,
    -- Credit = money IN (Refund, Income, TopUp)
    -- Debit  = money OUT (BookingPayment, Withdrawal)
    txn_type         NVARCHAR(30)   NOT NULL,     -- TopUp | Withdrawal | BookingPayment | Refund | Income | CompensationPaid
    balance_before   DECIMAL(18,2)  NOT NULL,
    balance_after    DECIMAL(18,2)  NOT NULL,
    description      NVARCHAR(500)  NULL,
    reference_code   NVARCHAR(200)  NULL,         -- External ref (VNPAY, bank)
    created_at       DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_WalletTxn_Wallet  FOREIGN KEY (wallet_id)  REFERENCES Wallet(wallet_id),
    CONSTRAINT FK_WalletTxn_Booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id)
);
 
 
 -- ============================================================
-- SECTION 5: REVIEWS
-- UC12: View Reviews (Guest) | UC16: Rate Service (Renter)
-- UC33: Manage Reviews (CustomerService)
-- ============================================================
 
-- 5.1 Review -- 1 Booking = max 1 Review (UNIQUE constraint enforces this)
CREATE TABLE Review (
    review_id      INT            IDENTITY(1,1) PRIMARY KEY,
    booking_id     INT            NOT NULL UNIQUE,  -- One review per trip
    reviewer_id    INT            NOT NULL,          -- Renter
    vehicle_id     INT            NOT NULL,
    owner_id       INT            NOT NULL,
    rating_vehicle INT            NOT NULL,          -- 1 to 5 stars
    rating_owner   INT            NOT NULL,          -- 1 to 5 stars
    comment        NVARCHAR(2000) NULL,
    -- Moderation fields (UC33: CS can hide inappropriate reviews)
    is_visible     BIT            NOT NULL DEFAULT 1,
    hidden_reason  NVARCHAR(500)  NULL,
    hidden_by      INT            NULL,              -- CustomerService user_id
    hidden_at      DATETIME2      NULL,
    created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Review_Booking   FOREIGN KEY (booking_id)  REFERENCES Booking(booking_id),
    CONSTRAINT FK_Review_Reviewer  FOREIGN KEY (reviewer_id) REFERENCES [User](user_id),
    CONSTRAINT FK_Review_Vehicle   FOREIGN KEY (vehicle_id)  REFERENCES Vehicle(vehicle_id),
    CONSTRAINT FK_Review_Owner     FOREIGN KEY (owner_id)    REFERENCES [User](user_id),
    CONSTRAINT FK_Review_HiddenBy  FOREIGN KEY (hidden_by)   REFERENCES [User](user_id),
    CONSTRAINT CHK_Review_RatingV  CHECK (rating_vehicle BETWEEN 1 AND 5),
    CONSTRAINT CHK_Review_RatingO  CHECK (rating_owner BETWEEN 1 AND 5)
);
 
 
-- ============================================================
-- SECTION 6: SUPPORT & COMPLAINTS
-- UC07: Contact CS | UC17: Report Incident
-- UC32: Handle Support Ticket | UC34: Handle Complaint
-- UC35: CS Statistics Report
-- ============================================================
 
-- 6.1 Incident -- UC17: Renter reports accident / breakdown
CREATE TABLE Incident (
    incident_id      INT            IDENTITY(1,1) PRIMARY KEY,
    booking_id       INT            NOT NULL,
    reporter_id      INT            NOT NULL,        -- Renter
    title            NVARCHAR(200)  NOT NULL,
    description      NVARCHAR(2000) NOT NULL,
    incident_type    NVARCHAR(50)   NOT NULL,        -- Accident | Breakdown | TrafficViolation | Other
    severity         NVARCHAR(20)   NOT NULL DEFAULT 'Medium',  -- Low | Medium | High | Critical
    status           NVARCHAR(30)   NOT NULL DEFAULT 'Open',    -- Open | InProgress | Resolved | Closed
    assigned_to      INT            NULL,             -- CustomerService user_id
    resolution_note  NVARCHAR(1000) NULL,
    resolved_at      DATETIME2      NULL,
    created_at       DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at       DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Incident_Booking  FOREIGN KEY (booking_id)   REFERENCES Booking(booking_id),
    CONSTRAINT FK_Incident_Reporter FOREIGN KEY (reporter_id)  REFERENCES [User](user_id),
    CONSTRAINT FK_Incident_Assignee FOREIGN KEY (assigned_to)  REFERENCES [User](user_id),
    CONSTRAINT CHK_Incident_Severity CHECK (severity IN ('Low','Medium','High','Critical')),
    CONSTRAINT CHK_Incident_Status   CHECK (status IN ('Open','InProgress','Resolved','Closed'))
);
 
-- 6.2 IncidentImage -- Evidence photos for incident reports
CREATE TABLE IncidentImage (
    image_id    INT           IDENTITY(1,1) PRIMARY KEY,
    incident_id INT           NOT NULL,
    image_url   NVARCHAR(500) NOT NULL,
    uploaded_at DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_IncidentImage_Incident FOREIGN KEY (incident_id) REFERENCES Incident(incident_id)
);
 
-- 6.3 Complaint -- UC34: Dispute between Renter and CarOwner
CREATE TABLE Complaint (
    complaint_id    INT            IDENTITY(1,1) PRIMARY KEY,
    booking_id      INT            NOT NULL,
    complainant_id  INT            NOT NULL,   -- Person filing the complaint
    defendant_id    INT            NOT NULL,   -- Person being complained about
    title           NVARCHAR(200)  NOT NULL,
    description     NVARCHAR(2000) NOT NULL,
    status          NVARCHAR(30)   NOT NULL DEFAULT 'Open',   -- Open | UnderReview | Resolved | Closed
    assigned_to     INT            NULL,        -- CustomerService user_id
    resolution      NVARCHAR(1000) NULL,
    resolved_at     DATETIME2      NULL,
    created_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Complaint_Booking     FOREIGN KEY (booking_id)     REFERENCES Booking(booking_id),
    CONSTRAINT FK_Complaint_Complainant FOREIGN KEY (complainant_id) REFERENCES [User](user_id),
    CONSTRAINT FK_Complaint_Defendant   FOREIGN KEY (defendant_id)   REFERENCES [User](user_id),
    CONSTRAINT FK_Complaint_Assignee    FOREIGN KEY (assigned_to)    REFERENCES [User](user_id),
    CONSTRAINT CHK_Complaint_Status     CHECK (status IN ('Open','UnderReview','Resolved','Closed'))
);
 
-- 6.4 ComplaintEvidence -- Evidence files for complaint (separate to avoid multi-value column)
CREATE TABLE ComplaintEvidence (
    evidence_id  INT           IDENTITY(1,1) PRIMARY KEY,
    complaint_id INT           NOT NULL,
    file_url     NVARCHAR(500) NOT NULL,
    file_type    NVARCHAR(20)  NULL,   -- Image | Video | Document
    uploaded_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Evidence_Complaint FOREIGN KEY (complaint_id) REFERENCES Complaint(complaint_id)
);
 
-- 6.5 SupportTicket -- UC07, UC32: User contacts CS
CREATE TABLE SupportTicket (
    ticket_id   INT            IDENTITY(1,1) PRIMARY KEY,
    user_id     INT            NOT NULL,
    assigned_to INT            NULL,    -- CustomerService user_id
    subject     NVARCHAR(200)  NOT NULL,
    status      NVARCHAR(20)   NOT NULL DEFAULT 'Open',     -- Open | InProgress | Resolved | Closed
    priority    NVARCHAR(20)   NOT NULL DEFAULT 'Normal',   -- Low | Normal | High | Urgent
    resolved_at DATETIME2      NULL,
    created_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Ticket_User     FOREIGN KEY (user_id)     REFERENCES [User](user_id),
    CONSTRAINT FK_Ticket_Assignee FOREIGN KEY (assigned_to) REFERENCES [User](user_id),
    CONSTRAINT CHK_Ticket_Status  CHECK (status IN ('Open','InProgress','Resolved','Closed')),
    CONSTRAINT CHK_Ticket_Priority CHECK (priority IN ('Low','Normal','High','Urgent'))
);
 
-- 6.6 TicketMessage -- Conversation thread within a support ticket
CREATE TABLE TicketMessage (
    message_id INT            IDENTITY(1,1) PRIMARY KEY,
    ticket_id  INT            NOT NULL,
    sender_id  INT            NOT NULL,
    message    NVARCHAR(2000) NOT NULL,
    sent_at    DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_TicketMsg_Ticket FOREIGN KEY (ticket_id) REFERENCES SupportTicket(ticket_id),
    CONSTRAINT FK_TicketMsg_Sender FOREIGN KEY (sender_id) REFERENCES [User](user_id)
);
 
 
 -- ============================================================
-- SECTION 7: SYSTEM MANAGEMENT
-- UC11: View Policy | UC29: Manage System (Admin)
-- ============================================================
 
-- 7.1 Notification -- UC29: System sends notifications to users
CREATE TABLE Notification (
    notification_id   INT            IDENTITY(1,1) PRIMARY KEY,
    user_id           INT            NOT NULL,
    title             NVARCHAR(200)  NOT NULL,
    message           NVARCHAR(1000) NOT NULL,
    notification_type NVARCHAR(50)   NULL,   -- BookingUpdate | PaymentAlert | SystemAlert | KYCResult | ReviewReminder
    -- Polymorphic reference: reference_type tells us which table reference_id points to
    reference_id      INT            NULL,   -- booking_id | incident_id | etc.
    reference_type    NVARCHAR(50)   NULL,   -- Booking | Incident | Payment | KYC
    is_read           BIT            NOT NULL DEFAULT 0,
    created_at        DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Notification_User FOREIGN KEY (user_id) REFERENCES [User](user_id)
);
 
-- 7.2 Policy -- UC11: Platform policies (Terms, Insurance, Cancellation)
CREATE TABLE Policy (
    policy_id      INT            IDENTITY(1,1) PRIMARY KEY,
    policy_type    NVARCHAR(50)   NOT NULL,  -- RentalTerms | Insurance | CancellationFee | PlatformFee | GeneralGuideline
    title          NVARCHAR(200)  NOT NULL,
    content        NVARCHAR(MAX)  NOT NULL,
    is_active      BIT            NOT NULL DEFAULT 1,
    effective_date DATE           NULL,
    created_by     INT            NULL,   -- Admin user_id
    created_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at     DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Policy_Creator FOREIGN KEY (created_by) REFERENCES [User](user_id)
);
 
-- 7.3 SystemConfig -- UC29: Key-value config for admin (pricing, fees, ...)
-- Using key-value for flexibility -- avoids schema changes for new settings
CREATE TABLE SystemConfig (
    config_id    INT            IDENTITY(1,1) PRIMARY KEY,
    config_key   NVARCHAR(100)  NOT NULL UNIQUE,   -- e.g., PLATFORM_FEE_PERCENT, MAX_CANCEL_HOURS
    config_value NVARCHAR(1000) NOT NULL,
    data_type    NVARCHAR(20)   NOT NULL DEFAULT 'String',  -- String | Number | Boolean | JSON
    description  NVARCHAR(500)  NULL,
    updated_by   INT            NULL,   -- Admin user_id
    updated_at   DATETIME2      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Config_UpdatedBy FOREIGN KEY (updated_by) REFERENCES [User](user_id)
);
 
-- NOTE: Platform supports all vehicle types (gasoline, diesel, hybrid).
-- No EV-specific tables included in this schema.
 
 
-- ============================================================
-- SECTION 8: INDEXES
-- Reason: Index on FK columns used in JOINs and WHERE clauses
-- to avoid full table scans on large tables
-- ============================================================
 
-- User lookups (UC02: Login by email, Google ID)
CREATE INDEX IX_User_Email    ON [User](email);
CREATE INDEX IX_User_GoogleId ON [User](google_id) WHERE google_id IS NOT NULL;
 
-- UserRole: look up all roles for a user
CREATE INDEX IX_UserRole_UserId ON UserRole(user_id);
 
-- KYC: filter by user and status (UC31: CS reviews pending KYC)
CREATE INDEX IX_KYC_UserId ON KYC(user_id);
CREATE INDEX IX_KYC_Status ON KYC(status);
 
-- Vehicle search & filter (UC09: Search by multiple criteria)
CREATE INDEX IX_Vehicle_OwnerId   ON Vehicle(owner_id);
CREATE INDEX IX_Vehicle_Status    ON Vehicle(status);
CREATE INDEX IX_Vehicle_BrandId   ON Vehicle(brand_id);
CREATE INDEX IX_Vehicle_CategoryId ON Vehicle(category_id);
CREATE INDEX IX_Vehicle_DailyPrice ON Vehicle(daily_price);
 
-- Booking: most queries filter by renter, vehicle, or status
CREATE INDEX IX_Booking_RenterId  ON Booking(renter_id);
CREATE INDEX IX_Booking_VehicleId ON Booking(vehicle_id);
CREATE INDEX IX_Booking_Status    ON Booking(status);
-- Composite index for date range availability check (UC13: Check vehicle availability)
CREATE INDEX IX_Booking_VehicleDateRange
    ON Booking(vehicle_id, start_datetime, end_datetime)
    WHERE status IN ('Pending', 'Approved', 'Active', 'Completed', 'Disputed');
 
-- Payment: filter by booking and payer (UC28: Admin monitors transactions)
CREATE INDEX IX_Payment_BookingId ON Payment(booking_id);
CREATE INDEX IX_Payment_PayerId   ON Payment(payer_id);
CREATE INDEX IX_Payment_Status    ON Payment(status);
 
-- WalletTransaction: paginated history query (UC19: View wallet history)
CREATE INDEX IX_WalletTxn_WalletId  ON WalletTransaction(wallet_id, created_at DESC);
 
-- Notification: unread notifications per user
CREATE INDEX IX_Notification_UserId ON Notification(user_id, is_read, created_at DESC);
 
-- Review: aggregate rating per vehicle and owner (UC12, UC23: Revenue/rating reports)
CREATE INDEX IX_Review_VehicleId ON Review(vehicle_id) WHERE is_visible = 1;
CREATE INDEX IX_Review_OwnerId   ON Review(owner_id)   WHERE is_visible = 1;
 
-- Support: CS dashboard queries (UC32, UC34, UC35)
CREATE INDEX IX_Ticket_Status     ON SupportTicket(status, assigned_to);
CREATE INDEX IX_Complaint_Status  ON Complaint(status, assigned_to);
CREATE INDEX IX_Incident_Status   ON Incident(status, assigned_to);
 
 
-- ============================================================
-- SECTION 9: SEED DATA
-- ============================================================
 
-- 9.1 Insert Roles
INSERT INTO Role (role_name, description) VALUES
    ('Guest',           N'Chưa đăng nhập. Xem danh sách xe, bảng giá, chính sách nền tảng.'),
    ('Renter',          N'Khách hàng. Đặt xe, thanh toán, đánh giá dịch vụ.'),
    ('CarOwner',        N'Chủ xe. Đăng ký phương tiện, xác nhận lịch thuê, xem doanh thu.'),
    ('Admin',           N'Quản trị viên. Quản lý toàn hệ thống.'),
    ('CustomerService', N'Chăm sóc khách hàng. Xác thực KYC, hỗ trợ sự cố, giải quyết khiếu nại.');
 
-- 9.2 Insert Brands
INSERT INTO Brand (brand_name) VALUES
    (N'VinFast'), (N'Toyota'), (N'Hyundai'), (N'Kia'),
    (N'Honda'), (N'Mazda'), (N'Ford'), (N'Mitsubishi'),
    (N'Suzuki'), (N'Nissan'), (N'Mercedes-Benz'), (N'BMW');
 
-- 9.3 Insert Vehicle Categories
INSERT INTO VehicleCategory (category_name, description) VALUES
    (N'Sedan',     N'Xe 4 cửa, phổ thông, tiết kiệm nhiên liệu'),
    (N'SUV',       N'Xe gầm cao, không gian rộng, phù hợp địa hình đa dạng'),
    (N'Hatchback', N'Xe nhỏ gọn, dễ di chuyển trong đô thị'),
    (N'Crossover', N'Kết hợp SUV và Sedan, cân bằng giữa không gian và vận hành'),
    (N'MPV',       N'Xe đa dụng, nhiều chỗ ngồi, phù hợp gia đình');
 
-- 9.4 Insert Common Features
INSERT INTO Feature (feature_name) VALUES
    (N'GPS Navigation'), (N'Dash Camera'), (N'Reverse Camera'),
    (N'Bluetooth'), (N'USB Charging'), (N'Sunroof'),
    (N'Baby Seat'), (N'ETC Card'), (N'360 Camera'), (N'Auto Parking');
 
-- 9.5 Insert System Configs
INSERT INTO SystemConfig (config_key, config_value, data_type, description) VALUES
    ('PLATFORM_FEE_PERCENT',    '10',   'Number',  N'Phí nền tảng (%) trên mỗi giao dịch'),
    ('MAX_CANCEL_HOURS_BEFORE', '24',   'Number',  N'Số giờ tối thiểu trước khi thuê được phép hủy'),
    ('CANCEL_FEE_PERCENT',      '30',   'Number',  N'Phí hủy (%) nếu hủy trong vòng MAX_CANCEL_HOURS'),
    ('MAX_BOOKING_DAYS',        '30',   'Number',  N'Số ngày thuê tối đa mỗi lần đặt'),
    ('MIN_WALLET_WITHDRAWAL',   '100000', 'Number', N'Số tiền rút ví tối thiểu (VND)'),
    ('OTP_EXPIRY_MINUTES',      '5',    'Number',  N'Thời gian hết hạn OTP (phút)'),
    ('DEPOSIT_REFUND_DAYS',     '3',    'Number',  N'Số ngày hoàn cọc sau khi chuyến kết thúc');
 
-- 9.6 Insert sample Policies
INSERT INTO Policy (policy_type, title, content, effective_date) VALUES
    ('RentalTerms',    N'Điều khoản thuê xe', N'Nội dung điều khoản thuê xe...', '2025-01-01'),
    ('Insurance',      N'Chính sách bảo hiểm', N'Nội dung chính sách bảo hiểm...', '2025-01-01'),
    ('CancellationFee',N'Chính sách hủy đặt xe', N'Hủy trước 24h: miễn phí. Hủy trong 24h: phạt 30% tiền thuê.', '2025-01-01'),
    ('PlatformFee',    N'Phí dịch vụ nền tảng', N'Nền tảng thu 10% phí dịch vụ trên mỗi giao dịch thành công.', '2025-01-01');
 GO
 
 
-- ============================================================
-- SECTION 10: USEFUL VIEWS
-- ============================================================
 
-- View: Vehicle list with brand, category, owner info and avg rating
-- Used by UC08, UC09: Guest/Renter browses vehicles
CREATE VIEW vw_VehicleList AS
SELECT
    v.vehicle_id,
    v.model_name,
    v.license_plate,
    v.seat_count,
    v.daily_price,
    v.deposit_amount,
    v.location_address,
    v.latitude,
    v.longitude,
    v.status,
    b.brand_name,
    c.category_name,
    u.full_name        AS owner_name,
    u.phone            AS owner_phone,
    -- Compute average ratings inline to avoid separate query in application layer
    COUNT(r.review_id) AS total_reviews,
    AVG(CAST(r.rating_vehicle AS DECIMAL(4,2))) AS avg_vehicle_rating,
    AVG(CAST(r.rating_owner   AS DECIMAL(4,2))) AS avg_owner_rating,
    -- Get primary image
    (SELECT TOP 1 image_url FROM VehicleImage vi WHERE vi.vehicle_id = v.vehicle_id AND vi.is_primary = 1) AS primary_image_url
FROM Vehicle v
INNER JOIN Brand           b ON v.brand_id    = b.brand_id
INNER JOIN VehicleCategory c ON v.category_id = c.category_id
INNER JOIN [User]          u ON v.owner_id    = u.user_id
LEFT  JOIN Booking         bk ON bk.vehicle_id = v.vehicle_id AND bk.status = 'Completed'
LEFT  JOIN Review          r  ON r.booking_id  = bk.booking_id AND r.is_visible = 1
WHERE v.is_active = 1
GROUP BY
    v.vehicle_id, v.model_name, v.license_plate, v.seat_count,
    v.daily_price, v.deposit_amount,
    v.location_address, v.latitude, v.longitude, v.status,
    b.brand_name, c.category_name, u.full_name, u.phone;
GO
 
-- View: Booking detail with all related info
-- Used by UC15: Renter tracks booking | UC22: Owner views booking requests
CREATE VIEW vw_BookingDetail AS
SELECT
    bk.booking_id,
    bk.status              AS booking_status,
    bk.start_datetime,
    bk.end_datetime,
    bk.total_amount,
    bk.deposit_amount,
    bk.platform_fee,
    bk.created_at,
    -- Renter info
    r.user_id   AS renter_id,
    r.full_name AS renter_name,
    r.phone     AS renter_phone,
    -- Vehicle info
    v.vehicle_id,
    v.model_name,
    v.license_plate,
    -- Owner info
    o.user_id   AS owner_id,
    o.full_name AS owner_name,
    o.phone     AS owner_phone,
    -- Payment status
    p.payment_id,
    p.status    AS payment_status,
    p.payment_method,
    p.paid_at
FROM Booking     bk
INNER JOIN [User]   r  ON bk.renter_id  = r.user_id
INNER JOIN Vehicle  v  ON bk.vehicle_id = v.vehicle_id
INNER JOIN [User]   o  ON v.owner_id    = o.user_id
LEFT  JOIN Payment  p  ON p.booking_id  = bk.booking_id
                       AND p.payment_type = 'RentalFee'
                       AND p.status = 'Success';
GO
 
-- View: Owner revenue report (UC23: View revenue statistics)
CREATE VIEW vw_OwnerRevenueReport AS
SELECT
    v.owner_id,
    u.full_name            AS owner_name,
    v.vehicle_id,
    v.model_name,
    v.license_plate,
    COUNT(bk.booking_id)   AS total_bookings,
    SUM(CASE WHEN bk.status = 'Completed' THEN 1 ELSE 0 END) AS completed_bookings,
    SUM(CASE WHEN bk.status = 'Completed' THEN bk.rental_price ELSE 0 END) AS gross_revenue,
    SUM(CASE WHEN bk.status = 'Completed' THEN bk.platform_fee ELSE 0 END) AS platform_fee_total,
    SUM(CASE WHEN bk.status = 'Completed' THEN bk.rental_price - bk.platform_fee ELSE 0 END) AS net_revenue
FROM Vehicle  v
INNER JOIN [User]  u  ON v.owner_id    = u.user_id
LEFT  JOIN Booking bk ON bk.vehicle_id = v.vehicle_id
GROUP BY v.owner_id, u.full_name, v.vehicle_id, v.model_name, v.license_plate;
GO
 
-- View: CS weekly/monthly report (UC35: CS statistics)

CREATE OR ALTER VIEW vw_CSWeeklyReport AS
WITH IncidentStats AS (
    SELECT
        DATEPART(YEAR, created_at) AS report_year,
        DATEPART(WEEK, created_at) AS report_week,
        COUNT(incident_id) AS total_incidents,
        SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) AS critical_incidents,
        SUM(CASE WHEN status = 'Resolved'   THEN 1 ELSE 0 END) AS resolved_incidents
    FROM Incident
    GROUP BY DATEPART(YEAR, created_at), DATEPART(WEEK, created_at)
),
ComplaintStats AS (
    SELECT
        DATEPART(YEAR, created_at) AS report_year,
        DATEPART(WEEK, created_at) AS report_week,
        COUNT(complaint_id) AS total_complaints,
        SUM(CASE WHEN status = 'Resolved'   THEN 1 ELSE 0 END) AS resolved_complaints
    FROM Complaint
    GROUP BY DATEPART(YEAR, created_at), DATEPART(WEEK, created_at)
)
SELECT
    COALESCE(i.report_year, c.report_year) AS report_year,
    COALESCE(i.report_week, c.report_week) AS report_week,
    ISNULL(i.total_incidents, 0)    AS total_incidents,
    ISNULL(i.critical_incidents, 0) AS critical_incidents,
    ISNULL(i.resolved_incidents, 0) AS resolved_incidents,
    ISNULL(c.total_complaints, 0)   AS total_complaints,
    ISNULL(c.resolved_complaints, 0) AS resolved_complaints
FROM IncidentStats i
FULL OUTER JOIN ComplaintStats c 
    ON i.report_year = c.report_year AND i.report_week = c.report_week;
GO


 
 
-- ============================================================
-- SECTION 11: STORED PROCEDURES
-- ============================================================
 
-- SP: Check vehicle availability for a given date range (UC13: Book vehicle)
-- Avoids booking conflicts -- critical business logic
CREATE OR ALTER PROCEDURE usp_CheckVehicleAvailability
    @vehicle_id     INT,
    @start_datetime DATETIME2,
    @end_datetime   DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        CASE
            WHEN EXISTS (
                SELECT 1 FROM Booking
                WHERE vehicle_id = @vehicle_id
                  AND status NOT IN ('Rejected', 'Cancelled')
                  AND start_datetime < @end_datetime
                  AND end_datetime   > @start_datetime
            )
            THEN 0
            ELSE 1
        END AS is_available;
END;
GO

 
-- SP: Process wallet transaction atomically (prevents race condition on balance)
-- UC14: Deduct from wallet | UC28: Admin refund deposit
CREATE OR ALTER PROCEDURE usp_ProcessWalletTransaction
    @user_id     INT,
    @booking_id  INT = NULL,
    @amount      DECIMAL(18,2),
    @txn_type    NVARCHAR(30),
    @description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; -- Tự động ngắt và Rollback nếu có lỗi hệ thống nghiêm trọng

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @wallet_id     INT;
        DECLARE @balance_before DECIMAL(18,2);
        DECLARE @balance_after  DECIMAL(18,2);

        -- Lock dòng dữ liệu ví của user này để tránh lỗi khi nạp/rút cùng lúc
        SELECT @wallet_id = wallet_id, @balance_before = balance
        FROM Wallet WITH (UPDLOCK, ROWLOCK)
        WHERE user_id = @user_id;

        IF @wallet_id IS NULL
        BEGIN
            RAISERROR(N'Wallet not found for user_id = %d', 16, 1, @user_id);
        END

        -- Tính toán số dư mới
        IF @txn_type IN ('TopUp', 'Refund', 'Income')
            SET @balance_after = @balance_before + @amount;
        ELSE
            SET @balance_after = @balance_before - @amount;

        IF @balance_after < 0
        BEGIN
            RAISERROR(N'Insufficient wallet balance.', 16, 1);
        END

        -- Cập nhật ví
        UPDATE Wallet
        SET balance = @balance_after, updated_at = GETDATE()
        WHERE wallet_id = @wallet_id;

        -- Lưu lịch sử giao dịch
        INSERT INTO WalletTransaction
            (wallet_id, booking_id, amount, txn_type, balance_before, balance_after, description)
        VALUES
            (@wallet_id, @booking_id, @amount, @txn_type, @balance_before, @balance_after, @description);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Bắt lỗi: Nếu có bất kỳ lỗi gì xảy ra thì hoàn tác lại toàn bộ, không trừ tiền oan
        IF @@TRANCOUNT > 0 
            ROLLBACK TRANSACTION;
        
        -- Báo lỗi chi tiết để tầng Backend nhận được
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END;
GO

-- 1. Trỏ đúng vào Database của hệ thống
USE CarRentalPlatform;
GO

-- ==============================================================================
-- PHẦN 1: CẬP NHẬT LẠI VIEW BÁO CÁO (Sửa lỗi Fan-out trap, gom nhóm trước khi JOIN)
-- ==============================================================================
CREATE OR ALTER VIEW vw_CSWeeklyReport AS
WITH IncidentStats AS (
    SELECT
        DATEPART(YEAR, created_at) AS report_year,
        DATEPART(WEEK, created_at) AS report_week,
        COUNT(incident_id) AS total_incidents,
        SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) AS critical_incidents,
        SUM(CASE WHEN status = 'Resolved'   THEN 1 ELSE 0 END) AS resolved_incidents
    FROM Incident
    GROUP BY DATEPART(YEAR, created_at), DATEPART(WEEK, created_at)
),
ComplaintStats AS (
    SELECT
        DATEPART(YEAR, created_at) AS report_year,
        DATEPART(WEEK, created_at) AS report_week,
        COUNT(complaint_id) AS total_complaints,
        SUM(CASE WHEN status = 'Resolved'   THEN 1 ELSE 0 END) AS resolved_complaints
    FROM Complaint
    GROUP BY DATEPART(YEAR, created_at), DATEPART(WEEK, created_at)
)
SELECT
    COALESCE(i.report_year, c.report_year) AS report_year,
    COALESCE(i.report_week, c.report_week) AS report_week,
    ISNULL(i.total_incidents, 0)    AS total_incidents,
    ISNULL(i.critical_incidents, 0) AS critical_incidents,
    ISNULL(i.resolved_incidents, 0) AS resolved_incidents,
    ISNULL(c.total_complaints, 0)   AS total_complaints,
    ISNULL(c.resolved_complaints, 0) AS resolved_complaints
FROM IncidentStats i
FULL OUTER JOIN ComplaintStats c 
    ON i.report_year = c.report_year AND i.report_week = c.report_week;
GO



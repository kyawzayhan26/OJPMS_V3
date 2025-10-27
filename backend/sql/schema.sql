/*
  OJPMS consolidated schema helpers.
  Apply against the target SQL Server database to provision new modules
  introduced by the updated frontend/backend integration.
*/

-- Remove legacy checklist tables (no longer used by the application)
IF OBJECT_ID('dbo.ProspectChecklistItems', 'U') IS NOT NULL
    DROP TABLE dbo.ProspectChecklistItems;

IF OBJECT_ID('dbo.ClientChecklistItems', 'U') IS NOT NULL
    DROP TABLE dbo.ClientChecklistItems;

-- Documents now link directly to prospects (with optional client reference)
IF OBJECT_ID('dbo.Documents', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Documents (
        id            BIGINT         IDENTITY(1,1) PRIMARY KEY,
        prospect_id   BIGINT         NOT NULL,
        client_id     BIGINT         NULL,
        type          NVARCHAR(50)   NOT NULL,
        status        NVARCHAR(50)   NOT NULL DEFAULT 'Uploaded',
        file_url      NVARCHAR(500)  NOT NULL,
        remarks       NVARCHAR(500)  NULL,
        created_at    DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at    DATETIME2      NULL,
        isDeleted     BIT            NOT NULL DEFAULT 0
    );
END
ELSE
BEGIN
    IF COL_LENGTH('dbo.Documents', 'prospect_id') IS NULL
        ALTER TABLE dbo.Documents ADD prospect_id BIGINT NULL;
    IF COL_LENGTH('dbo.Documents', 'client_id') IS NULL
        ALTER TABLE dbo.Documents ADD client_id BIGINT NULL;
    IF COL_LENGTH('dbo.Documents', 'status') IS NULL
        ALTER TABLE dbo.Documents ADD status NVARCHAR(50) NOT NULL DEFAULT 'Uploaded';
    IF COL_LENGTH('dbo.Documents', 'file_url') IS NULL
        ALTER TABLE dbo.Documents ADD file_url NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.Documents', 'remarks') IS NULL
        ALTER TABLE dbo.Documents ADD remarks NVARCHAR(500) NULL;
    IF COL_LENGTH('dbo.Documents', 'created_at') IS NULL
        ALTER TABLE dbo.Documents ADD created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    IF COL_LENGTH('dbo.Documents', 'updated_at') IS NULL
        ALTER TABLE dbo.Documents ADD updated_at DATETIME2 NULL;
    IF COL_LENGTH('dbo.Documents', 'isDeleted') IS NULL
        ALTER TABLE dbo.Documents ADD isDeleted BIT NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Documents_Prospects'
)
BEGIN
    ALTER TABLE dbo.Documents
        ADD CONSTRAINT FK_Documents_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Documents_Clients'
)
BEGIN
    ALTER TABLE dbo.Documents
        ADD CONSTRAINT FK_Documents_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id);
END;

-- Clients: accommodation details used by the deployment workflow
IF COL_LENGTH('dbo.Clients', 'accommodation_type') IS NULL
    ALTER TABLE dbo.Clients ADD accommodation_type NVARCHAR(100) NULL;
IF COL_LENGTH('dbo.Clients', 'accommodation_details') IS NULL
    ALTER TABLE dbo.Clients ADD accommodation_details NVARCHAR(500) NULL;

-- Payments: invoice description required by the new UI
IF COL_LENGTH('dbo.Payments', 'invoice_description') IS NULL
    ALTER TABLE dbo.Payments ADD invoice_description NVARCHAR(500) NULL;

-- Ensure ProspectJobMatches uses the [isDeleted] flag referenced in the API
IF COL_LENGTH('dbo.ProspectJobMatches', 'insDeleted') IS NOT NULL
BEGIN
    EXEC sp_rename 'dbo.ProspectJobMatches.insDeleted', 'isDeleted', 'COLUMN';
END;

IF COL_LENGTH('dbo.ProspectJobMatches', 'isDeleted') IS NULL
BEGIN
    ALTER TABLE dbo.ProspectJobMatches ADD isDeleted BIT NOT NULL DEFAULT 0;
END;

IF COL_LENGTH('dbo.ProspectJobMatches', 'isDeleted') IS NOT NULL
BEGIN
    UPDATE dbo.ProspectJobMatches SET isDeleted = 0 WHERE isDeleted IS NULL;
END;

-- SmartCard applications table used for direct CRUD screens
IF OBJECT_ID('dbo.SmartCardApplications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartCardApplications (
        id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
        prospect_id    BIGINT        NOT NULL,
        client_id      BIGINT        NULL,
        card_number    NVARCHAR(100) NULL,
        status         NVARCHAR(50) NOT NULL DEFAULT 'Pending',
        submitted_at   DATETIME2     NULL,
        issued_at      DATETIME2     NULL,
        expires_at     DATETIME2     NULL,
        notes          NVARCHAR(MAX) NULL,
        created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        isDeleted      BIT           NOT NULL DEFAULT 0
    );
END;

-- Visa applications table
IF OBJECT_ID('dbo.VisaApplications', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VisaApplications (
        id              BIGINT        IDENTITY(1,1) PRIMARY KEY,
        prospect_id     BIGINT        NOT NULL,
        client_id       BIGINT        NULL,
        visa_type       NVARCHAR(100) NULL,
        application_no  NVARCHAR(100) NULL,
        status          NVARCHAR(50)  NOT NULL DEFAULT 'Draft',
        submitted_at    DATETIME2      NULL,
        approved_at     DATETIME2      NULL,
        notes           NVARCHAR(MAX)  NULL,
        created_at      DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
        isDeleted       BIT            NOT NULL DEFAULT 0
    );
END;

-- SmartCardProcesses track kanban transitions
IF OBJECT_ID('dbo.SmartCardProcesses', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.SmartCardProcesses (
        id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
        client_id      BIGINT        NOT NULL,
        application_id BIGINT        NOT NULL,
        status         NVARCHAR(50)  NOT NULL DEFAULT 'Drafted',
        attempt_count  INT           NOT NULL DEFAULT 0,
        remarks        NVARCHAR(MAX) NULL,
        created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        isDeleted      BIT           NOT NULL DEFAULT 0
    );
END;

-- VisaProcesses capture downstream workflow actions
IF OBJECT_ID('dbo.VisaProcesses', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.VisaProcesses (
        id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
        client_id      BIGINT        NOT NULL,
        application_id BIGINT        NOT NULL,
        visa_type      NVARCHAR(100) NULL,
        status         NVARCHAR(50)  NOT NULL DEFAULT 'Drafted',
        attempt_count  INT           NOT NULL DEFAULT 0,
        remarks        NVARCHAR(MAX) NULL,
        created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        isDeleted      BIT           NOT NULL DEFAULT 0
    );
END;

-- Flight bookings table powering the new module and client transition step
IF OBJECT_ID('dbo.FlightBookings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FlightBookings (
        id                BIGINT        IDENTITY(1,1) PRIMARY KEY,
        client_id         BIGINT        NOT NULL,
        airline           NVARCHAR(200) NOT NULL,
        flight_datetime   DATETIME2     NOT NULL,
        booking_reference NVARCHAR(100) NOT NULL,
        remarks           NVARCHAR(500) NULL,
        created_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        isDeleted         BIT           NOT NULL DEFAULT 0
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FlightBookings_Clients'
)
BEGIN
    ALTER TABLE dbo.FlightBookings
        ADD CONSTRAINT FK_FlightBookings_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id);
END;

-- Helper indexes for document lookups
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Documents_Prospect_Type' AND object_id = OBJECT_ID('dbo.Documents')
)
BEGIN
    CREATE INDEX IX_Documents_Prospect_Type ON dbo.Documents (prospect_id, type, status);
END;


/*
  schema_full_v6_final.sql
  ----------------------------------------------------------------------
  Drops and recreates the OJPMS database with the v6 schema, reflecting
  all entities and relationships used by the current backend/frontend.
  Run this script in SQL Server Management Studio (or sqlcmd) as a user
  with sufficient privileges.  Files referenced by the app (e.g. stored
  documents) are not handled here – ensure you back them up separately.
*/

SET NOCOUNT ON;

/* 1) Drop existing connections (required if the DB is in use) */
USE master;
GO
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'ojpms_dev')
BEGIN
    ALTER DATABASE ojpms_dev SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ojpms_dev;
    PRINT 'Existing ojpms_dev database dropped.';
END
GO

-- 2) Recreate database and switch context
CREATE DATABASE [ojpms_dev];
GO

ALTER DATABASE [ojpms_dev] SET MULTI_USER;
GO

USE [ojpms_dev];
GO

-----------------------------------------------------------------------
-- Core reference tables
-----------------------------------------------------------------------
CREATE TABLE dbo.Roles (
    id          INT            IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(50)   NOT NULL UNIQUE,
    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.Users (
    id             BIGINT         IDENTITY(1,1) PRIMARY KEY,
    email          NVARCHAR(150)  NOT NULL UNIQUE,
    password_hash  NVARCHAR(255)  NOT NULL,
    full_name      NVARCHAR(150)  NOT NULL,
    name           AS full_name,
    is_active      BIT            NOT NULL DEFAULT 1,
    created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2      NULL
);
GO

CREATE TABLE dbo.UserRoles (
    user_id     BIGINT    NOT NULL,
    role_id     INT       NOT NULL,
    assigned_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserRoles PRIMARY KEY (user_id, role_id),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (user_id) REFERENCES dbo.Users(id) ON DELETE CASCADE,
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (role_id) REFERENCES dbo.Roles(id) ON DELETE CASCADE
);
GO

-----------------------------------------------------------------------
-- Employers & Jobs
-----------------------------------------------------------------------
CREATE TABLE dbo.Employers (
    id             BIGINT         IDENTITY(1,1) PRIMARY KEY,
    name           NVARCHAR(200)  NOT NULL,
    country        NVARCHAR(100)  NOT NULL,
    contact_name   NVARCHAR(150)  NULL,
    contact_email  NVARCHAR(150)  NULL,
    contact_phone  NVARCHAR(50)   NULL,
    address        NVARCHAR(255)  NULL,
    created_at     DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2      NULL,
    isDeleted      BIT            NOT NULL DEFAULT 0
);
GO

CREATE TABLE dbo.Jobs (
    id                BIGINT        IDENTITY(1,1) PRIMARY KEY,
    employer_id       BIGINT        NOT NULL,
    title             NVARCHAR(150) NOT NULL,
    description       NVARCHAR(MAX) NULL,
    location_country  NVARCHAR(100) NOT NULL,
    requirements      NVARCHAR(MAX) NULL,
    salary            DECIMAL(18,2) NULL,
    is_active         BIT           NOT NULL DEFAULT 1,
    created_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at        DATETIME2     NULL,
    isDeleted         BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_Jobs_Employers FOREIGN KEY (employer_id) REFERENCES dbo.Employers(id)
);
GO

CREATE INDEX IX_Jobs_Employer ON dbo.Jobs (employer_id);
GO

-----------------------------------------------------------------------
-- Prospects & pipeline history
-----------------------------------------------------------------------
CREATE TABLE dbo.Prospects (
    id                     BIGINT         IDENTITY(1,1) PRIMARY KEY,
    full_name              NVARCHAR(150)  NOT NULL,
    dob                    DATE           NULL,
    passport_no            NVARCHAR(50)   NULL,
    contact_email          NVARCHAR(150)  NULL,
    contact_phone          NVARCHAR(50)   NULL,
    address                NVARCHAR(255)  NULL,
    highest_qualification  NVARCHAR(150)  NULL,
    status                 NVARCHAR(50)   NOT NULL DEFAULT 'enquiry',
    interested_job_id      BIGINT         NULL,
    remarks1               NVARCHAR(500)  NULL,
    remarks2               NVARCHAR(500)  NULL,
    created_at             DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at             DATETIME2      NULL,
    isDeleted              BIT            NOT NULL DEFAULT 0,
    CONSTRAINT FK_Prospects_Jobs FOREIGN KEY (interested_job_id) REFERENCES dbo.Jobs(id) ON DELETE SET NULL
);
GO

CREATE INDEX IX_Prospects_Status ON dbo.Prospects (status);
GO

CREATE TABLE dbo.ProspectStatusHistory (
    id           BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id  BIGINT        NOT NULL,
    from_status  NVARCHAR(50)  NULL,
    to_status    NVARCHAR(50)  NOT NULL,
    changed_by   BIGINT        NULL,
    changed_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    remarks      NVARCHAR(500) NULL,
    CONSTRAINT FK_ProspectStatusHistory_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_ProspectStatusHistory_Users FOREIGN KEY (changed_by) REFERENCES dbo.Users(id)
);
GO

-----------------------------------------------------------------------
-- Clients & pipeline history
-----------------------------------------------------------------------
CREATE TABLE dbo.Clients (
    id                     BIGINT         IDENTITY(1,1) PRIMARY KEY,
    prospect_id            BIGINT         NOT NULL,
    full_name              NVARCHAR(150)  NOT NULL,
    passport_no            NVARCHAR(50)   NULL,
    status                 NVARCHAR(50)   NOT NULL,
    remarks1               NVARCHAR(500)  NULL,
    accommodation_type     NVARCHAR(100)  NULL,
    accommodation_details  NVARCHAR(500)  NULL,
    created_at             DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at             DATETIME2      NULL,
    isDeleted              BIT            NOT NULL DEFAULT 0,
    CONSTRAINT FK_Clients_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id)
);
GO

CREATE INDEX IX_Clients_Status ON dbo.Clients (status);
GO

CREATE TABLE dbo.ClientStatusHistory (
    id           BIGINT        IDENTITY(1,1) PRIMARY KEY,
    client_id    BIGINT        NOT NULL,
    from_status  NVARCHAR(50)  NULL,
    to_status    NVARCHAR(50)  NOT NULL,
    changed_by   BIGINT        NULL,
    changed_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    remarks      NVARCHAR(500) NULL,
    CONSTRAINT FK_ClientStatusHistory_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id) ON DELETE CASCADE,
    CONSTRAINT FK_ClientStatusHistory_Users FOREIGN KEY (changed_by) REFERENCES dbo.Users(id)
);
GO

-----------------------------------------------------------------------
-- Prospect job matches, applications & interviews
-----------------------------------------------------------------------
CREATE TABLE dbo.ProspectJobMatches (
    id           BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id  BIGINT        NOT NULL,
    job_id       BIGINT        NOT NULL,
    matched_by   BIGINT        NULL,
    status       NVARCHAR(50)  NOT NULL DEFAULT 'pending_review',
    rationale    NVARCHAR(MAX) NULL,
    is_current   BIT           NOT NULL DEFAULT 1,
    created_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    isDeleted   BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_ProspectJobMatches_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_ProspectJobMatches_Jobs FOREIGN KEY (job_id) REFERENCES dbo.Jobs(id),
    CONSTRAINT FK_ProspectJobMatches_Users FOREIGN KEY (matched_by) REFERENCES dbo.Users(id)
);
GO

CREATE INDEX IX_ProspectJobMatches_Prospect ON dbo.ProspectJobMatches (prospect_id, is_current);
GO

CREATE TABLE dbo.Applications (
    id                   BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id          BIGINT        NOT NULL,
    job_id               BIGINT        NOT NULL,
    submitted_by         BIGINT        NULL,
    status               NVARCHAR(50)  NOT NULL DEFAULT 'Draft',
    submitted_at         DATETIME2     NULL,
    employer_response_at DATETIME2     NULL,
    notes                NVARCHAR(MAX) NULL,
    created_at           DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at           DATETIME2     NULL,
    isDeleted            BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_Applications_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_Applications_Jobs FOREIGN KEY (job_id) REFERENCES dbo.Jobs(id),
    CONSTRAINT FK_Applications_Users FOREIGN KEY (submitted_by) REFERENCES dbo.Users(id)
);
GO

CREATE TABLE dbo.Interviews (
    id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id    BIGINT        NOT NULL,
    application_id BIGINT        NOT NULL,
    employer_id    BIGINT        NOT NULL,
    scheduled_time DATETIME2     NOT NULL,
    mode           NVARCHAR(100) NULL,
    location       NVARCHAR(200) NULL,
    outcome        NVARCHAR(50)  NOT NULL DEFAULT 'Pending',
    outcome_notes  NVARCHAR(MAX) NULL,
    recorded_by    BIGINT        NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2     NULL,
    isDeleted      BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_Interviews_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_Interviews_Applications FOREIGN KEY (application_id) REFERENCES dbo.Applications(id),
    CONSTRAINT FK_Interviews_Employers FOREIGN KEY (employer_id) REFERENCES dbo.Employers(id),
    CONSTRAINT FK_Interviews_Users FOREIGN KEY (recorded_by) REFERENCES dbo.Users(id)
);
GO

-----------------------------------------------------------------------
-- Documents & audit
-----------------------------------------------------------------------
CREATE TABLE dbo.Documents (
    id          BIGINT         IDENTITY(1,1) PRIMARY KEY,
    prospect_id BIGINT         NOT NULL,
    client_id   BIGINT         NULL,
    type        NVARCHAR(50)   NOT NULL,
    status      NVARCHAR(50)   NOT NULL DEFAULT 'Uploaded',
    file_url    NVARCHAR(500)  NOT NULL,
    remarks     NVARCHAR(500)  NULL,
    created_at  DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at  DATETIME2      NULL,
    isDeleted   BIT            NOT NULL DEFAULT 0,
    CONSTRAINT FK_Documents_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_Documents_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id)
);
GO

CREATE INDEX IX_Documents_Prospect_Type ON dbo.Documents (prospect_id, type, status);
GO

CREATE TABLE dbo.AuditLogs (
    id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
    actor_user_id  BIGINT        NULL,
    action         NVARCHAR(100) NOT NULL,
    entity         NVARCHAR(100) NULL,
    entity_id      BIGINT        NULL,
    method         NVARCHAR(10)  NULL,
    path           NVARCHAR(255) NULL,
    ip             NVARCHAR(45)  NULL,
    user_agent     NVARCHAR(500) NULL,
    status_code    INT           NULL,
    details        NVARCHAR(MAX) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (actor_user_id) REFERENCES dbo.Users(id)
);
GO

-----------------------------------------------------------------------
-- Financials & downstream workflows
-----------------------------------------------------------------------
CREATE TABLE dbo.Payments (
    id                  BIGINT        IDENTITY(1,1) PRIMARY KEY,
    client_id           BIGINT        NOT NULL,
    amount              DECIMAL(18,2) NOT NULL,
    currency            NVARCHAR(10)  NOT NULL,
    status              NVARCHAR(50)  NOT NULL,
    collected_by        BIGINT        NULL,
    collected_at        DATETIME2     NULL,
    reference_no        NVARCHAR(100) NULL,
    invoice_description NVARCHAR(500) NULL,
    created_at          DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2     NULL,
    CONSTRAINT FK_Payments_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id) ON DELETE CASCADE,
    CONSTRAINT FK_Payments_Users FOREIGN KEY (collected_by) REFERENCES dbo.Users(id)
);
GO

CREATE TABLE dbo.SmartCardApplications (
    id           BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id  BIGINT        NOT NULL,
    client_id    BIGINT        NULL,
    card_number  NVARCHAR(100) NULL,
    status       NVARCHAR(50)  NOT NULL DEFAULT 'Pending',
    submitted_at DATETIME2     NULL,
    issued_at    DATETIME2     NULL,
    expires_at   DATETIME2     NULL,
    notes        NVARCHAR(MAX) NULL,
    created_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    isDeleted    BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_SmartCardApplications_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_SmartCardApplications_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id)
);
GO

CREATE TABLE dbo.VisaApplications (
    id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
    prospect_id    BIGINT        NOT NULL,
    client_id      BIGINT        NULL,
    visa_type      NVARCHAR(100) NULL,
    application_no NVARCHAR(100) NULL,
    status         NVARCHAR(50)  NOT NULL DEFAULT 'Draft',
    submitted_at   DATETIME2     NULL,
    approved_at    DATETIME2     NULL,
    notes          NVARCHAR(MAX) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    isDeleted      BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_VisaApplications_Prospects FOREIGN KEY (prospect_id) REFERENCES dbo.Prospects(id) ON DELETE CASCADE,
    CONSTRAINT FK_VisaApplications_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id)
);
GO

CREATE TABLE dbo.SmartCardProcesses (
    id             BIGINT        IDENTITY(1,1) PRIMARY KEY,
    client_id      BIGINT        NOT NULL,
    application_id BIGINT        NOT NULL,
    status         NVARCHAR(50)  NOT NULL DEFAULT 'Drafted',
    attempt_count  INT           NOT NULL DEFAULT 0,
    remarks        NVARCHAR(MAX) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    isDeleted      BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_SmartCardProcesses_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id) ON DELETE CASCADE,
    CONSTRAINT FK_SmartCardProcesses_Applications FOREIGN KEY (application_id) REFERENCES dbo.SmartCardApplications(id)
);
GO

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
    isDeleted      BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_VisaProcesses_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id) ON DELETE CASCADE,
    CONSTRAINT FK_VisaProcesses_Applications FOREIGN KEY (application_id) REFERENCES dbo.VisaApplications(id)
);
GO

CREATE TABLE dbo.FlightBookings (
    id                BIGINT        IDENTITY(1,1) PRIMARY KEY,
    client_id         BIGINT        NOT NULL,
    airline           NVARCHAR(200) NOT NULL,
    flight_datetime   DATETIME2     NOT NULL,
    booking_reference NVARCHAR(100) NOT NULL,
    remarks           NVARCHAR(500) NULL,
    created_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    isDeleted         BIT           NOT NULL DEFAULT 0,
    CONSTRAINT FK_FlightBookings_Clients FOREIGN KEY (client_id) REFERENCES dbo.Clients(id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_FlightBookings_Client ON dbo.FlightBookings (client_id, flight_datetime);
GO

-----------------------------------------------------------------------
-- Seed convenience indexes (beyond the ones above)
-----------------------------------------------------------------------
CREATE INDEX IX_Applications_Status ON dbo.Applications (status, prospect_id);
GO

CREATE INDEX IX_Interviews_Prospect ON dbo.Interviews (prospect_id, scheduled_time);
GO

CREATE INDEX IX_Documents_Type ON dbo.Documents (type);
GO

PRINT 'Database ojpms_dev recreated with schema v6.';
GO

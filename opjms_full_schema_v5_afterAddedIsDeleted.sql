/* ==========================================
   OJPMS / MMPL — Full Schema Reset & Recreate
   ========================================== */

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

/* 2) Recreate a fresh database */
CREATE DATABASE ojpms_dev;
GO
USE ojpms_dev;
GO
PRINT 'ojpms_dev database created.';
GO

/* 3) Start of schema definitions (from v2 schema) */

/* Core Reference Entities */
CREATE TABLE Employers (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  country VARCHAR(100) NOT NULL,
  contact_name VARCHAR(150),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  address VARCHAR(300),
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NULL,
  isDeleted BIT NOT NULL CONSTRAINT DF_Employers_isDeleted DEFAULT(0)
);

CREATE TABLE Jobs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  employer_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description NVARCHAR(MAX),
  location_country VARCHAR(100) NOT NULL,
  requirements NVARCHAR(MAX),
  salary DECIMAL(12,2),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Jobs_isDeleted DEFAULT(0),
  CONSTRAINT FK_Jobs_Employer FOREIGN KEY (employer_id) REFERENCES Employers(id)
);
CREATE INDEX IX_Jobs_EmployerId ON Jobs(employer_id);

/* People / Access Control */
CREATE TABLE Users (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Users_isDeleted DEFAULT(0)
);

CREATE TABLE Roles (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  permissions_json NVARCHAR(MAX)
);

CREATE TABLE UserRoles (
  user_id BIGINT NOT NULL,
  role_id INT NOT NULL,
  assigned_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT FK_UserRoles_User FOREIGN KEY (user_id) REFERENCES Users(id),
  CONSTRAINT FK_UserRoles_Role FOREIGN KEY (role_id) REFERENCES Roles(id)
);
CREATE INDEX IX_UserRoles_RoleId ON UserRoles(role_id);

/* Prospects & Enquiries */
CREATE TABLE Prospects (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  dob DATE,
  passport_no VARCHAR(50),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  address VARCHAR(300),
  highest_qualification VARCHAR(200),
  status VARCHAR(40) NOT NULL CHECK (status IN (
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  )) DEFAULT 'enquiry',
  interested_job_id BIGINT NULL,
  remarks1 NVARCHAR(MAX),
  remarks2 NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Prospects_isDeleted DEFAULT(0),
  CONSTRAINT FK_Prospects_InterestedJob FOREIGN KEY (interested_job_id) REFERENCES Jobs(id)
);
CREATE INDEX IX_Prospects_Status ON Prospects(status);
CREATE INDEX IX_Prospects_InterestedJob ON Prospects(interested_job_id);

CREATE TABLE Enquiries (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('phone','email','social','walkin')),
  interested_job_id BIGINT,
  summary NVARCHAR(MAX),
  recorded_by BIGINT NOT NULL,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  isDeleted BIT NOT NULL CONSTRAINT DF_Enquiries_isDeleted DEFAULT(0),
  CONSTRAINT FK_Enquiries_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_Enquiries_Job FOREIGN KEY (interested_job_id) REFERENCES Jobs(id),
  CONSTRAINT FK_Enquiries_User FOREIGN KEY (recorded_by) REFERENCES Users(id)
);
CREATE INDEX IX_Enquiries_ProspectId ON Enquiries(prospect_id);

/* ProspectJobMatches */
CREATE TABLE ProspectJobMatches (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  matched_by BIGINT NOT NULL,
  is_current BIT DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending_review','rejected','approved')) DEFAULT 'pending_review',
  rationale NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  CONSTRAINT FK_PJM_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_PJM_Job FOREIGN KEY (job_id) REFERENCES Jobs(id),
  CONSTRAINT FK_PJM_User FOREIGN KEY (matched_by) REFERENCES Users(id)
);
CREATE INDEX IX_PJM_ProspectId ON ProspectJobMatches(prospect_id);
CREATE INDEX IX_PJM_Status ON ProspectJobMatches(status);

/* Prospect Status History */
CREATE TABLE ProspectStatusHistory (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  from_status VARCHAR(40) CHECK (from_status IN (
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  )),
  to_status VARCHAR(40) CHECK (to_status IN (
    'enquiry','job_matched','jobmatch_approved',
    'application_drafted','application_submitted',
    'interview_scheduled','interview_passed'
  )),
  changed_by BIGINT,
  changed_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  remarks NVARCHAR(MAX),
  CONSTRAINT FK_PSH_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_PSH_User FOREIGN KEY (changed_by) REFERENCES Users(id)
);
CREATE INDEX IX_PSH_Prospect ON ProspectStatusHistory(prospect_id, changed_at DESC);

/* Prospect Checklist Items */
CREATE TABLE ProspectChecklistItems (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Todo','InProgress','Done','Blocked')),
  assigned_to BIGINT NULL,
  due_date DATE NULL,
  completed_at DATETIME2 NULL,
  notes NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2 NULL,
  isDeleted BIT NOT NULL CONSTRAINT DF_ProspectChecklist_isDeleted DEFAULT(0),
  CONSTRAINT FK_PChecklist_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_PChecklist_User FOREIGN KEY (assigned_to) REFERENCES Users(id)
);
CREATE INDEX IX_PChecklist_Prospect ON ProspectChecklistItems(prospect_id, status);

/* Applications */
CREATE TABLE Applications (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  submitted_by BIGINT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Draft','Submitted','Rejected','Shortlisted')),
  submitted_at DATETIME2,
  employer_response_at DATETIME2,
  notes NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Applications_isDeleted DEFAULT(0),
  CONSTRAINT FK_Applications_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_Applications_Job FOREIGN KEY (job_id) REFERENCES Jobs(id),
  CONSTRAINT FK_Applications_User FOREIGN KEY (submitted_by) REFERENCES Users(id)
);

/* Interviews (now includes isDeleted) */
CREATE TABLE Interviews (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  application_id BIGINT NOT NULL,
  employer_id BIGINT NOT NULL,
  scheduled_time DATETIME2 NOT NULL,
  mode VARCHAR(50),
  location VARCHAR(200),
  notified_at DATETIME2,
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('Pending','Pass','Fail','NoShow')),
  outcome_notes NVARCHAR(MAX),
  recorded_by BIGINT,
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Interviews_isDeleted DEFAULT(0),
  CONSTRAINT FK_Interviews_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id),
  CONSTRAINT FK_Interviews_Application FOREIGN KEY (application_id) REFERENCES Applications(id),
  CONSTRAINT FK_Interviews_Employer FOREIGN KEY (employer_id) REFERENCES Employers(id),
  CONSTRAINT FK_Interviews_User FOREIGN KEY (recorded_by) REFERENCES Users(id)
);

/* Clients */
CREATE TABLE Clients (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  prospect_id BIGINT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  passport_no VARCHAR(50) UNIQUE,
  status VARCHAR(40) NOT NULL CHECK (status IN (
    'SmartCard_InProgress','Visa_InProgress','Payment_Pending','FlightBooking_Pending',
    'Accommodation_Pending','Approved_For_Deployment','Departed'
  )),
  remarks1 NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Clients_isDeleted DEFAULT(0),
  CONSTRAINT FK_Clients_Prospect FOREIGN KEY (prospect_id) REFERENCES Prospects(id)
);

/* Documents */
CREATE TABLE Documents (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'Passport','Photo','EducationCert','MedicalCheck','PoliceClearance','SmartCardForm','VisaForm','Other'
  )),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Pending','Uploaded','Verified','Rejected','Expired')),
  file_url VARCHAR(500),
  remarks NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  isDeleted BIT NOT NULL CONSTRAINT DF_Documents_isDeleted DEFAULT(0),
  CONSTRAINT FK_Documents_Client FOREIGN KEY (client_id) REFERENCES Clients(id)
);

/* Client Checklist */
CREATE TABLE ClientChecklistItems (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Todo','InProgress','Done','Blocked')),
  assigned_to BIGINT,
  due_date DATE,
  completed_at DATETIME2,
  notes NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  CONSTRAINT FK_Checklist_Client FOREIGN KEY (client_id) REFERENCES Clients(id),
  CONSTRAINT FK_Checklist_User FOREIGN KEY (assigned_to) REFERENCES Users(id)
);

/* Smart Card & Visa */
CREATE TABLE SmartCardProcesses (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  application_id VARCHAR(50) NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('NotStarted','InProgress','Submitted','Approved','Rejected')),
  attempts_count INT DEFAULT 0,
  remarks NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_SmartCardProcesses_isDeleted DEFAULT(0),
  CONSTRAINT FK_SmartCard_Client FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE VisaProcesses (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  job_id BIGINT NOT NULL,
  application_id VARCHAR(50) NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('NotStarted','InProgress','Submitted','Approved','Rejected')),
  attempts_count INT DEFAULT 0,
  visa_type VARCHAR(100),
  remarks NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_VisaProcesses_isDeleted DEFAULT(0),
  CONSTRAINT FK_Visa_Client FOREIGN KEY (client_id) REFERENCES Clients(id),
  CONSTRAINT FK_Visa_Job FOREIGN KEY (job_id) REFERENCES Jobs(id)
);

/* Payments */
CREATE TABLE Payments (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3),
  status VARCHAR(20) NOT NULL CHECK (status IN ('Pending','Paid','Waived','Refunded')),
  collected_by BIGINT,
  collected_at DATETIME2,
  reference_no VARCHAR(100),
  notes NVARCHAR(MAX),
  created_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  updated_at DATETIME2,
  isDeleted BIT NOT NULL CONSTRAINT DF_Payments_isDeleted DEFAULT(0),
  CONSTRAINT FK_Payments_Client FOREIGN KEY (client_id) REFERENCES Clients(id),
  CONSTRAINT FK_Payments_User FOREIGN KEY (collected_by) REFERENCES Users(id)
);

/* Audit Logs */
CREATE TABLE AuditLogs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  created_at DATETIME2(0)      NOT NULL DEFAULT SYSUTCDATETIME(),
  actor_user_id BIGINT         NULL,
  action NVARCHAR(100)         NOT NULL,
  entity NVARCHAR(100)         NOT NULL,
  entity_id BIGINT             NULL,
  method NVARCHAR(10)          NULL,
  path NVARCHAR(400)           NULL,
  ip NVARCHAR(64)              NULL,
  user_agent NVARCHAR(400)     NULL,
  status_code INT              NULL,
  details NVARCHAR(MAX)        NULL
);
ALTER TABLE AuditLogs
ADD CONSTRAINT FK_AuditLogs_User
FOREIGN KEY (actor_user_id) REFERENCES Users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
CREATE INDEX IX_AuditLogs_CreatedAt ON AuditLogs(created_at DESC);
CREATE INDEX IX_AuditLogs_Entity    ON AuditLogs(entity, entity_id);
CREATE INDEX IX_AuditLogs_Actor     ON AuditLogs(actor_user_id, created_at DESC);

/* Client Status History */
CREATE TABLE ClientStatusHistory (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  client_id BIGINT NOT NULL,
  from_status VARCHAR(40) CHECK (from_status IN (
    'SmartCard_InProgress','Visa_InProgress','Payment_Pending','FlightBooking_Pending',
    'Accommodation_Pending','Approved_For_Deployment','Departed'
  )),
  to_status VARCHAR(40) CHECK (to_status IN (
    'SmartCard_InProgress','Visa_InProgress','Payment_Pending','FlightBooking_Pending',
    'Accommodation_Pending','Approved_For_Deployment','Departed'
  )),
  changed_by BIGINT,
  changed_at DATETIME2 DEFAULT SYSUTCDATETIME(),
  remarks NVARCHAR(MAX),
  CONSTRAINT FK_CSH_Client FOREIGN KEY (client_id) REFERENCES Clients(id),
  CONSTRAINT FK_CSH_User FOREIGN KEY (changed_by) REFERENCES Users(id)
);

/* Seed Roles */
INSERT INTO Roles (name) VALUES ('Admin'), ('Staff');
PRINT '✅ OJPMS schema re-created successfully.';
GO

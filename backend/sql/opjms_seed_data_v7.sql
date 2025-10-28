/*
  Seed data for OJPMS.
  Run after applying schema.sql to populate development/sample records.
*/

SET NOCOUNT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    ------------------------------------------------------------
    -- Cleanup existing data (respecting FK dependencies)
    ------------------------------------------------------------
    IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.AuditLogs;
        DBCC CHECKIDENT ('dbo.AuditLogs', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Documents', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Documents;
        DBCC CHECKIDENT ('dbo.Documents', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.FlightBookings', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.FlightBookings;
        DBCC CHECKIDENT ('dbo.FlightBookings', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.VisaProcesses', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.VisaProcesses;
        DBCC CHECKIDENT ('dbo.VisaProcesses', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.SmartCardProcesses', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.SmartCardProcesses;
        DBCC CHECKIDENT ('dbo.SmartCardProcesses', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.VisaApplications', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.VisaApplications;
        DBCC CHECKIDENT ('dbo.VisaApplications', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.SmartCardApplications', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.SmartCardApplications;
        DBCC CHECKIDENT ('dbo.SmartCardApplications', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Interviews', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Interviews;
        DBCC CHECKIDENT ('dbo.Interviews', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Applications', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Applications;
        DBCC CHECKIDENT ('dbo.Applications', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.ProspectJobMatches', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.ProspectJobMatches;
        DBCC CHECKIDENT ('dbo.ProspectJobMatches', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.ProspectStatusHistory', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.ProspectStatusHistory;
        DBCC CHECKIDENT ('dbo.ProspectStatusHistory', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.ClientStatusHistory', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.ClientStatusHistory;
        DBCC CHECKIDENT ('dbo.ClientStatusHistory', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Payments;
        DBCC CHECKIDENT ('dbo.Payments', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Clients', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Clients;
        DBCC CHECKIDENT ('dbo.Clients', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Prospects', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Prospects;
        DBCC CHECKIDENT ('dbo.Prospects', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Jobs', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Jobs;
        DBCC CHECKIDENT ('dbo.Jobs', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Employers', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Employers;
        DBCC CHECKIDENT ('dbo.Employers', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.UserRoles', 'U') IS NOT NULL
        DELETE FROM dbo.UserRoles;

    IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Users;
        DBCC CHECKIDENT ('dbo.Users', RESEED, 0);
    END;

    IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL
    BEGIN
        DELETE FROM dbo.Roles;
        DBCC CHECKIDENT ('dbo.Roles', RESEED, 0);
    END;

    ------------------------------------------------------------
    -- Seed reference data: Roles & Users
    ------------------------------------------------------------
    DECLARE @Roles TABLE (id INT, name NVARCHAR(100));

    INSERT INTO dbo.Roles (name)
    OUTPUT INSERTED.id, INSERTED.name INTO @Roles
    VALUES
        ('Admin'),
        ('Staff');

    DECLARE @Users TABLE (id BIGINT, email NVARCHAR(255));

    INSERT INTO dbo.Users (email, password_hash, full_name, is_active)
    OUTPUT INSERTED.id, INSERTED.email INTO @Users
    VALUES
        ('admin@example.com', '$2a$10$cxWl4mbv8.7upD.ahZ.0eOnY.kH8Ql9zIzCjZtXU8YMYgJxpfC5/G', 'Alex Admin', 1),
        ('staff@example.com', '$2a$10$1xZvQ0QnfyLoPz3xmQaOteo/Nm7Kjb5v03S3nEW6SbPlpjBPIuXK2', 'Sasha Staff', 1),
        ('coordinator@example.com', '$2a$10$1xZvQ0QnfyLoPz3xmQaOteo/Nm7Kjb5v03S3nEW6SbPlpjBPIuXK2', 'Casey Coordinator', 1);

    -- Backfill created_at/updated_at when columns exist
    IF COL_LENGTH('dbo.Users', 'created_at') IS NOT NULL
    BEGIN
        UPDATE u
        SET created_at = DATEADD(DAY, -5, SYSUTCDATETIME())
        FROM dbo.Users u
        JOIN @Users x ON x.id = u.id;
    END;

    IF COL_LENGTH('dbo.Users', 'updated_at') IS NOT NULL
    BEGIN
        UPDATE u
        SET updated_at = SYSUTCDATETIME()
        FROM dbo.Users u
        JOIN @Users x ON x.id = u.id;
    END;

    INSERT INTO dbo.UserRoles (user_id, role_id)
    SELECT u.id, r.id
    FROM @Users u
    JOIN @Roles r
      ON (u.email = 'admin@example.com' AND r.name = 'Admin')
      OR (u.email <> 'admin@example.com' AND r.name = 'Staff');

    ------------------------------------------------------------
    -- Employers
    ------------------------------------------------------------
    DECLARE @Employers TABLE (id BIGINT, name NVARCHAR(200));

    INSERT INTO dbo.Employers (name, country, contact_name, contact_email, contact_phone, address, created_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.name INTO @Employers
    SELECT v.name, v.country, v.contact_name, v.contact_email, v.contact_phone, v.address,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()), 0
    FROM (VALUES
        ('Global Manufacturing Co', 'Singapore', 'Mei Tan', 'mei.tan@gmc.sg', '+65 6123 4000', '3 Harbourfront Pl, Singapore', 60),
        ('Harbour Hospitality', 'Malaysia', 'Arif Rahman', 'arif@harbourhotel.my', '+60 12-456 7890', '12 Jalan Ampang, Kuala Lumpur', 52),
        ('Northern Tech Solutions', 'Canada', 'Sarah Cole', 'sarah.cole@northerntech.ca', '+1 416-555-0182', '101 King St W, Toronto', 48),
        ('Desert Logistics', 'United Arab Emirates', 'Hassan Al-Farsi', 'hassan@desertlogistics.ae', '+971 4 555 2121', 'Sheikh Zayed Rd, Dubai', 45),
        ('Pacific Agriculture', 'Australia', 'Olivia Harris', 'olivia.harris@pacagri.au', '+61 2 8000 5544', '85 George St, Sydney', 40)
    ) AS v(name, country, contact_name, contact_email, contact_phone, address, days_ago);

    ------------------------------------------------------------
    -- Jobs
    ------------------------------------------------------------
    DECLARE @Jobs TABLE (id BIGINT, title NVARCHAR(200));

    INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active, created_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.title INTO @Jobs
    SELECT e.id, v.title, v.description, v.location_country, v.requirements, v.salary, v.is_active,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()), 0
    FROM (VALUES
        ('Global Manufacturing Co', 'CNC Operator', 'Operate CNC machines for precision parts.', 'Singapore', '3+ years machining experience', 3200.00, 1, 50),
        ('Global Manufacturing Co', 'Quality Inspector', 'Inspect manufactured parts for quality assurance.', 'Singapore', 'Attention to detail, QA experience', 2800.00, 1, 45),
        ('Harbour Hospitality', 'Front Desk Associate', 'Customer-facing hospitality professional.', 'Malaysia', 'Excellent customer service skills', 2200.00, 1, 40),
        ('Harbour Hospitality', 'Sous Chef', 'Assist head chef in daily kitchen operations.', 'Malaysia', 'Culinary diploma, 4+ years experience', 2600.00, 1, 38),
        ('Northern Tech Solutions', 'IT Support Specialist', 'Provide remote and onsite IT support.', 'Canada', 'CompTIA A+ or similar certification', 4200.00, 1, 42),
        ('Desert Logistics', 'Warehouse Supervisor', 'Manage warehouse operations and staff.', 'United Arab Emirates', '5+ years logistics experience', 3800.00, 1, 36),
        ('Pacific Agriculture', 'Greenhouse Technician', 'Maintain greenhouse crops and equipment.', 'Australia', 'Agriculture diploma preferred', 3400.00, 1, 34),
        ('Pacific Agriculture', 'Irrigation Specialist', 'Plan and execute irrigation schedules.', 'Australia', 'Knowledge of irrigation systems', 3600.00, 1, 32)
    ) AS v(employer_name, title, description, location_country, requirements, salary, is_active, days_ago)
    JOIN @Employers e ON e.name = v.employer_name;

    ------------------------------------------------------------
    -- Prospects (30 sample records across pipeline stages)
    ------------------------------------------------------------
    DECLARE @Prospects TABLE (id BIGINT, full_name NVARCHAR(150), status NVARCHAR(50));

    INSERT INTO dbo.Prospects (
        full_name, dob, passport_no, contact_email, contact_phone, address,
        highest_qualification, status, interested_job_id, remarks1, remarks2,
        created_at, isDeleted
    )
    OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.status INTO @Prospects
    SELECT
        v.full_name,
        CAST(v.dob AS DATE),
        v.passport_no,
        v.contact_email,
        v.contact_phone,
        v.address,
        v.highest_qualification,
        v.status,
        j.id,
        v.remarks1,
        v.remarks2,
        DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
        0
    FROM (VALUES
        ('Aileen Fernandez', '1990-02-14', 'P1234561', 'aileen.fernandez@example.com', '+63 917 200 1001', 'Quezon City, Philippines', 'Bachelor of Science', 'enquiry', 'CNC Operator', 'Initial enquiry for manufacturing roles', NULL, 20),
        ('Bharat Iyer', '1988-05-09', 'P1234562', 'bharat.iyer@example.com', '+91 98200 11002', 'Chennai, India', 'Diploma in Mechanical', 'enquiry', 'Quality Inspector', 'Interested in QA opportunities', NULL, 22),
        ('Cheryl Lim', '1994-07-01', 'P1234563', 'cheryl.lim@example.com', '+65 8123 4003', 'Woodlands, Singapore', 'Bachelor of Hospitality', 'enquiry', 'Front Desk Associate', 'Hospitality graduate exploring overseas options', NULL, 18),
        ('Derrick Owusu', '1991-09-17', 'P1234564', 'derrick.owusu@example.com', '+233 24 222 4004', 'Accra, Ghana', 'Bachelor of Business', 'enquiry', 'Warehouse Supervisor', 'Strong logistics background', NULL, 17),
        ('Eunice Park', '1995-11-22', 'P1234565', 'eunice.park@example.com', '+82 10-2345-4005', 'Busan, South Korea', 'Bachelor of IT', 'enquiry', 'IT Support Specialist', 'Prefers remote support roles', NULL, 16),
        ('Farhan Malik', '1992-03-03', 'P1234566', 'farhan.malik@example.com', '+92 301 456 4006', 'Lahore, Pakistan', 'Bachelor of Commerce', 'job_matched', 'Warehouse Supervisor', 'Matched to Desert Logistics', 'Awaiting candidate confirmation', 15),
        ('Gabriela Ortiz', '1993-04-12', 'P1234567', 'gabriela.ortiz@example.com', '+52 55 7890 4007', 'Mexico City, Mexico', 'Bachelor of Engineering', 'job_matched', 'CNC Operator', 'Strong machining portfolio', 'Wants relocation assistance', 14),
        ('Hassan Ali', '1987-06-27', 'P1234568', 'hassan.ali@example.com', '+971 50 555 4008', 'Sharjah, UAE', 'Diploma in Logistics', 'job_matched', 'Warehouse Supervisor', 'Ready for interview scheduling', NULL, 13),
        ('Isabella Rossi', '1996-08-18', 'P1234569', 'isabella.rossi@example.com', '+39 329 678 4009', 'Milan, Italy', 'Master in Hospitality', 'jobmatch_approved', 'Sous Chef', 'Approved by employer', 'Needs visa guidance', 12),
        ('Joshua Mensah', '1990-01-05', 'P1234570', 'joshua.mensah@example.com', '+233 27 880 4010', 'Kumasi, Ghana', 'Bachelor of Agriculture', 'jobmatch_approved', 'Greenhouse Technician', 'Candidate excited for move', NULL, 11),
        ('Katarina Nowak', '1992-10-29', 'P1234571', 'katarina.nowak@example.com', '+48 600 4011', 'Krakow, Poland', 'Bachelor of IT', 'jobmatch_approved', 'IT Support Specialist', 'Approved by client CTO', NULL, 10),
        ('Lloyd Patterson', '1989-12-07', 'P1234572', 'lloyd.patterson@example.com', '+44 7700 4012', 'Manchester, UK', 'Diploma in Culinary Arts', 'application_drafted', 'Sous Chef', 'Drafting application documents', 'Requires transcript copies', 9),
        ('Monique Dupont', '1991-04-30', 'P1234573', 'monique.dupont@example.com', '+33 6 88 4013', 'Lyon, France', 'Bachelor of Hospitality', 'application_drafted', 'Front Desk Associate', 'Collecting reference letters', NULL, 9),
        ('Nikhil Suresh', '1993-02-19', 'P1234574', 'nikhil.suresh@example.com', '+91 99876 4014', 'Bengaluru, India', 'Bachelor of Engineering', 'application_drafted', 'CNC Operator', 'Awaiting degree attestation', NULL, 8),
        ('Olivia Chen', '1995-05-25', 'P1234575', 'olivia.chen@example.com', '+886 912 4015', 'Taipei, Taiwan', 'Master in Supply Chain', 'application_submitted', 'Warehouse Supervisor', 'Submitted to employer', NULL, 7),
        ('Pedro Alvarez', '1990-07-11', 'P1234576', 'pedro.alvarez@example.com', '+34 612 4016', 'Madrid, Spain', 'Bachelor of Finance', 'application_submitted', 'IT Support Specialist', 'Submitted on priority', NULL, 7),
        ('Qi Wei', '1994-09-09', 'P1234577', 'qi.wei@example.com', '+86 139 4017 8888', 'Chengdu, China', 'Bachelor of Mechanical', 'application_submitted', 'CNC Operator', 'Submitted - awaiting review', NULL, 6),
        ('Rania Hussein', '1991-01-21', 'P1234578', 'rania.hussein@example.com', '+20 100 4018 000', 'Cairo, Egypt', 'Bachelor of Hospitality', 'interview_scheduled', 'Front Desk Associate', 'Interview scheduled for next week', NULL, 5),
        ('Samuel Wright', '1988-11-02', 'P1234579', 'samuel.wright@example.com', '+61 412 4019 333', 'Perth, Australia', 'Diploma in Agriculture', 'interview_scheduled', 'Greenhouse Technician', 'Interview confirmed', 'Preparing greenhouse case study', 5),
        ('Tatiana Petrova', '1992-03-28', 'P1234580', 'tatiana.petrova@example.com', '+7 921 4020 444', 'Saint Petersburg, Russia', 'Bachelor of Logistics', 'interview_passed', 'Warehouse Supervisor', 'Interview successful', 'Awaiting offer letter', 4),
        ('Usman Bello', '1993-06-14', 'P1234581', 'usman.bello@example.com', '+234 803 4021 555', 'Abuja, Nigeria', 'Bachelor of IT', 'interview_passed', 'IT Support Specialist', 'Passed technical interview', 'Visa preparation started', 4),
        ('Valerie Gomez', '1995-12-19', 'P1234582', 'valerie.gomez@example.com', '+57 310 4022 666', 'Bogotá, Colombia', 'Bachelor of Hospitality', 'interview_passed', 'Front Desk Associate', 'Outstanding documents collected', NULL, 4),
        ('Wang Lei', '1990-08-08', 'P1234583', 'wang.lei@example.com', '+86 136 4023 7777', 'Shanghai, China', 'Bachelor of Engineering', 'interview_passed', 'CNC Operator', 'Ready for promotion to client', 'Needs medical schedule', 3),
        ('Xiomara Ortiz', '1994-04-04', 'P1234584', 'xiomara.ortiz@example.com', '+505 8888 4024', 'Managua, Nicaragua', 'Bachelor of Tourism', 'interview_passed', 'Front Desk Associate', 'All interviews done', 'Document verification pending', 3),
        ('Yusuf Demir', '1987-02-02', 'P1234585', 'yusuf.demir@example.com', '+90 532 4025 999', 'Istanbul, Turkey', 'Bachelor of Logistics', 'interview_passed', 'Warehouse Supervisor', 'Offered role', 'Negotiating package', 2),
        ('Zara Khan', '1993-01-15', 'P1234586', 'zara.khan@example.com', '+971 55 4026 101', 'Dubai, UAE', 'Master in Business', 'interview_passed', 'IT Support Specialist', 'Ready for onboarding', 'Awaiting visa approval', 2),
        ('Aaron Smith', '1990-10-10', 'P1234587', 'aaron.smith@example.com', '+1 415 4027 202', 'San Francisco, USA', 'Bachelor of Agriculture', 'interview_passed', 'Greenhouse Technician', 'All steps cleared', 'Expecting deployment', 1),
        ('Bella Rivera', '1995-05-05', 'P1234588', 'bella.rivera@example.com', '+63 917 4028 303', 'Cebu, Philippines', 'Bachelor of Nursing', 'interview_passed', 'Front Desk Associate', 'Ready for promotion', 'Medical completed', 1),
        ('Carlos Mendes', '1989-03-23', 'P1234589', 'carlos.mendes@example.com', '+55 11 4029 404', 'São Paulo, Brazil', 'Bachelor of Logistics', 'interview_passed', 'Warehouse Supervisor', 'Awaiting flight booking', 'Has valid visa', 1),
        ('Dina Haddad', '1992-07-18', 'P1234590', 'dina.haddad@example.com', '+962 79 4030 505', 'Amman, Jordan', 'Bachelor of Hospitality', 'interview_passed', 'Front Desk Associate', 'Promotion pending', NULL, 1)
    ) AS v(full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, job_title, remarks1, remarks2, days_ago)
    LEFT JOIN @Jobs j ON j.title = v.job_title;

    ------------------------------------------------------------
    -- Prospect status history (initial entries)
    ------------------------------------------------------------
    IF OBJECT_ID('dbo.ProspectStatusHistory', 'U') IS NOT NULL
    BEGIN
        INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
        SELECT p.id, p.status, p.status, (SELECT id FROM @Users WHERE email = 'admin@example.com'), DATEADD(DAY, -1, SYSUTCDATETIME()), 'Seeded status'
        FROM @Prospects p;
    END;

    ------------------------------------------------------------
    -- Clients (20 records across statuses)
    ------------------------------------------------------------
    DECLARE @Clients TABLE (id BIGINT, full_name NVARCHAR(150), status NVARCHAR(50));

    INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1, created_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.full_name, INSERTED.status INTO @Clients
    SELECT
        p.id,
        p.full_name,
        p.passport_no,
        v.status,
        v.remarks,
        DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
        0
    FROM (VALUES
        ('Tatiana Petrova', 'Newly_Promoted', 'Converted after interview success', 20),
        ('Usman Bello', 'Newly_Promoted', 'Recently promoted from pipeline', 19),
        ('Valerie Gomez', 'SmartCard_InProgress', 'Smartcard documents submitted', 18),
        ('Wang Lei', 'SmartCard_InProgress', 'Awaiting smartcard issuance', 17),
        ('Xiomara Ortiz', 'Visa_InProgress', 'Visa lodged with embassy', 16),
        ('Yusuf Demir', 'Visa_InProgress', 'Employer letter pending', 15),
        ('Zara Khan', 'Payment_Pending', 'Invoice sent awaiting payment', 14),
        ('Aaron Smith', 'Payment_Pending', 'Invoice shared with candidate', 13),
        ('Bella Rivera', 'FlightBooking_Pending', 'Ready for travel booking', 12),
        ('Carlos Mendes', 'FlightBooking_Pending', 'Coordinating travel dates', 11),
        ('Dina Haddad', 'Accommodation_Pending', 'Arranging accommodation options', 10),
        ('Olivia Chen', 'Accommodation_Pending', 'Awaiting housing confirmation', 9),
        ('Pedro Alvarez', 'Approved_For_Deployment', 'Deployment approved by client', 8),
        ('Qi Wei', 'Approved_For_Deployment', 'Final briefing scheduled', 7),
        ('Samuel Wright', 'Departed', 'Departed for assignment', 6),
        ('Rania Hussein', 'SmartCard_InProgress', 'Smartcard application drafted', 13),
        ('Gabriela Ortiz', 'Visa_InProgress', 'Collecting visa documentation', 12),
        ('Hassan Ali', 'Payment_Pending', 'Awaiting security deposit', 11),
        ('Isabella Rossi', 'FlightBooking_Pending', 'Preparing travel arrangements', 10),
        ('Joshua Mensah', 'Accommodation_Pending', 'Sourcing housing near worksite', 9)
    ) AS v(prospect_name, status, remarks, days_ago)
    JOIN @Prospects p ON p.full_name = v.prospect_name;

    ------------------------------------------------------------
    -- Client status history
    ------------------------------------------------------------
    IF OBJECT_ID('dbo.ClientStatusHistory', 'U') IS NOT NULL
    BEGIN
        INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, changed_at, remarks)
        SELECT c.id, c.status, c.status, (SELECT id FROM @Users WHERE email = 'admin@example.com'), DATEADD(HOUR, -2, SYSUTCDATETIME()), 'Seeded status'
        FROM @Clients c;
    END;

    ------------------------------------------------------------
    -- Prospect job matches (8 examples)
    ------------------------------------------------------------
    DECLARE @ProspectJobMatches TABLE (id BIGINT, prospect_id BIGINT, job_id BIGINT);

    INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current, created_at, updated_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.prospect_id, INSERTED.job_id INTO @ProspectJobMatches
    SELECT p.id, j.id, u.id, v.status, v.rationale, v.is_current,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()), DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()), 0
    FROM (VALUES
        ('Farhan Malik', 'Warehouse Supervisor', 'staff@example.com', 'pending_review', 'Match identified for logistics opening', 1, 10),
        ('Gabriela Ortiz', 'CNC Operator', 'staff@example.com', 'pending_review', 'Skilled CNC operator ready for assessment', 1, 9),
        ('Isabella Rossi', 'Sous Chef', 'admin@example.com', 'approved', 'Approved by hospitality director', 1, 7),
        ('Joshua Mensah', 'Greenhouse Technician', 'admin@example.com', 'approved', 'Great fit for agriculture project', 1, 7),
        ('Katarina Nowak', 'IT Support Specialist', 'staff@example.com', 'pending_review', 'Needs final approval from CTO', 1, 6),
        ('Olivia Chen', 'Warehouse Supervisor', 'admin@example.com', 'approved', 'Employer confirmed candidate', 1, 5),
        ('Pedro Alvarez', 'IT Support Specialist', 'staff@example.com', 'pending_review', 'Awaiting employer interview', 1, 4),
        ('Tatiana Petrova', 'Warehouse Supervisor', 'admin@example.com', 'approved', 'Cleared for onboarding', 1, 3)
    ) AS v(prospect_name, job_title, matched_by_email, status, rationale, is_current, days_ago)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    JOIN @Jobs j ON j.title = v.job_title
    JOIN @Users u ON u.email = v.matched_by_email;

    ------------------------------------------------------------
    -- Applications (10 records)
    ------------------------------------------------------------
    DECLARE @Applications TABLE (id BIGINT, prospect_id BIGINT, job_id BIGINT);

    INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, employer_response_at, notes, created_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.prospect_id, INSERTED.job_id INTO @Applications
    SELECT p.id, j.id, u.id, v.status,
           CASE WHEN v.status = 'Submitted' THEN DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()) ELSE NULL END,
           CASE WHEN v.status IN ('Rejected','Shortlisted') THEN DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()) ELSE NULL END,
           v.notes,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Lloyd Patterson', 'Sous Chef', 'admin@example.com', 'Draft', 'Preparing final paperwork', 8),
        ('Monique Dupont', 'Front Desk Associate', 'staff@example.com', 'Draft', 'Collecting references', 8),
        ('Nikhil Suresh', 'CNC Operator', 'staff@example.com', 'Draft', 'Reviewing employment history', 7),
        ('Olivia Chen', 'Warehouse Supervisor', 'admin@example.com', 'Submitted', 'Submitted to employer', 6),
        ('Pedro Alvarez', 'IT Support Specialist', 'staff@example.com', 'Submitted', 'Submitted with updated CV', 6),
        ('Qi Wei', 'CNC Operator', 'admin@example.com', 'Submitted', 'Employer reviewing', 5),
        ('Rania Hussein', 'Front Desk Associate', 'staff@example.com', 'Submitted', 'Interview scheduled', 4),
        ('Samuel Wright', 'Greenhouse Technician', 'admin@example.com', 'Submitted', 'Employer impressed with experience', 4),
        ('Tatiana Petrova', 'Warehouse Supervisor', 'admin@example.com', 'Submitted', 'Offer pending', 3),
        ('Usman Bello', 'IT Support Specialist', 'staff@example.com', 'Submitted', 'Awaiting final confirmation', 3)
    ) AS v(prospect_name, job_title, submitted_by_email, status, notes, days_ago)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    JOIN @Jobs j ON j.title = v.job_title
    JOIN @Users u ON u.email = v.submitted_by_email;

    ------------------------------------------------------------
    -- Interviews (6 records)
    ------------------------------------------------------------
    DECLARE @Interviews TABLE (id BIGINT, prospect_id BIGINT, application_id BIGINT);

    INSERT INTO dbo.Interviews (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.prospect_id, INSERTED.application_id INTO @Interviews
    SELECT p.id, a.id, e.id, DATEADD(DAY, v.offset_days, SYSUTCDATETIME()), v.mode, v.location, v.outcome,
           u.id, DATEADD(DAY, -v.created_days, SYSUTCDATETIME()), 0
    FROM (VALUES
        ('Rania Hussein', 'Front Desk Associate', 'Harbour Hospitality', 'Video', 'Teams', 'Pending', -2, 4),
        ('Samuel Wright', 'Greenhouse Technician', 'Pacific Agriculture', 'In-person', 'Perth Office', 'Pending', -1, 4),
        ('Tatiana Petrova', 'Warehouse Supervisor', 'Desert Logistics', 'Video', 'Zoom', 'Pass', -3, 5),
        ('Usman Bello', 'IT Support Specialist', 'Northern Tech Solutions', 'Video', 'Google Meet', 'Pass', -2, 5),
        ('Valerie Gomez', 'Front Desk Associate', 'Harbour Hospitality', 'Video', 'Teams', 'Pending', -1, 3),
        ('Wang Lei', 'CNC Operator', 'Global Manufacturing Co', 'In-person', 'Singapore HQ', 'Pass', -4, 6)
    ) AS v(prospect_name, job_title, employer_name, mode, location, outcome, offset_days, created_days)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    JOIN @Jobs j ON j.title = v.job_title
    JOIN @Employers e ON e.name = v.employer_name
    JOIN @Applications a ON a.prospect_id = p.id AND a.job_id = j.id
    JOIN @Users u ON u.email = 'admin@example.com';

    ------------------------------------------------------------
    -- Documents (10 records)
    ------------------------------------------------------------
    INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks, created_at, updated_at, isDeleted)
    SELECT
        p.id,
        c.id,
        v.type,
        v.status,
        v.file_url,
        v.remarks,
        DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
        DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()),
        0
    FROM (VALUES
        ('Tatiana Petrova', 'Tatiana Petrova', 'Passport', 'Uploaded', 'https://files.example.com/docs/tatiana-passport.pdf', 'Verified passport copy', 8),
        ('Usman Bello', 'Usman Bello', 'Photo', 'Verified', 'https://files.example.com/photos/usman.jpg', 'Meets embassy requirements', 7),
        ('Valerie Gomez', 'Valerie Gomez', 'EducationCert', 'Uploaded', 'https://files.example.com/docs/valerie-degree.pdf', 'Degree certificate uploaded', 6),
        ('Wang Lei', 'Wang Lei', 'MedicalCheck', 'Pending', 'https://files.example.com/docs/wang-medical.pdf', 'Awaiting medical report review', 5),
        ('Xiomara Ortiz', 'Xiomara Ortiz', 'PoliceClearance', 'Uploaded', 'https://files.example.com/docs/xiomara-police.pdf', 'Police clearance valid', 5),
        ('Yusuf Demir', NULL, 'VisaForm', 'Draft', 'https://files.example.com/docs/yusuf-visaform.pdf', 'To be signed', 4),
        ('Zara Khan', NULL, 'SmartCardForm', 'Uploaded', 'https://files.example.com/docs/zara-smartcard.pdf', 'SmartCard submission', 4),
        ('Aaron Smith', 'Aaron Smith', 'Passport', 'Verified', 'https://files.example.com/docs/aaron-passport.pdf', 'Ready for booking', 3),
        ('Bella Rivera', 'Bella Rivera', 'Photo', 'Uploaded', 'https://files.example.com/photos/bella.jpg', 'Awaiting approval', 3),
        ('Carlos Mendes', 'Carlos Mendes', 'Other', 'Uploaded', 'https://files.example.com/docs/carlos-training.pdf', 'Warehouse certification', 2)
    ) AS v(prospect_name, client_name, type, status, file_url, remarks, days_ago)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    LEFT JOIN @Clients c ON c.full_name = v.client_name;

    ------------------------------------------------------------
    -- Payments (6 records)
    ------------------------------------------------------------
    INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description, created_at)
    SELECT c.id, v.amount, v.currency, v.status,
           u.id,
           CASE WHEN v.status = 'Paid' THEN DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()) ELSE NULL END,
           v.reference_no,
           v.invoice_description,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME())
    FROM (VALUES
        ('Zara Khan', 950.00, 'SGD', 'Pending', 'INV-SG-1001', 'Initial placement invoice', 6),
        ('Aaron Smith', 1200.00, 'AUD', 'Pending', 'INV-AU-2001', 'Deployment invoice', 5),
        ('Bella Rivera', 850.00, 'SGD', 'Paid', 'INV-SG-1002', 'SmartCard processing fee', 4),
        ('Carlos Mendes', 1100.00, 'AED', 'Paid', 'INV-AE-3001', 'Visa processing fee', 4),
        ('Dina Haddad', 900.00, 'AED', 'Pending', 'INV-AE-3002', 'Accommodation retainer', 3),
        ('Olivia Chen', 1000.00, 'SGD', 'Paid', 'INV-SG-1003', 'Final placement payment', 3)
    ) AS v(client_name, amount, currency, status, reference_no, invoice_description, days_ago)
    JOIN @Clients c ON c.full_name = v.client_name
    JOIN @Users u ON u.email = 'admin@example.com';

    ------------------------------------------------------------
    -- SmartCard applications (5 records)
    ------------------------------------------------------------
    DECLARE @SmartCardApps TABLE (id BIGINT, client_id BIGINT, card_number NVARCHAR(100));

    INSERT INTO dbo.SmartCardApplications (prospect_id, client_id, card_number, status, submitted_at, issued_at, expires_at, notes, created_at, updated_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.client_id, INSERTED.card_number INTO @SmartCardApps
    SELECT p.id, c.id, v.card_number, v.status,
           DATEADD(DAY, -v.submitted_days, SYSUTCDATETIME()),
           v.issued_at,
           v.expires_at,
           v.notes,
           DATEADD(DAY, -v.created_days, SYSUTCDATETIME()),
           DATEADD(DAY, -v.created_days + 1, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Valerie Gomez', 'Valerie Gomez', 'SC-2024-001', 'Processing', 8, NULL, NULL, 'Awaiting biometric appointment', 9),
        ('Wang Lei', 'Wang Lei', 'SC-2024-002', 'Issued', 10, DATEADD(DAY, -5, SYSUTCDATETIME()), DATEADD(YEAR, 1, SYSUTCDATETIME()), 'Issued after verification', 10),
        ('Xiomara Ortiz', 'Xiomara Ortiz', 'SC-2024-003', 'Submitted', 6, NULL, NULL, 'Submitted to authority', 7),
        ('Yusuf Demir', 'Yusuf Demir', 'SC-2024-004', 'Draft', 4, NULL, NULL, 'Documents collected', 6),
        ('Zara Khan', 'Zara Khan', 'SC-2024-005', 'Processing', 5, NULL, NULL, 'Pending fingerprint', 5)
    ) AS v(prospect_name, client_name, card_number, status, submitted_days, issued_at, expires_at, notes, created_days)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    JOIN @Clients c ON c.full_name = v.client_name;

    ------------------------------------------------------------
    -- Visa applications (5 records)
    ------------------------------------------------------------
    DECLARE @VisaApps TABLE (id BIGINT, client_id BIGINT, visa_type NVARCHAR(100), application_no NVARCHAR(100));

    INSERT INTO dbo.VisaApplications (prospect_id, client_id, visa_type, application_no, status, submitted_at, approved_at, notes, created_at, updated_at, isDeleted)
    OUTPUT INSERTED.id, INSERTED.client_id, INSERTED.visa_type, INSERTED.application_no INTO @VisaApps
    SELECT p.id, c.id, v.visa_type, v.application_no, v.status,
           DATEADD(DAY, -v.submitted_days, SYSUTCDATETIME()),
           v.approved_at,
           v.notes,
           DATEADD(DAY, -v.created_days, SYSUTCDATETIME()),
           DATEADD(DAY, -v.created_days + 1, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Xiomara Ortiz', 'Xiomara Ortiz', 'Employment', 'VA-2024-1001', 'Processing', 7, NULL, 'Awaiting embassy appointment', 8),
        ('Yusuf Demir', 'Yusuf Demir', 'Employment', 'VA-2024-1002', 'Draft', 5, NULL, 'Collecting supporting docs', 7),
        ('Zara Khan', 'Zara Khan', 'Specialist', 'VA-2024-1003', 'Submitted', 6, NULL, 'Submitted to consulate', 6),
        ('Aaron Smith', 'Aaron Smith', 'Skilled Worker', 'VA-2024-1004', 'Approved', 10, DATEADD(DAY, -2, SYSUTCDATETIME()), 'Visa approved', 10),
        ('Bella Rivera', 'Bella Rivera', 'Hospitality', 'VA-2024-1005', 'Processing', 8, NULL, 'Awaiting biometrics', 8)
    ) AS v(prospect_name, client_name, visa_type, application_no, status, submitted_days, approved_at, notes, created_days)
    JOIN @Prospects p ON p.full_name = v.prospect_name
    JOIN @Clients c ON c.full_name = v.client_name;

    ------------------------------------------------------------
    -- SmartCard processes (5 records)
    ------------------------------------------------------------
    INSERT INTO dbo.SmartCardProcesses (client_id, application_id, status, attempt_count, remarks, created_at, updated_at, isDeleted)
    SELECT c.id, sc.card_number, v.status, v.attempt_count, v.remarks,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
           DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Valerie Gomez', 'SC-2024-001', 'Drafted', 1, 'Awaiting supporting documents', 5),
        ('Wang Lei', 'SC-2024-002', 'Submitted', 1, 'Submitted to authority', 4),
        ('Xiomara Ortiz', 'SC-2024-003', 'Drafted', 0, 'Preparing submission', 4),
        ('Yusuf Demir', 'SC-2024-004', 'Drafted', 0, 'Gathering details', 3),
        ('Zara Khan', 'SC-2024-005', 'Drafted', 0, 'Final review pending', 3)
    ) AS v(client_name, card_number, status, attempt_count, remarks, days_ago)
    JOIN @Clients c ON c.full_name = v.client_name
    JOIN @SmartCardApps sc ON sc.client_id = c.id AND sc.card_number = v.card_number;

    ------------------------------------------------------------
    -- Visa processes (5 records)
    ------------------------------------------------------------
    INSERT INTO dbo.VisaProcesses (client_id, application_id, visa_type, status, attempt_count, remarks, created_at, updated_at, isDeleted)
    SELECT c.id, va.application_no, v.visa_type, v.status, v.attempt_count, v.remarks,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
           DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Xiomara Ortiz', 'Employment', 'Drafted', 0, 'Preparing visa file', 4),
        ('Yusuf Demir', 'Employment', 'Drafted', 0, 'Awaiting company documents', 3),
        ('Zara Khan', 'Specialist', 'Submitted', 1, 'Submitted to embassy', 3),
        ('Aaron Smith', 'Skilled Worker', 'Approved', 1, 'Visa approved by consulate', 2),
        ('Bella Rivera', 'Hospitality', 'Drafted', 0, 'Collecting accommodation proof', 2)
    ) AS v(client_name, visa_type, status, attempt_count, remarks, days_ago)
    JOIN @Clients c ON c.full_name = v.client_name
    JOIN @VisaApps va ON va.client_id = c.id AND va.visa_type = v.visa_type;

    ------------------------------------------------------------
    -- Flight bookings (5 records)
    ------------------------------------------------------------
    INSERT INTO dbo.FlightBookings (client_id, airline, flight_datetime, booking_reference, remarks, created_at, updated_at, isDeleted)
    SELECT c.id, v.airline, DATEADD(DAY, v.departure_offset, SYSUTCDATETIME()), v.booking_reference, v.remarks,
           DATEADD(DAY, -v.days_ago, SYSUTCDATETIME()),
           DATEADD(DAY, -v.days_ago + 1, SYSUTCDATETIME()),
           0
    FROM (VALUES
        ('Bella Rivera', 'Singapore Airlines', 12, 'SQ9821', 'Awaiting ticket issuance', 4),
        ('Carlos Mendes', 'Emirates', 15, 'EK2310', 'Coordinating baggage allowance', 4),
        ('Dina Haddad', 'Etihad Airways', 18, 'EY7755', 'Holding fare pending visa', 3),
        ('Olivia Chen', 'Qantas', 10, 'QF4056', 'Flight confirmed', 3),
        ('Aaron Smith', 'Air Canada', 8, 'AC7721', 'Travel confirmed with employer', 2)
    ) AS v(client_name, airline, departure_offset, booking_reference, remarks, days_ago)
    JOIN @Clients c ON c.full_name = v.client_name;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

/* ===============================================================
   OJPMS / MMPL — Comprehensive Seed Data (Idempotent)
   Target DB: ojpms_dev
   Updated: includes soft delete + prospect statuses + history + checklist items
   =============================================================== */

IF DB_ID('ojpms_dev') IS NULL
BEGIN
    RAISERROR('❌ Database ojpms_dev not found. Run the schema script first.', 16, 1);
    RETURN;
END
GO

USE ojpms_dev;
GO

/* 1) Roles */
IF NOT EXISTS (SELECT 1 FROM Roles WHERE name='Admin') INSERT INTO Roles(name) VALUES ('Admin');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE name='Staff') INSERT INTO Roles(name) VALUES ('Staff');
DECLARE @role_admin INT = (SELECT id FROM Roles WHERE name='Admin');
DECLARE @role_staff INT = (SELECT id FROM Roles WHERE name='Staff');

/* 2) Users (replace hashes!) */
IF NOT EXISTS (SELECT 1 FROM Users WHERE email='admin@example.com')
INSERT INTO Users (full_name, email, password_hash, phone, is_active, isDeleted)
VALUES ('Admin User', 'admin@example.com', '$2b$10$replace_with_real_admin_hash', '+65 6000 0000', 1, 0);
IF NOT EXISTS (SELECT 1 FROM Users WHERE email='staff@example.com')
INSERT INTO Users (full_name, email, password_hash, phone, is_active, isDeleted)
VALUES ('Staff User', 'staff@example.com', '$2b$10$replace_with_real_staff_hash', '+65 6000 0001', 1, 0);
DECLARE @admin_id BIGINT = (SELECT id FROM Users WHERE email='admin@example.com');
DECLARE @staff_id  BIGINT = (SELECT id FROM Users WHERE email='staff@example.com');
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE user_id=@admin_id AND role_id=@role_admin) INSERT INTO UserRoles (user_id, role_id) VALUES (@admin_id, @role_admin);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE user_id=@staff_id  AND role_id=@role_staff)  INSERT INTO UserRoles (user_id, role_id) VALUES (@staff_id,  @role_staff);

/* 3) Employers */
IF NOT EXISTS (SELECT 1 FROM Employers WHERE name='Sakura Bento Pte Ltd')
INSERT INTO Employers (name, country, contact_name, contact_email, contact_phone, address, isDeleted)
VALUES ('Sakura Bento Pte Ltd', 'Singapore', 'Ms. Tan', 'hr@sakura.example.com', '+65 6123 4567', '1 Bento Ave, #05-01, Singapore', 0);
IF NOT EXISTS (SELECT 1 FROM Employers WHERE name='Penang Kitchens Sdn Bhd')
INSERT INTO Employers (name, country, contact_name, contact_email, contact_phone, address, isDeleted)
VALUES ('Penang Kitchens Sdn Bhd', 'Malaysia', 'Mr. Lim', 'jobs@penangkitchens.example.my', '+60 3-1234 5678', '12 Jalan Makanan, Penang', 0);
IF NOT EXISTS (SELECT 1 FROM Employers WHERE name='Kyoto Hospitality KK')
INSERT INTO Employers (name, country, contact_name, contact_email, contact_phone, address, isDeleted)
VALUES ('Kyoto Hospitality KK', 'Japan', 'Ms. Suzuki', 'recruit@kyotohosp.example.jp', '+81 75-111-2222', '3-12 Gion, Kyoto', 0);
DECLARE @emp_sg BIGINT = (SELECT id FROM Employers WHERE name='Sakura Bento Pte Ltd');
DECLARE @emp_my BIGINT = (SELECT id FROM Employers WHERE name='Penang Kitchens Sdn Bhd');
DECLARE @emp_jp BIGINT = (SELECT id FROM Employers WHERE name='Kyoto Hospitality KK');

/* 4) Jobs */
IF NOT EXISTS (SELECT 1 FROM Jobs WHERE employer_id=@emp_sg AND title='Kitchen Helper')
INSERT INTO Jobs (employer_id, title, description, location_country, requirements, salary, is_active, isDeleted)
VALUES (@emp_sg, 'Kitchen Helper', N'Assist with food prep, cleaning, dishwashing.', 'Singapore', N'Basic English, hygiene cert preferred', 1800.00, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Jobs WHERE employer_id=@emp_sg AND title='Cashier')
INSERT INTO Jobs (employer_id, title, description, location_country, requirements, salary, is_active, isDeleted)
VALUES (@emp_sg, 'Cashier', N'Front counter customer service, cashiering.', 'Singapore', N'Conversational English, POS experience a plus', 2000.00, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Jobs WHERE employer_id=@emp_my AND title='Line Cook')
INSERT INTO Jobs (employer_id, title, description, location_country, requirements, salary, is_active, isDeleted)
VALUES (@emp_my, 'Line Cook', N'Prepare menu items on the line.', 'Malaysia', N'Kitchen experience, hygiene cert', 2500.00, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Jobs WHERE employer_id=@emp_jp AND title='Hotel Housekeeper')
INSERT INTO Jobs (employer_id, title, description, location_country, requirements, salary, is_active, isDeleted)
VALUES (@emp_jp, 'Hotel Housekeeper', N'Room cleaning and linen management.', 'Japan', N'Basic Japanese preferred; training provided', 230000.00, 1, 0);
DECLARE @job_sg_kitchen BIGINT = (SELECT id FROM Jobs WHERE employer_id=@emp_sg AND title='Kitchen Helper');
DECLARE @job_sg_cashier BIGINT = (SELECT id FROM Jobs WHERE employer_id=@emp_sg AND title='Cashier');
DECLARE @job_my_line    BIGINT = (SELECT id FROM Jobs WHERE employer_id=@emp_my AND title='Line Cook');
DECLARE @job_jp_house   BIGINT = (SELECT id FROM Jobs WHERE employer_id=@emp_jp AND title='Hotel Housekeeper');

/* 5) Prospects */
IF NOT EXISTS (SELECT 1 FROM Prospects WHERE passport_no='PP1234567')
INSERT INTO Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id, isDeleted)
VALUES ('Aung Kyaw', '2001-03-12', 'PP1234567', 'aung@example.com', '+95 9 123 456 789', 'Yangon, Myanmar', 'High School', 'interview_passed', @job_sg_kitchen, 0);
IF NOT EXISTS (SELECT 1 FROM Prospects WHERE passport_no='PP2345678')
INSERT INTO Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id, isDeleted)
VALUES ('Thazin Hlaing', '1999-07-01', 'PP2345678', 'thazin@example.com', '+95 9 222 333 444', 'Mandalay, Myanmar', 'Diploma', 'interview_scheduled', @job_jp_house, 0);
IF NOT EXISTS (SELECT 1 FROM Prospects WHERE passport_no='PP3456789')
INSERT INTO Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id, isDeleted)
VALUES ('Min Ko', '2000-11-20', 'PP3456789', 'minko@example.com', '+95 9 555 666 777', 'Naypyidaw, Myanmar', 'Degree', 'application_submitted', @job_my_line, 0);
DECLARE @p1 BIGINT = (SELECT id FROM Prospects WHERE passport_no='PP1234567');
DECLARE @p2 BIGINT = (SELECT id FROM Prospects WHERE passport_no='PP2345678');
DECLARE @p3 BIGINT = (SELECT id FROM Prospects WHERE passport_no='PP3456789');

/* 6) Prospect Status History */
INSERT INTO ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
SELECT @p1, 'enquiry', 'interview_passed', @admin_id, DATEADD(day,-1,SYSUTCDATETIME()), N'Progressed from enquiry to pass'
WHERE NOT EXISTS (SELECT 1 FROM ProspectStatusHistory WHERE prospect_id=@p1);
INSERT INTO ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
SELECT @p2, 'enquiry', 'interview_scheduled', @staff_id, DATEADD(day,-1,SYSUTCDATETIME()), N'Scheduled interview for Japan role'
WHERE NOT EXISTS (SELECT 1 FROM ProspectStatusHistory WHERE prospect_id=@p2);
INSERT INTO ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, changed_at, remarks)
SELECT @p3, 'enquiry', 'application_submitted', @admin_id, DATEADD(day,-1,SYSUTCDATETIME()), N'Application sent to Penang Kitchens'
WHERE NOT EXISTS (SELECT 1 FROM ProspectStatusHistory WHERE prospect_id=@p3);

/* 6.1) Prospect Checklist Items (sample tasks) */
IF NOT EXISTS (SELECT 1 FROM ProspectChecklistItems WHERE prospect_id=@p1)
BEGIN
  INSERT INTO ProspectChecklistItems (prospect_id, status, assigned_to, due_date, notes)
  VALUES
    (@p1, 'Done',       @admin_id, CONVERT(date, DATEADD(day,-2,SYSUTCDATETIME())), N'Collected contact details'),
    (@p1, 'InProgress', @admin_id, CONVERT(date, DATEADD(day, 1,SYSUTCDATETIME())), N'Prepare client conversion pack');
END
IF NOT EXISTS (SELECT 1 FROM ProspectChecklistItems WHERE prospect_id=@p2)
BEGIN
  INSERT INTO ProspectChecklistItems (prospect_id, status, assigned_to, due_date, notes)
  VALUES
    (@p2, 'Todo',       @staff_id, CONVERT(date, DATEADD(day, 2,SYSUTCDATETIME())), N'Send interview brief and venue map'),
    (@p2, 'Todo',       @staff_id, CONVERT(date, DATEADD(day, 3,SYSUTCDATETIME())), N'Collect white background photo');
END
IF NOT EXISTS (SELECT 1 FROM ProspectChecklistItems WHERE prospect_id=@p3)
BEGIN
  INSERT INTO ProspectChecklistItems (prospect_id, status, assigned_to, due_date, notes)
  VALUES
    (@p3, 'InProgress', @admin_id, CONVERT(date, DATEADD(day, 1,SYSUTCDATETIME())), N'QC application documents'),
    (@p3, 'Todo',       @admin_id, CONVERT(date, DATEADD(day, 4,SYSUTCDATETIME())), N'Confirm employer-specific forms');
END

/* 7) Enquiries + Matches */
IF NOT EXISTS (SELECT 1 FROM Enquiries WHERE prospect_id=@p1)
INSERT INTO Enquiries (prospect_id, channel, interested_job_id, summary, recorded_by, isDeleted)
VALUES (@p1, 'walkin', @job_sg_kitchen, N'Walk-in interested in kitchen helper role.', @admin_id, 0);
IF NOT EXISTS (SELECT 1 FROM Enquiries WHERE prospect_id=@p2)
INSERT INTO Enquiries (prospect_id, channel, interested_job_id, summary, recorded_by, isDeleted)
VALUES (@p2, 'social', @job_jp_house, N'Messaged on social media about Japan job.', @staff_id, 0);
IF NOT EXISTS (SELECT 1 FROM Enquiries WHERE prospect_id=@p3)
INSERT INTO Enquiries (prospect_id, channel, interested_job_id, summary, recorded_by, isDeleted)
VALUES (@p3, 'email', @job_my_line, N'Sent email about cooking position.', @admin_id, 0);

IF NOT EXISTS (SELECT 1 FROM ProspectJobMatches WHERE prospect_id=@p1 AND job_id=@job_sg_kitchen)
INSERT INTO ProspectJobMatches (prospect_id, job_id, matched_by, is_current, status, rationale)
VALUES (@p1, @job_sg_kitchen, @admin_id, 1, 'approved', N'Good English; strong fit');
IF NOT EXISTS (SELECT 1 FROM ProspectJobMatches WHERE prospect_id=@p2 AND job_id=@job_jp_house)
INSERT INTO ProspectJobMatches (prospect_id, job_id, matched_by, is_current, status, rationale)
VALUES (@p2, @job_jp_house, @staff_id, 1, 'pending_review', N'Hotel background');
IF NOT EXISTS (SELECT 1 FROM ProspectJobMatches WHERE prospect_id=@p3 AND job_id=@job_my_line)
INSERT INTO ProspectJobMatches (prospect_id, job_id, matched_by, is_current, status, rationale)
VALUES (@p3, @job_my_line, @admin_id, 1, 'rejected', N'Overqualified but not ideal');

/* 8) Applications */
INSERT INTO Applications (prospect_id, job_id, submitted_by, status, notes, isDeleted, submitted_at, created_at)
SELECT @p1, @job_sg_kitchen, @admin_id, 'Submitted', N'Sent to employer', 0, DATEADD(day,-4,SYSUTCDATETIME()), DATEADD(day,-4,SYSUTCDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM Applications WHERE prospect_id=@p1 AND job_id=@job_sg_kitchen);
INSERT INTO Applications (prospect_id, job_id, submitted_by, status, notes, isDeleted, created_at)
SELECT @p2, @job_jp_house, @staff_id, 'Draft', N'Preparing documents', 0, DATEADD(day,-2,SYSUTCDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM Applications WHERE prospect_id=@p2 AND job_id=@job_jp_house);
INSERT INTO Applications (prospect_id, job_id, submitted_by, status, notes, employer_response_at, isDeleted, created_at)
SELECT @p3, @job_my_line, @admin_id, 'Rejected', N'Employer feedback: overqualified', SYSUTCDATETIME(), 0, DATEADD(day,-1,SYSUTCDATETIME())
WHERE NOT EXISTS (SELECT 1 FROM Applications WHERE prospect_id=@p3 AND job_id=@job_my_line);

DECLARE @app1 BIGINT = (SELECT TOP 1 id FROM Applications WHERE prospect_id=@p1 AND job_id=@job_sg_kitchen ORDER BY id DESC);
DECLARE @app2 BIGINT = (SELECT TOP 1 id FROM Applications WHERE prospect_id=@p2 AND job_id=@job_jp_house ORDER BY id DESC);
DECLARE @app3 BIGINT = (SELECT TOP 1 id FROM Applications WHERE prospect_id=@p3 AND job_id=@job_my_line ORDER BY id DESC);

/* 9) Interviews */
IF NOT EXISTS (SELECT 1 FROM Interviews WHERE prospect_id=@p1 AND application_id=@app1)
INSERT INTO Interviews (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
VALUES (@p1, @app1, @emp_sg, DATEADD(day, -1, SYSUTCDATETIME()), 'Online', 'Zoom', 'Pass', @admin_id, DATEADD(day,-1,SYSUTCDATETIME()), 0);
IF NOT EXISTS (SELECT 1 FROM Interviews WHERE prospect_id=@p2 AND application_id=@app2)
INSERT INTO Interviews (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
VALUES (@p2, @app2, @emp_jp, DATEADD(day, 2, SYSUTCDATETIME()), 'In-person', 'Kyoto Office', 'Pending', @staff_id, SYSUTCDATETIME(), 0);
IF NOT EXISTS (SELECT 1 FROM Interviews WHERE prospect_id=@p3 AND application_id=@app3)
INSERT INTO Interviews (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, recorded_by, created_at, isDeleted)
VALUES (@p3, @app3, @emp_my, DATEADD(day, -2, SYSUTCDATETIME()), 'Online', 'Google Meet', 'Fail', @admin_id, DATEADD(day,-2,SYSUTCDATETIME()), 0);

 /* 10) Convert p1 → Client (passed) */
IF NOT EXISTS (SELECT 1 FROM Clients WHERE prospect_id=@p1)
INSERT INTO Clients (prospect_id, full_name, passport_no, status, remarks1, isDeleted, created_at)
VALUES (@p1, 'Aung Kyaw', 'PP1234567', 'SmartCard_InProgress', N'Converted after pass', 0, SYSUTCDATETIME());
DECLARE @client1 BIGINT = (SELECT id FROM Clients WHERE prospect_id=@p1);

/* 10.1) Client Status History */
IF @client1 IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ClientStatusHistory WHERE client_id=@client1)
  BEGIN
    INSERT INTO ClientStatusHistory (client_id, from_status, to_status, changed_by, changed_at, remarks)
    VALUES (@client1, 'SmartCard_InProgress', 'SmartCard_InProgress', @admin_id, SYSUTCDATETIME(),
            N'Client created after interview pass');
  END
END

/* 10.2) Client Checklist Items (sample tasks) */
IF @client1 IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM ClientChecklistItems WHERE client_id=@client1)
BEGIN
  INSERT INTO ClientChecklistItems (client_id, status, assigned_to, due_date, notes, created_at)
  VALUES
    (@client1, 'InProgress', @staff_id, CONVERT(date, DATEADD(day, 3, SYSUTCDATETIME())), N'Collect passport copy', SYSUTCDATETIME()),
    (@client1, 'Todo',       @staff_id, CONVERT(date, DATEADD(day, 5, SYSUTCDATETIME())), N'White background photo', SYSUTCDATETIME());
END

/* 11) SmartCard & Visa Processes */
IF NOT EXISTS (SELECT 1 FROM SmartCardProcesses WHERE client_id=@client1)
INSERT INTO SmartCardProcesses (client_id, application_id, status, attempts_count, remarks, isDeleted, created_at)
VALUES (@client1, 'SC-2025-0001', 'InProgress', 1, N'Awaiting submission', 0, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM VisaProcesses WHERE client_id=@client1 AND job_id=@job_sg_kitchen)
INSERT INTO VisaProcesses (client_id, job_id, application_id, status, attempts_count, visa_type, remarks, isDeleted, created_at)
VALUES (@client1, @job_sg_kitchen, 'VS-2025-0001', 'NotStarted', 0, 'Work Permit', N'Initial stage', 0, SYSUTCDATETIME());

/* 12) Documents */
IF NOT EXISTS (SELECT 1 FROM Documents WHERE client_id=@client1 AND type='Passport')
INSERT INTO Documents (client_id, type, status, file_url, remarks, isDeleted, created_at)
VALUES (@client1, 'Passport', 'Uploaded', 'https://files.example.com/aung/passport.pdf', N'Pending verification', 0, SYSUTCDATETIME());
IF NOT EXISTS (SELECT 1 FROM Documents WHERE client_id=@client1 AND type='Photo')
INSERT INTO Documents (client_id, type, status, remarks, isDeleted, created_at)
VALUES (@client1, 'Photo', 'Pending', N'To be uploaded', 0, SYSUTCDATETIME());

/* 13) Payments */
IF NOT EXISTS (SELECT 1 FROM Payments WHERE client_id=@client1 AND reference_no='INV-2025-0001')
INSERT INTO Payments (client_id, amount, currency, status, collected_by, reference_no, isDeleted, created_at)
VALUES (@client1, 300.00, 'SGD', 'Pending', @admin_id, 'INV-2025-0001', 0, SYSUTCDATETIME());

/* Done */
SELECT '✅ Seed data successfully inserted / updated' AS status;
GO

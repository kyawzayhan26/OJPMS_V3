-- ojpms_seed_v6.sql
-- Generated: 2025-10-24 08:49:41 UTC
USE [ojpms_dev];
SET NOCOUNT ON;

/* --- Roles --- */
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE name='Admin') INSERT dbo.Roles(name) VALUES (N'Admin');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE name='Staff') INSERT dbo.Roles(name) VALUES (N'Staff');

/* --- Users (password hashes are placeholders; update in production) --- */
INSERT INTO dbo.Users (email, password_hash, full_name, is_active)
SELECT * FROM (VALUES
(N'admin@ojpms.local', N'$2a$10$2b22hE2G6b5cPLaCeHoLdEr9Cj9G0', N'Admin User', 1),
(N'staff.a@ojpms.local', N'$2a$10$2b22hE2G6b5cPLaCeHoLdEr9Cj9G0', N'Staff A', 1),
(N'staff.b@ojpms.local', N'$2a$10$2b22hE2G6b5cPLaCeHoLdEr9Cj9G0', N'Staff B', 1)
) v(email,password_hash,full_name,is_active)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.email = v.email);

/* --- UserRoles --- */
MERGE dbo.UserRoles AS t
USING (SELECT u.id AS user_id, r.id AS role_id
       FROM dbo.Users u CROSS APPLY (SELECT id FROM dbo.Roles WHERE name = CASE WHEN u.email='admin@ojpms.local' THEN 'Admin' ELSE 'Staff' END) r) s
ON (t.user_id = s.user_id AND t.role_id = s.role_id)
WHEN NOT MATCHED THEN INSERT (user_id, role_id) VALUES (s.user_id, s.role_id);


/* --- Employers --- */
IF NOT EXISTS (SELECT 1 FROM dbo.Employers WHERE name=N'LionCity Services Pte Ltd')
INSERT dbo.Employers (name, country, contact_name, contact_email, contact_phone, address) VALUES
(N'LionCity Services Pte Ltd', N'Singapore', N'HR Dept', N'hr@lioncity.com', N'+67471301', N'Singapore HQ');
IF NOT EXISTS (SELECT 1 FROM dbo.Employers WHERE name=N'Kuala Works Sdn Bhd')
INSERT dbo.Employers (name, country, contact_name, contact_email, contact_phone, address) VALUES
(N'Kuala Works Sdn Bhd', N'Malaysia', N'HR Dept', N'hr@kuala.com', N'+61678443', N'Malaysia HQ');
IF NOT EXISTS (SELECT 1 FROM dbo.Employers WHERE name=N'Bangkok Hospitality Co.')
INSERT dbo.Employers (name, country, contact_name, contact_email, contact_phone, address) VALUES
(N'Bangkok Hospitality Co.', N'Thailand', N'HR Dept', N'hr@bangkok.com', N'+78456905', N'Thailand HQ');
IF NOT EXISTS (SELECT 1 FROM dbo.Employers WHERE name=N'Osaka Tech KK')
INSERT dbo.Employers (name, country, contact_name, contact_email, contact_phone, address) VALUES
(N'Osaka Tech KK', N'Japan', N'HR Dept', N'hr@osaka.com', N'+76434414', N'Japan HQ');
IF NOT EXISTS (SELECT 1 FROM dbo.Employers WHERE name=N'GulfBuild LLC')
INSERT dbo.Employers (name, country, contact_name, contact_email, contact_phone, address) VALUES
(N'GulfBuild LLC', N'UAE', N'HR Dept', N'hr@gulfbuild.com', N'+74979419', N'UAE HQ');

/* --- Jobs --- */
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Warehouse Assistant', N'Warehouse Assistant role', N'Singapore', N'Physically fit; Good attitude', 1185.00, 1
FROM dbo.Employers e WHERE e.name=N'LionCity Services Pte Ltd' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'General Worker', N'General Worker role', N'Singapore', N'Physically fit; Good attitude', 2408.00, 1
FROM dbo.Employers e WHERE e.name=N'Kuala Works Sdn Bhd' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'General Worker' AND j.location_country=N'Singapore');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'F&B Crew', N'F&B Crew role', N'Singapore', N'Physically fit; Good attitude', 1109.00, 1
FROM dbo.Employers e WHERE e.name=N'Bangkok Hospitality Co.' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'F&B Crew' AND j.location_country=N'Singapore');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Manufacturing Operator', N'Manufacturing Operator role', N'Malaysia', N'Physically fit; Good attitude', 2285.00, 1
FROM dbo.Employers e WHERE e.name=N'Osaka Tech KK' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Welder', N'Welder role', N'Malaysia', N'Physically fit; Good attitude', 2416.00, 1
FROM dbo.Employers e WHERE e.name=N'GulfBuild LLC' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Welder' AND j.location_country=N'Malaysia');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Hotel Front Desk', N'Hotel Front Desk role', N'Thailand', N'Physically fit; Good attitude', 2016.00, 1
FROM dbo.Employers e WHERE e.name=N'LionCity Services Pte Ltd' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Hotel Front Desk' AND j.location_country=N'Thailand');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Kitchen Helper', N'Kitchen Helper role', N'Thailand', N'Physically fit; Good attitude', 1078.00, 1
FROM dbo.Employers e WHERE e.name=N'Kuala Works Sdn Bhd' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Kitchen Helper' AND j.location_country=N'Thailand');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Assembly Technician', N'Assembly Technician role', N'Japan', N'Physically fit; Good attitude', 2109.00, 1
FROM dbo.Employers e WHERE e.name=N'Bangkok Hospitality Co.' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Assembly Technician' AND j.location_country=N'Japan');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Caregiver Assistant', N'Caregiver Assistant role', N'Japan', N'Physically fit; Good attitude', 1764.00, 1
FROM dbo.Employers e WHERE e.name=N'Osaka Tech KK' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Caregiver Assistant' AND j.location_country=N'Japan');
INSERT INTO dbo.Jobs (employer_id, title, description, location_country, requirements, salary, is_active)
SELECT e.id, N'Scaffolder', N'Scaffolder role', N'UAE', N'Physically fit; Good attitude', 965.00, 1
FROM dbo.Employers e WHERE e.name=N'GulfBuild LLC' AND NOT EXISTS (SELECT 1 FROM dbo.Jobs j WHERE j.title=N'Scaffolder' AND j.location_country=N'UAE');

/* --- Prospects --- */
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Aye Win', DATEFROMPARTS(2000, 1, 4),
       N'MM4903402', N'aye.win@example.com', N'+95 9334760738', N'Yangon, Myanmar', N'High School', N'application_drafted', j.id
FROM dbo.Jobs j WHERE j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Ko Thazin', DATEFROMPARTS(1996, 5, 8),
       N'MM8038374', N'ko.thazin@example.com', N'+95 9853041955', N'Yangon, Myanmar', N'Diploma', N'interview_passed', j.id
FROM dbo.Jobs j WHERE j.title=N'General Worker' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Sanda Naing', DATEFROMPARTS(1986, 4, 19),
       N'MM1109031', N'sanda.naing@example.com', N'+95 9969119330', N'Yangon, Myanmar', N'Diploma', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'F&B Crew' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Hnin Naing', DATEFROMPARTS(1987, 2, 24),
       N'MM4612365', N'hnin.naing@example.com', N'+95 9266944844', N'Yangon, Myanmar', N'Bachelor', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Hlaing Htet', DATEFROMPARTS(2000, 2, 25),
       N'MM7022674', N'hlaing.htet@example.com', N'+95 9203848421', N'Yangon, Myanmar', N'Bachelor', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'Welder' AND j.location_country=N'Malaysia';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Pyae Hlaing', DATEFROMPARTS(2002, 3, 5),
       N'MM8707870', N'pyae.hlaing@example.com', N'+95 9883543540', N'Yangon, Myanmar', N'High School', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'Hotel Front Desk' AND j.location_country=N'Thailand';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Hlaing Wai', DATEFROMPARTS(2000, 9, 6),
       N'MM7067228', N'hlaing.wai@example.com', N'+95 9414797776', N'Yangon, Myanmar', N'Diploma', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'Kitchen Helper' AND j.location_country=N'Thailand';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Min Su', DATEFROMPARTS(1993, 9, 28),
       N'MM5855124', N'min.su@example.com', N'+95 9344703907', N'Yangon, Myanmar', N'High School', N'application_drafted', j.id
FROM dbo.Jobs j WHERE j.title=N'Assembly Technician' AND j.location_country=N'Japan';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Thiha Htwe', DATEFROMPARTS(2004, 7, 7),
       N'MM5663623', N'thiha.htwe@example.com', N'+95 9508157429', N'Yangon, Myanmar', N'Vocational Cert', N'interview_passed', j.id
FROM dbo.Jobs j WHERE j.title=N'Caregiver Assistant' AND j.location_country=N'Japan';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Kyaw Zaw', DATEFROMPARTS(2002, 12, 23),
       N'MM4514944', N'kyaw.zaw@example.com', N'+95 9481469012', N'Yangon, Myanmar', N'Bachelor', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'Scaffolder' AND j.location_country=N'UAE';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Yu Thazin', DATEFROMPARTS(1991, 12, 10),
       N'MM9961380', N'yu.thazin@example.com', N'+95 9283758720', N'Yangon, Myanmar', N'Diploma', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Thant Htet', DATEFROMPARTS(1997, 11, 21),
       N'MM4684531', N'thant.htet@example.com', N'+95 9389854268', N'Yangon, Myanmar', N'Bachelor', N'enquiry', j.id
FROM dbo.Jobs j WHERE j.title=N'General Worker' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Thura Hlaing', DATEFROMPARTS(1996, 8, 17),
       N'MM6292423', N'thura.hlaing@example.com', N'+95 9964411347', N'Yangon, Myanmar', N'Vocational Cert', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'F&B Crew' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Hlaing Tun', DATEFROMPARTS(1999, 2, 8),
       N'MM6279418', N'hlaing.tun@example.com', N'+95 9709004943', N'Yangon, Myanmar', N'Diploma', N'interview_passed', j.id
FROM dbo.Jobs j WHERE j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Khin Thazin', DATEFROMPARTS(1992, 2, 11),
       N'MM3396987', N'khin.thazin@example.com', N'+95 9592688426', N'Yangon, Myanmar', N'Bachelor', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'Welder' AND j.location_country=N'Malaysia';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Thura Thura', DATEFROMPARTS(1985, 10, 18),
       N'MM5408072', N'thura.thura@example.com', N'+95 9702764446', N'Yangon, Myanmar', N'Vocational Cert', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'Hotel Front Desk' AND j.location_country=N'Thailand';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Zaw Min', DATEFROMPARTS(1992, 10, 8),
       N'MM9548432', N'zaw.min@example.com', N'+95 9248532577', N'Yangon, Myanmar', N'Vocational Cert', N'jobmatch_approved', j.id
FROM dbo.Jobs j WHERE j.title=N'Kitchen Helper' AND j.location_country=N'Thailand';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Su Hlaing', DATEFROMPARTS(1985, 2, 23),
       N'MM3564251', N'su.hlaing@example.com', N'+95 9217734861', N'Yangon, Myanmar', N'Diploma', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'Assembly Technician' AND j.location_country=N'Japan';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Yu Win', DATEFROMPARTS(2005, 1, 8),
       N'MM7402509', N'yu.win@example.com', N'+95 9513140753', N'Yangon, Myanmar', N'Vocational Cert', N'interview_scheduled', j.id
FROM dbo.Jobs j WHERE j.title=N'Caregiver Assistant' AND j.location_country=N'Japan';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Nandar Aung', DATEFROMPARTS(1987, 1, 28),
       N'MM2921859', N'nandar.aung@example.com', N'+95 9830448745', N'Yangon, Myanmar', N'Bachelor', N'interview_passed', j.id
FROM dbo.Jobs j WHERE j.title=N'Scaffolder' AND j.location_country=N'UAE';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Soe Soe', DATEFROMPARTS(1995, 2, 17),
       N'MM3653446', N'soe.soe@example.com', N'+95 9566825638', N'Yangon, Myanmar', N'Vocational Cert', N'enquiry', j.id
FROM dbo.Jobs j WHERE j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Kaung Thura', DATEFROMPARTS(1992, 5, 22),
       N'MM9398441', N'kaung.thura@example.com', N'+95 9382811832', N'Yangon, Myanmar', N'Diploma', N'jobmatch_approved', j.id
FROM dbo.Jobs j WHERE j.title=N'General Worker' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Thiha Thazin', DATEFROMPARTS(2000, 4, 18),
       N'MM9517169', N'thiha.thazin@example.com', N'+95 9420452650', N'Yangon, Myanmar', N'Diploma', N'job_matched', j.id
FROM dbo.Jobs j WHERE j.title=N'F&B Crew' AND j.location_country=N'Singapore';
INSERT INTO dbo.Prospects (full_name, dob, passport_no, contact_email, contact_phone, address, highest_qualification, status, interested_job_id)
SELECT N'Zaw Nyein', DATEFROMPARTS(1989, 12, 19),
       N'MM9897858', N'zaw.nyein@example.com', N'+95 9273461957', N'Yangon, Myanmar', N'High School', N'interview_passed', j.id
FROM dbo.Jobs j WHERE j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia';

/* --- ProspectStatusHistory --- */
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Aye Win';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Ko Thazin';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Sanda Naing';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Hnin Naing';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Htet';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Pyae Hlaing';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Wai';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Min Su';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'application_drafted', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Thiha Htwe';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Kyaw Zaw';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Yu Thazin';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Thant Htet';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Thura Hlaing';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Tun';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Khin Thazin';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Thura Thura';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'application_drafted', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Zaw Min';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'assigned', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Su Hlaing';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Yu Win';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Nandar Aung';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Soe Soe';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Kaung Thura';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'matched', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Thiha Thazin';
INSERT INTO dbo.ProspectStatusHistory (prospect_id, from_status, to_status, changed_by, remarks)
SELECT p.id, N'enquiry', N'interview_scheduled', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'), N'Auto-seed'
FROM dbo.Prospects p WHERE p.full_name=N'Zaw Nyein';

/* --- ProspectJobMatches --- */
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Aye Win';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'General Worker' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Ko Thazin';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'F&B Crew' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Sanda Naing';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia'
WHERE p.full_name=N'Hnin Naing';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Welder' AND j.location_country=N'Malaysia'
WHERE p.full_name=N'Hlaing Htet';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Hotel Front Desk' AND j.location_country=N'Thailand'
WHERE p.full_name=N'Pyae Hlaing';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'rejected', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Kitchen Helper' AND j.location_country=N'Thailand'
WHERE p.full_name=N'Hlaing Wai';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Assembly Technician' AND j.location_country=N'Japan'
WHERE p.full_name=N'Min Su';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Caregiver Assistant' AND j.location_country=N'Japan'
WHERE p.full_name=N'Thiha Htwe';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'rejected', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Scaffolder' AND j.location_country=N'UAE'
WHERE p.full_name=N'Kyaw Zaw';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'rejected', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Warehouse Assistant' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Yu Thazin';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'General Worker' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Thant Htet';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'F&B Crew' AND j.location_country=N'Singapore'
WHERE p.full_name=N'Thura Hlaing';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Manufacturing Operator' AND j.location_country=N'Malaysia'
WHERE p.full_name=N'Hlaing Tun';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Welder' AND j.location_country=N'Malaysia'
WHERE p.full_name=N'Khin Thazin';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Hotel Front Desk' AND j.location_country=N'Thailand'
WHERE p.full_name=N'Thura Thura';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Kitchen Helper' AND j.location_country=N'Thailand'
WHERE p.full_name=N'Zaw Min';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Assembly Technician' AND j.location_country=N'Japan'
WHERE p.full_name=N'Su Hlaing';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'pending_review', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Caregiver Assistant' AND j.location_country=N'Japan'
WHERE p.full_name=N'Yu Win';
INSERT INTO dbo.ProspectJobMatches (prospect_id, job_id, matched_by, status, rationale, is_current)
SELECT p.id, j.id, (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'shortlisted', N'Auto match', 1
FROM dbo.Prospects p JOIN dbo.Jobs j ON j.title=N'Scaffolder' AND j.location_country=N'UAE'
WHERE p.full_name=N'Nandar Aung';

/* --- Applications --- */
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Draft', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Aye Win';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Submitted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Ko Thazin';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Rejected', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Sanda Naing';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Draft', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Hnin Naing';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Rejected', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Htet';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Shortlisted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Pyae Hlaing';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Rejected', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Wai';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Shortlisted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Min Su';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Rejected', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Thiha Htwe';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Rejected', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Kyaw Zaw';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Submitted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Yu Thazin';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Submitted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Thant Htet';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Shortlisted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Thura Hlaing';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Submitted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Tun';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Draft', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Khin Thazin';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Draft', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Thura Thura';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Shortlisted', DATEADD(day,-10,SYSUTCDATETIME()), N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Zaw Min';
INSERT INTO dbo.Applications (prospect_id, job_id, submitted_by, status, submitted_at, notes)
SELECT p.id, COALESCE(p.interested_job_id, (SELECT TOP 1 j.id FROM dbo.Jobs j ORDER BY j.id)),
       (SELECT id FROM dbo.Users WHERE email='admin@ojpms.local'), N'Draft', NULL, N'Seed application'
FROM dbo.Prospects p WHERE p.full_name=N'Su Hlaing';

/* --- Interviews --- */
WITH first_apps AS (SELECT a.*, ROW_NUMBER() OVER (PARTITION BY a.prospect_id ORDER BY a.id) rn FROM dbo.Applications a)
INSERT INTO dbo.Interviews (prospect_id, application_id, employer_id, scheduled_time, mode, location, outcome, outcome_notes, recorded_by)
SELECT a.prospect_id, a.id, j.employer_id, DATEADD(day, 3, SYSUTCDATETIME()), N'Zoom', N'Online', N'Pending', N'',
(SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local')
FROM first_apps a JOIN dbo.Jobs j ON j.id=a.job_id WHERE a.rn=1 AND a.id IN (SELECT TOP 12 id FROM first_apps WHERE rn=1 ORDER BY id);

/* --- Clients --- */
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Aye Win';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Accommodation_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Ko Thazin';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'FlightBooking_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Sanda Naing';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Accommodation_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Hnin Naing';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Departed', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Htet';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Accommodation_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Pyae Hlaing';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Visa_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Wai';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Min Su';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Accommodation_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Thiha Htwe';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Kyaw Zaw';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Departed', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Yu Thazin';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Visa_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Thant Htet';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Thura Hlaing';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Accommodation_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Hlaing Tun';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Khin Thazin';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Approved_For_Deployment', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Thura Thura';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Departed', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Zaw Min';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'Visa_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Su Hlaing';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'FlightBooking_Pending', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Yu Win';
INSERT INTO dbo.Clients (prospect_id, full_name, passport_no, status, remarks1)
SELECT p.id, p.full_name, p.passport_no, N'SmartCard_InProgress', N'Promoted to client' FROM dbo.Prospects p WHERE p.full_name=N'Nandar Aung';

/* --- ClientStatusHistory --- */
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM4903402' AND c.full_name=N'Aye Win';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Accommodation_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM8038374' AND c.full_name=N'Ko Thazin';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'FlightBooking_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM1109031' AND c.full_name=N'Sanda Naing';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Accommodation_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM4612365' AND c.full_name=N'Hnin Naing';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Departed', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM7022674' AND c.full_name=N'Hlaing Htet';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Accommodation_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM8707870' AND c.full_name=N'Pyae Hlaing';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Visa_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM7067228' AND c.full_name=N'Hlaing Wai';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM5855124' AND c.full_name=N'Min Su';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Accommodation_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM5663623' AND c.full_name=N'Thiha Htwe';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM4514944' AND c.full_name=N'Kyaw Zaw';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Departed', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM9961380' AND c.full_name=N'Yu Thazin';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Visa_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM4684531' AND c.full_name=N'Thant Htet';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM6292423' AND c.full_name=N'Thura Hlaing';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Accommodation_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM6279418' AND c.full_name=N'Hlaing Tun';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM3396987' AND c.full_name=N'Khin Thazin';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Approved_For_Deployment', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM5408072' AND c.full_name=N'Thura Thura';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Departed', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM9548432' AND c.full_name=N'Zaw Min';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'Visa_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM3564251' AND c.full_name=N'Su Hlaing';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'FlightBooking_Pending', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM7402509' AND c.full_name=N'Yu Win';
INSERT INTO dbo.ClientStatusHistory (client_id, from_status, to_status, changed_by, remarks)
SELECT c.id, NULL, N'SmartCard_InProgress', (SELECT id FROM dbo.Users WHERE email='staff.b@ojpms.local'), N'Initial status'
FROM dbo.Clients c WHERE c.passport_no=N'MM2921859' AND c.full_name=N'Nandar Aung';

/* --- Documents (prospects & clients) --- */
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Expired', N'https://files.example.com/mm4903402_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Uploaded', N'https://files.example.com/mm4903402_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm4903402_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Expired', N'https://files.example.com/mm8038374_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Pending', N'https://files.example.com/mm8038374_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm8038374_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm1109031_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Rejected', N'https://files.example.com/mm1109031_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm1109031_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Expired', N'https://files.example.com/mm4612365_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Expired', N'https://files.example.com/mm4612365_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm4612365_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Verified', N'https://files.example.com/mm7022674_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Uploaded', N'https://files.example.com/mm7022674_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm7022674_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm8707870_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm8707870_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Rejected', N'https://files.example.com/mm8707870_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm7067228_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm7067228_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Rejected', N'https://files.example.com/mm7067228_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Verified', N'https://files.example.com/mm5855124_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Pending', N'https://files.example.com/mm5855124_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Pending', N'https://files.example.com/mm5855124_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Rejected', N'https://files.example.com/mm5663623_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Expired', N'https://files.example.com/mm5663623_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm5663623_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm4514944_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Pending', N'https://files.example.com/mm4514944_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm4514944_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm9961380_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Expired', N'https://files.example.com/mm9961380_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm9961380_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm4684531_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm4684531_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Pending', N'https://files.example.com/mm4684531_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm6292423_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm6292423_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm6292423_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm6279418_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Rejected', N'https://files.example.com/mm6279418_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm6279418_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Verified', N'https://files.example.com/mm3396987_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Expired', N'https://files.example.com/mm3396987_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm3396987_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm5408072_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Expired', N'https://files.example.com/mm5408072_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm5408072_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm9548432_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Uploaded', N'https://files.example.com/mm9548432_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm9548432_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm3564251_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Pending', N'https://files.example.com/mm3564251_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm3564251_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm7402509_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm7402509_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm7402509_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Expired', N'https://files.example.com/mm2921859_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Uploaded', N'https://files.example.com/mm2921859_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm2921859_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Uploaded', N'https://files.example.com/mm3653446_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3653446';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm3653446_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3653446';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Expired', N'https://files.example.com/mm3653446_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM3653446';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Rejected', N'https://files.example.com/mm9398441_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9398441';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Verified', N'https://files.example.com/mm9398441_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9398441';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Pending', N'https://files.example.com/mm9398441_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9398441';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm9517169_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9517169';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Rejected', N'https://files.example.com/mm9517169_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9517169';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm9517169_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9517169';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Passport', N'Pending', N'https://files.example.com/mm9897858_passport.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9897858';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'Photo', N'Pending', N'https://files.example.com/mm9897858_photo.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9897858';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, NULL, N'EducationCert', N'Verified', N'https://files.example.com/mm9897858_educationcert.pdf', N'Seed doc'
FROM dbo.Prospects p WHERE p.passport_no=N'MM9897858';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm4903402_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm4903402_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Uploaded', N'https://files.example.com/mm4903402_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Rejected', N'https://files.example.com/mm4903402_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4903402';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Expired', N'https://files.example.com/mm8038374_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Rejected', N'https://files.example.com/mm8038374_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm8038374_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Pending', N'https://files.example.com/mm8038374_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8038374';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Pending', N'https://files.example.com/mm1109031_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Pending', N'https://files.example.com/mm1109031_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Uploaded', N'https://files.example.com/mm1109031_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Expired', N'https://files.example.com/mm1109031_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM1109031';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Pending', N'https://files.example.com/mm4612365_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm4612365_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm4612365_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Expired', N'https://files.example.com/mm4612365_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4612365';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm7022674_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Rejected', N'https://files.example.com/mm7022674_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Uploaded', N'https://files.example.com/mm7022674_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Pending', N'https://files.example.com/mm7022674_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7022674';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Verified', N'https://files.example.com/mm8707870_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm8707870_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Pending', N'https://files.example.com/mm8707870_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Verified', N'https://files.example.com/mm8707870_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM8707870';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm7067228_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Uploaded', N'https://files.example.com/mm7067228_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Pending', N'https://files.example.com/mm7067228_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Verified', N'https://files.example.com/mm7067228_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7067228';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Expired', N'https://files.example.com/mm5855124_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Rejected', N'https://files.example.com/mm5855124_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm5855124_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Uploaded', N'https://files.example.com/mm5855124_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5855124';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm5663623_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Uploaded', N'https://files.example.com/mm5663623_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Uploaded', N'https://files.example.com/mm5663623_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Rejected', N'https://files.example.com/mm5663623_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5663623';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Pending', N'https://files.example.com/mm4514944_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Uploaded', N'https://files.example.com/mm4514944_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Verified', N'https://files.example.com/mm4514944_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Rejected', N'https://files.example.com/mm4514944_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4514944';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm9961380_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm9961380_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Uploaded', N'https://files.example.com/mm9961380_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Pending', N'https://files.example.com/mm9961380_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9961380';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Rejected', N'https://files.example.com/mm4684531_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Pending', N'https://files.example.com/mm4684531_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Rejected', N'https://files.example.com/mm4684531_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Uploaded', N'https://files.example.com/mm4684531_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM4684531';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm6292423_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Rejected', N'https://files.example.com/mm6292423_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Verified', N'https://files.example.com/mm6292423_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Verified', N'https://files.example.com/mm6292423_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6292423';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Uploaded', N'https://files.example.com/mm6279418_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Uploaded', N'https://files.example.com/mm6279418_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Pending', N'https://files.example.com/mm6279418_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Uploaded', N'https://files.example.com/mm6279418_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM6279418';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Rejected', N'https://files.example.com/mm3396987_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm3396987_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Verified', N'https://files.example.com/mm3396987_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Pending', N'https://files.example.com/mm3396987_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3396987';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Verified', N'https://files.example.com/mm5408072_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm5408072_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm5408072_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Rejected', N'https://files.example.com/mm5408072_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM5408072';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Expired', N'https://files.example.com/mm9548432_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm9548432_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Pending', N'https://files.example.com/mm9548432_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Pending', N'https://files.example.com/mm9548432_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM9548432';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Verified', N'https://files.example.com/mm3564251_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Uploaded', N'https://files.example.com/mm3564251_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm3564251_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Verified', N'https://files.example.com/mm3564251_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM3564251';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Pending', N'https://files.example.com/mm7402509_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Pending', N'https://files.example.com/mm7402509_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Expired', N'https://files.example.com/mm7402509_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Rejected', N'https://files.example.com/mm7402509_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM7402509';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'MedicalCheck', N'Verified', N'https://files.example.com/mm2921859_medicalcheck.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'PoliceClearance', N'Verified', N'https://files.example.com/mm2921859_policeclearance.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'SmartCardForm', N'Rejected', N'https://files.example.com/mm2921859_smartcardform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM2921859';
INSERT INTO dbo.Documents (prospect_id, client_id, type, status, file_url, remarks)
SELECT p.id, c.id, N'VisaForm', N'Expired', N'https://files.example.com/mm2921859_visaform.pdf', N'Seed client doc'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id WHERE c.passport_no=N'MM2921859';

/* --- SmartCardApplications & SmartCardProcesses --- */
DECLARE @tmpSmart TABLE (client_id BIGINT, app_id BIGINT);
INSERT INTO dbo.SmartCardApplications (prospect_id, client_id, card_number, status, submitted_at, notes)
OUTPUT inserted.client_id, inserted.id INTO @tmpSmart(client_id, app_id)
SELECT p.id, c.id, CONCAT('SC', RIGHT(CONVERT(VARCHAR, c.id+100000),6)), N'Pending', DATEADD(day,-5,SYSUTCDATETIME()), N'Seed smartcard'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id
WHERE c.id IN (SELECT TOP 12 id FROM dbo.Clients ORDER BY id);
INSERT INTO dbo.SmartCardProcesses (client_id, application_id, status, attempt_count, remarks)
SELECT client_id, app_id, N'Drafted', 1, N'Auto process' FROM @tmpSmart;

/* --- VisaApplications & VisaProcesses --- */
DECLARE @tmpVisa TABLE (client_id BIGINT, app_id BIGINT);
INSERT INTO dbo.VisaApplications (prospect_id, client_id, visa_type, application_no, status, submitted_at, notes)
OUTPUT inserted.client_id, inserted.id INTO @tmpVisa(client_id, app_id)
SELECT p.id, c.id, N'Work Permit', CONCAT('V', RIGHT(CONVERT(VARCHAR, c.id+1000000),7)), N'Submitted', DATEADD(day,-3,SYSUTCDATETIME()), N'Seed visa'
FROM dbo.Clients c JOIN dbo.Prospects p ON p.id=c.prospect_id
WHERE c.id IN (SELECT TOP 10 id FROM dbo.Clients ORDER BY id);
INSERT INTO dbo.VisaProcesses (client_id, application_id, visa_type, status, attempt_count, remarks)
SELECT client_id, app_id, N'Work Permit', N'Drafted', 0, N'Auto process' FROM @tmpVisa;

/* --- Payments --- */
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 1200.00, N'SGD', N'Pending', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Pending'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1000', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Paid', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Paid'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1001', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 1200.00, N'SGD', N'Pending', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Pending'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1002', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 500.00, N'SGD', N'Pending', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Pending'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1003', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 1200.00, N'SGD', N'Waived', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Waived'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1004', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Pending', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Pending'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1005', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 300.00, N'SGD', N'Waived', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Waived'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1006', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Waived', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Waived'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1007', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Refunded', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Refunded'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1008', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Refunded', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Refunded'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1009', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 500.00, N'SGD', N'Paid', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Paid'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1010', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 1200.00, N'SGD', N'Refunded', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Refunded'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1011', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 800.00, N'SGD', N'Paid', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Paid'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1012', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;
INSERT INTO dbo.Payments (client_id, amount, currency, status, collected_by, collected_at, reference_no, invoice_description)
SELECT id, 300.00, N'SGD', N'Refunded', (SELECT id FROM dbo.Users WHERE email='staff.a@ojpms.local'),
CASE WHEN N'Refunded'=N'Paid' THEN DATEADD(day,-1,SYSUTCDATETIME()) ELSE NULL END,
N'INV-1013', N'Placement Fee'
FROM (SELECT TOP 1 id FROM dbo.Clients ORDER BY NEWID()) pick;

/* --- FlightBookings --- */
INSERT INTO dbo.FlightBookings (client_id, airline, flight_datetime, booking_reference, remarks)
SELECT TOP 6 id, N'AirAsia', DATEADD(day,7,SYSUTCDATETIME()), CONCAT('FB', id+2000), N'Seed flight' FROM dbo.Clients ORDER BY id DESC;

/* --- Quick sanity checks --- */
SELECT COUNT(*) AS employers FROM dbo.Employers;
SELECT COUNT(*) AS jobs FROM dbo.Jobs;
SELECT COUNT(*) AS prospects FROM dbo.Prospects;
SELECT COUNT(*) AS clients FROM dbo.Clients;
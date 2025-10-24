select * from users


UPDATE Users
SET password_hash = '$2b$10$Osg/RXfvC479l8vkBp3fmu83saXNZqmVKPF5N3e8XtK7APnCw4gLK'
WHERE email = 'staff@example.com';

UPDATE Users
SET password_hash = '$2b$10$4xEsaf0c2y7cwUub0vvUKOHVaqirjWKmHByCQBqbasdWsVIfmLch2'
WHERE email = 'admin@example.com';

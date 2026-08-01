const db = require('better-sqlite3')('sqlite.db');
console.log(db.prepare(\"SELECT sql FROM sqlite_master WHERE name='otp_codes'\").get().sql);

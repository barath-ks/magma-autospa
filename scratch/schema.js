const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('local.db');

db.all("SELECT type, name, sql FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  rows.forEach(r => console.log(r.sql));
  db.close();
});

const db = require('./src/db/connection').initialize();
const columns = db.prepare('PRAGMA table_info(users)').all();
console.log('Columns in users table:');
columns.forEach(col => console.log(`- ${col.name} (${col.type})`));

const migrations = db.prepare('SELECT * FROM _migrations').all();
console.log('\nApplied migrations:');
migrations.forEach(m => console.log(`- ${m.id} at ${m.applied_at}`));
process.exit(0);

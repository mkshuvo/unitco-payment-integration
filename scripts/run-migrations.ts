import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

async function main() {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = Number(process.env.DB_PORT || 52719);
  const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'unitco';
  const DB_PASS = process.env.DB_PASS || process.env.MYSQL_PASSWORD || 'unitco';
  const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'unitco';

  const migrationsDir = path.resolve(__dirname, '..', 'src', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} db=${DB_NAME} ...`);
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    multipleStatements: true,
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY UQ_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [rows] = await conn.execute<mysql.RowDataPacket[]>(
    'SELECT filename FROM schema_migrations'
  );
  const applied = new Set(rows.map((r: any) => r.filename as string));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skip (already applied): ${file}`);
      continue;
    }
    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`Applying: ${file}`);
    try {
      await conn.query(sql);
      await conn.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      console.log(`Applied: ${file}`);
    } catch (err) {
      console.error(`Failed: ${file}`);
      console.error(err);
      await conn.end();
      process.exit(1);
    }
  }

  await conn.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import sql from 'mssql';

let pool;

export async function connectPool() {
  if (pool) return pool;

  const config = {
    server: process.env.MSSQL_SERVER_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE,
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    port: parseInt(process.env.MSSQL_PORT || '1433', 10),
    options: {
      // Mirror your SSMS settings
      encrypt: String(process.env.MSSQL_ENCRYPT || 'true') === 'true',
      trustServerCertificate: String(process.env.MSSQL_TRUST_SERVER_CERTIFICATE || 'true') === 'true',

      // Timeouts (a bit higher than defaults)
      connectTimeout: 30000,
      requestTimeout: 30000,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  // One-time debug (comment out after it connects)
  console.log('DB DEBUG', {
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    encrypt: config.options.encrypt,
    trustServerCertificate: config.options.trustServerCertificate
  });

  pool = await sql.connect(config);
  console.log('✅ Connected to SQL Server (SQL Auth)');
  return pool;
}

export function getPool() {
  if (!pool) throw new Error('DB pool not initialised');
  return pool;
}

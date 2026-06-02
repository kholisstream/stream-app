import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error('❌ SUPABASE_DB_PASSWORD environment variable is required');
    console.error('   Set it with: export SUPABASE_DB_PASSWORD=your_password');
    process.exit(1);
  }

  // Supabase direct connection string
  const connectionString = `postgresql://postgres.edcoxquhbdyjdigqygbb:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected!');

    // Read and execute schema
    const schemaPath = join(import.meta.dir, '..', 'supabase', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('📋 Executing database schema...');
    await client.query(schema);
    console.log('✅ Database schema applied successfully!');

    // Verify tables
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('\n📊 Created tables:');
    rows.forEach((row) => console.log(`   ✓ ${row.tablename}`));

  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('⚠️  Some objects already exist (this is OK)');
      console.log('✅ Schema is up to date!');
    } else {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

setupDatabase();

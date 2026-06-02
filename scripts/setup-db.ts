import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

async function setupDatabase() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error('');
    console.error('❌ SUPABASE_DB_PASSWORD is required!');
    console.error('');
    console.error('Find it in: Supabase Dashboard → Settings → Database → Connection string');
    console.error('Or reset it at: Supabase Dashboard → Settings → Database → Database password');
    console.error('');
    console.error('Then run:');
    console.error('  export SUPABASE_DB_PASSWORD=your_password');
    console.error('  bun run setup-db');
    console.error('');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.edcoxquhbdyjdigqygbb:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected!');

    const schemaPath = join(import.meta.dir, '..', 'supabase', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('📋 Applying database schema...');
    
    // Split schema into individual statements and execute them
    // This is more reliable than executing the whole thing at once
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let success = 0;
    let skipped = 0;
    
    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
        success++;
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          skipped++;
        } else {
          console.log(`⚠️  Warning: ${err.message?.slice(0, 80)}`);
        }
      }
    }

    console.log(`✅ Schema applied! (${success} created, ${skipped} already existed)`);

    // Verify tables
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('\n📊 Tables in database:');
    rows.forEach((row) => console.log(`   ✓ ${row.tablename}`));

  } catch (err: any) {
    console.error('❌ Connection failed:', err.message);
    console.error('');
    console.error('💡 Try these steps:');
    console.error('   1. Check your database password in Supabase Dashboard → Settings → Database');
    console.error('   2. Make sure your project is not paused (free tier pauses after inactivity)');
    console.error('   3. Try a different region in the connection string');
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

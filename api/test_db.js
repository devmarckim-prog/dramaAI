/**
 * Supabase DB Connectivity & Verification Tool
 * -------------------------------------------
 * This script tests the Supabase connection and verifies that the 'projects' table is accessible.
 */

const { serviceSupabase } = require('./supabaseClient');

async function testSupabase() {
  console.log('--- 🛡️ Supabase Connection Test ---');
  
  try {
    // 1. Connection Health Check
    console.log('1. Checking connection to Supabase...');
    const { data: health, error: healthError } = await serviceSupabase
      .from('user_profiles') // Testing against a known table
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Connection error:', healthError.message);
      process.exit(1);
    }
    console.log('✅ Connection stable.');

    // 2. Projects Table Check
    console.log('\n2. Verifying "projects" table access...');
    const { data: projects, error: projectsError } = await serviceSupabase
      .from('projects')
      .select('id, title, status')
      .limit(5);

    if (projectsError) {
      console.error('❌ "projects" table error:', projectsError.message);
    } else {
      console.log(`✅ Successfully fetched ${projects.length} sample projects:`);
      projects.forEach(p => console.log(`   - [ID: ${p.id}] ${p.title} (${p.status})`));
    }

    // 3. User Profiles Check
    console.log('\n3. Verifying "user_profiles" table access...');
    const { data: profiles, error: profileError } = await serviceSupabase
      .from('user_profiles')
      .select('email, role')
      .limit(3);

    if (profileError) {
      console.error('❌ "user_profiles" table error:', profileError.message);
    } else {
      console.log(`✅ Successfully fetched ${profiles.length} sample profiles:`);
      profiles.forEach(p => console.log(`   - ${p.email} (${p.role})`));
    }

    console.log('\n--- 🏁 Verification Complete ---');
  } catch (err) {
    console.error('❌ Unexpected script error:', err);
  }
}

testSupabase();

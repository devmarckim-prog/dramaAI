const { serviceSupabase } = require('../api/supabaseClient');

async function runDiagnostics() {
    try {
        console.log('--- 1. Projects Table Columns ---');
        // We can use the information_schema via standard Supabase query if RLS/Permissions allow
        // but typically it's blocked. Let's try to get a single row to see columns.
        const { data: sample, error: sampleErr } = await serviceSupabase
            .from('projects')
            .select('*')
            .limit(1);
        
        if (sample) {
            console.log('Columns currently in "projects" table:');
            console.log(Object.keys(sample[0] || { empty: 'no rows' }));
        } else {
            console.error('Projects Sample Error:', sampleErr?.message);
        }

        console.log('\n--- 2. User Profiles Sync Status ---');
        const { data: recentProjects, error: projErr } = await serviceSupabase
            .from('projects')
            .select('id, title, status, error_msg, created_at, user_id')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (projErr) {
            console.error('Projects Recent Error:', projErr.message);
        } else {
            console.log('Recent Projects:');
            console.table(recentProjects);

            const userIds = [...new Set(recentProjects.map(p => p.user_id))];
            const { data: profiles, error: profErr } = await serviceSupabase
                .from('user_profiles')
                .select('id, email')
                .in('id', userIds);
            
            if (profErr) {
                console.error('Profiles Fetch Error:', profErr.message);
            } else {
                const profileIdSet = new Set(profiles.map(p => p.id));
                console.log('User IDs in Projects vs User Profiles:');
                userIds.forEach(uid => {
                    const exists = profileIdSet.has(uid);
                    console.log(`- ${uid}: ${exists ? 'EXISTS in user_profiles' : 'MISSING (Foreign Key Violation Cause!)'}`);
                });
            }
        }
    } catch (err) {
        console.error('Diagnostic Failure:', err.message);
    }
}

runDiagnostics();

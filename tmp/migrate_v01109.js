const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Phase 1: DB Migration Start ---');

    // 1. Add outline column to projects
    await client.query(`
      ALTER TABLE public.projects 
      ADD COLUMN IF NOT EXISTS outline JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Column "outline" added to projects');

    // 2. Create episodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.episodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
        ep_num INTEGER NOT NULL,
        title TEXT,
        logline TEXT,
        story TEXT,
        scenes JSONB DEFAULT '[]'::jsonb,
        script JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, ep_num)
      );
    `);
    console.log('Table "episodes" created');

    // 3. RLS for episodes
    await client.query('ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;');
    await client.query(`
      DROP POLICY IF EXISTS "Users manage their own episodes" ON public.episodes;
      CREATE POLICY "Users manage their own episodes" ON public.episodes 
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid())
      );
    `);
    console.log('RLS policies set for episodes');

    // 4. Migration: Move scripts from projects to episodes
    // The previous structure of scripts was often JSONB { "0": [...], "1": [...] }
    const projectsWithScripts = await client.query(`
      SELECT id, scripts 
      FROM public.projects 
      WHERE scripts IS NOT NULL 
      AND scripts::text != '{}' 
      AND scripts::text != '[]'
    `);
    console.log(`Found ${projectsWithScripts.rows.length} projects to migrate scripts from`);
    
    for (const row of projectsWithScripts.rows) {
      const scripts = row.scripts;
      if (!scripts || typeof scripts !== 'object') continue;

      for (const [epIdx, scriptData] of Object.entries(scripts)) {
        // epIdx is 0-based index from the old JSONB object keys
        const num = parseInt(epIdx) + 1;
        await client.query(`
          INSERT INTO public.episodes (project_id, ep_num, script)
          VALUES ($1, $2, $3)
          ON CONFLICT (project_id, ep_num) 
          DO UPDATE SET script = EXCLUDED.script
        `, [row.id, num, JSON.stringify(scriptData)]);
      }
    }
    console.log('Scripts migration complete');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();

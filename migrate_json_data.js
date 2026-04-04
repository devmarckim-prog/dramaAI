const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log("🚀 Starting Data Migration...");
    
    // 1. Find projects where synopsis starts with '{' (JSON)
    const { data: projects, error: fetchErr } = await supabase
        .from('projects')
        .select('id, title, synopsis')
        .filter('synopsis', 'like', '{%');

    if (fetchErr) {
        console.error("❌ Error fetching projects:", fetchErr);
        return;
    }

    console.log(`[System] Found ${projects.length} projects with JSON in synopsis field.`);

    for (const project of projects) {
        try {
            console.log(`[Migrate] Processing project: ${project.title} (${project.id})`);
            const data = JSON.parse(project.synopsis);

            const updates = {
                title: (typeof data.title === 'object' && data.title !== null) 
                       ? (data.title.main || data.title.title || JSON.stringify(data.title)) 
                       : (data.title || project.title),
                logline: data.logline || "",
                synopsis: (typeof data.synopsis === 'object' && data.synopsis !== null)
                          ? (data.synopsis.main || data.synopsis.text || JSON.stringify(data.synopsis))
                          : (data.synopsis || ""),
                chars: data.characters || data.chars || []
            };

            const { error: updateErr } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', project.id);

            if (updateErr) {
                console.error(`❌ Failed to update project ${project.id}:`, updateErr);
            } else {
                console.log(`✅ Project ${project.id} migrated successfully.`);
            }
        } catch (parseErr) {
            console.error(`❌ Failed to parse JSON for project ${project.id}:`, parseErr.message);
        }
    }

    console.log("🏁 Migration Complete.");
}

migrate();

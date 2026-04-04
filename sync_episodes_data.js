const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncEpisodes() {
    console.log("🚀 Starting Episode Data Sync (Splitting to Pages)...");

    const projectId = 'p-e098b-1775211651549'; // 대상 프로젝트 ID
    
    const { data: project, error: fetchErr } = await supabase
        .from('projects')
        .select('id, scripts, outline')
        .eq('id', projectId)
        .single();

    if (fetchErr || !project) {
        console.error("❌ Project not found or error:", fetchErr);
        return;
    }

    const episodeData = project.scripts || project.outline || [];
    console.log(`[System] Found ${episodeData.length} records in scripts/outline.`);

    for (let i = 0; i < episodeData.length; i++) {
        const ep = episodeData[i];
        const epNum = ep.episode || (i + 1);
        const epTitle = ep.title || `Episode ${epNum}`;
        const epStory = ep.synopsis || ep.logline || "";

        console.log(`[Sync] Episode ${epNum}: ${epTitle}`);

        const { error: upsertErr } = await supabase
            .from('episodes')
            .upsert({
                project_id: projectId,
                ep_num: epNum,
                title: epTitle,
                story: epStory,
                logline: ep.logline || ""
                // 'updated_at' removed as it's missing from schema
            }, { onConflict: 'project_id, ep_num' });

        if (upsertErr) {
            console.error(`❌ Sync failed for Ep ${epNum}:`, upsertErr);
        } else {
            console.log(`✅ Episode ${epNum} synced successfully.`);
        }
    }

    console.log("🏁 Episode Sync Complete. All data distributed to sub-pages.");
}

syncEpisodes();

const { serviceSupabase } = require('../api/supabaseClient');

async function getProjectsSchema() {
    const { data: columns, error } = await serviceSupabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'projects')
        .order('ordinal_position', { ascending: true });
    
    if (error) {
        // Many Supabase setups block direct info_schema access. 
        // Fallback: Use standard query to infer columns from keys
        const { data: sampleRow } = await serviceSupabase.from('projects').select('*').limit(1);
        if (sampleRow && sampleRow.length > 0) {
            console.log('--- Columns Inferred from Data ---');
            console.log(Object.keys(sampleRow[0]).join(', '));
        } else {
            console.error('Failed to get schema:', error.message);
        }
    } else {
        console.table(columns);
    }
}

getProjectsSchema();

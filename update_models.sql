UPDATE system_settings 
SET 
  productionModel = 'claude-sonnet-4-6', 
  planningModel = 'claude-haiku-4-5-20251001' 
WHERE id = 'global';

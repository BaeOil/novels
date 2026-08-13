ALTER TABLE writers DROP CONSTRAINT IF EXISTS writers_user_id_key;
 
ALTER TABLE user_scene_history
ADD COLUMN visit_count INTEGER NOT NULL DEFAULT 1;
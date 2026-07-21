-- =============================================
-- Add pending_approval status to tasks
-- Operational tasks (no vehicle linked) require admin approval
-- =============================================

-- Update the check constraint to allow the new status
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'pending_approval'));

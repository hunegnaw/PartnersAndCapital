-- Granular Advisor Permissions: expand 4-value enum to 10 values
-- Step 1: Add all new enum values to the existing column
ALTER TABLE `AdvisorAccess`
  MODIFY COLUMN `permissionLevel` ENUM(
    'DASHBOARD_ONLY',
    'DASHBOARD_AND_TAX_DOCUMENTS',
    'DASHBOARD_AND_DOCUMENTS',
    'SPECIFIC_INVESTMENT',
    'DASHBOARD_AND_TAX',
    'DASHBOARD_AND_LEGAL',
    'DASHBOARD_AND_REPORTS',
    'DASHBOARD_TAX_AND_LEGAL',
    'DASHBOARD_TAX_AND_REPORTS',
    'DASHBOARD_AND_ALL_DOCUMENTS',
    'DASHBOARD_AND_CAPITAL_ACTIVITY',
    'DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS',
    'FULL_ACCESS'
  ) NOT NULL DEFAULT 'DASHBOARD_ONLY';

-- Step 2: Migrate existing rows to new enum values
UPDATE `AdvisorAccess`
  SET `permissionLevel` = 'DASHBOARD_AND_TAX'
  WHERE `permissionLevel` = 'DASHBOARD_AND_TAX_DOCUMENTS';

UPDATE `AdvisorAccess`
  SET `permissionLevel` = 'DASHBOARD_AND_ALL_DOCUMENTS'
  WHERE `permissionLevel` = 'DASHBOARD_AND_DOCUMENTS';

UPDATE `AdvisorAccess`
  SET `permissionLevel` = 'DASHBOARD_AND_ALL_DOCUMENTS'
  WHERE `permissionLevel` = 'SPECIFIC_INVESTMENT';

-- Step 3: Shrink enum to only the new values (removes old values)
ALTER TABLE `AdvisorAccess`
  MODIFY COLUMN `permissionLevel` ENUM(
    'DASHBOARD_ONLY',
    'DASHBOARD_AND_TAX',
    'DASHBOARD_AND_LEGAL',
    'DASHBOARD_AND_REPORTS',
    'DASHBOARD_TAX_AND_LEGAL',
    'DASHBOARD_TAX_AND_REPORTS',
    'DASHBOARD_AND_ALL_DOCUMENTS',
    'DASHBOARD_AND_CAPITAL_ACTIVITY',
    'DASHBOARD_CAPITAL_AND_ALL_DOCUMENTS',
    'FULL_ACCESS'
  ) NOT NULL DEFAULT 'DASHBOARD_ONLY';

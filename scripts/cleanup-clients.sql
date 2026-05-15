-- ================================================================
-- Partners + Capital: Client Cleanup Script
-- ================================================================
-- Removes all CLIENT users and their associated data.
-- Preserves: investments, asset classes, admin users, blog,
--            pages, media, organization settings, system data.
--
-- Usage:
--   mysql -u <user> -p <database> < scripts/cleanup-clients.sql
--
-- WARNING: This is destructive and irreversible. Back up first.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Delete ticket replies from client-created tickets
DELETE tr FROM TicketReply tr
  INNER JOIN SupportTicket st ON tr.ticketId = st.id
  INNER JOIN User u ON st.userId = u.id
  WHERE u.role = 'CLIENT';

-- 2. Delete ticket replies authored by clients
DELETE tr FROM TicketReply tr
  INNER JOIN User u ON tr.userId = u.id
  WHERE u.role = 'CLIENT';

-- 3. Delete support tickets
DELETE st FROM SupportTicket st
  INNER JOIN User u ON st.userId = u.id
  WHERE u.role = 'CLIENT';

-- 4. Delete distributions
DELETE d FROM Distribution d
  INNER JOIN User u ON d.userId = u.id
  WHERE u.role = 'CLIENT';

-- 5. Delete contributions
DELETE c FROM Contribution c
  INNER JOIN User u ON c.userId = u.id
  WHERE u.role = 'CLIENT';

-- 6. Delete client investments (positions, not the investments themselves)
DELETE ci FROM ClientInvestment ci
  INNER JOIN User u ON ci.userId = u.id
  WHERE u.role = 'CLIENT';

-- 7. Delete client documents (not investment-level docs)
DELETE d FROM Document d
  INNER JOIN User u ON d.userId = u.id
  WHERE u.role = 'CLIENT';

-- 8. Delete advisor access logs for clients
DELETE aa FROM AdvisorAccess aa
  INNER JOIN User u ON aa.userId = u.id
  WHERE u.role = 'CLIENT';

-- 9. Delete advisor relationships where the client is the owner
DELETE a FROM Advisor a
  INNER JOIN User u ON a.clientId = u.id
  WHERE u.role = 'CLIENT';

-- 10. Delete notifications
DELETE n FROM Notification n
  INNER JOIN User u ON n.userId = u.id
  WHERE u.role = 'CLIENT';

-- 11. Delete verifications
DELETE v FROM Verification v
  INNER JOIN User u ON v.userId = u.id
  WHERE u.role = 'CLIENT';

-- 12. Delete 2FA secrets
DELETE t FROM TwoFactorSecret t
  INNER JOIN User u ON t.userId = u.id
  WHERE u.role = 'CLIENT';

-- 13. Delete backup codes
DELETE bc FROM BackupCode bc
  INNER JOIN User u ON bc.userId = u.id
  WHERE u.role = 'CLIENT';

-- 14. Delete sessions
DELETE s FROM Session s
  INNER JOIN User u ON s.userId = u.id
  WHERE u.role = 'CLIENT';

-- 15. Delete OAuth accounts
DELETE a FROM Account a
  INNER JOIN User u ON a.userId = u.id
  WHERE u.role = 'CLIENT';

-- 16. Delete password reset tokens for client emails
DELETE prt FROM PasswordResetToken prt
  INNER JOIN User u ON prt.email = u.email
  WHERE u.role = 'CLIENT';

-- 17. Delete activity feed entries targeted at clients
--     (keep broadcasts and admin-authored posts)
UPDATE ActivityFeed SET targetUserId = NULL
  WHERE targetUserId IN (SELECT id FROM User WHERE role = 'CLIENT');

-- 18. Nullify audit log references (keep the logs for history)
UPDATE AuditLog SET userId = NULL
  WHERE userId IN (SELECT id FROM User WHERE role = 'CLIENT');

-- 19. Delete access requests
DELETE FROM AccessRequest;

-- 20. Finally, delete all client users
DELETE FROM User WHERE role = 'CLIENT';

SET FOREIGN_KEY_CHECKS = 1;

-- Summary
SELECT 'Cleanup complete.' AS status;
SELECT COUNT(*) AS remaining_users FROM User;
SELECT COUNT(*) AS remaining_investments FROM Investment WHERE deletedAt IS NULL;
SELECT COUNT(*) AS remaining_client_investments FROM ClientInvestment;

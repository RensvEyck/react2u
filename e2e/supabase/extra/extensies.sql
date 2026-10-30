-- Alleen voor de testomgeving: cron.schedule in 0007, 0008, 0013 en 0028
-- heeft pg_cron nodig; op productie staan deze extensies al aan.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Run this in Supabase SQL Editor to migrate an EXISTING switch_links table.
-- This intentionally does not copy url_a or url_b into destination_url.
-- After migration, set the one intended URL per slug explicitly before enabling redirects.

alter table public.switch_links add column if not exists destination_url text;

-- Keep the new destination empty until an administrator explicitly sets the intended URL.
-- Existing rows will not redirect until destination_url is populated with a valid HTTPS URL.

alter table public.switch_links drop constraint if exists switch_links_url_a_check;
alter table public.switch_links drop constraint if exists switch_links_url_b_check;
alter table public.switch_links drop constraint if exists switch_links_active_target_check;

alter table public.switch_links drop column if exists url_a;
alter table public.switch_links drop column if exists url_b;
alter table public.switch_links drop column if exists active_target;

alter table public.switch_links add constraint switch_links_destination_url_https
  check (destination_url is null or destination_url ~ '^https://');

-- Once each destination_url has been entered, make it required:
-- alter table public.switch_links alter column destination_url set not null;

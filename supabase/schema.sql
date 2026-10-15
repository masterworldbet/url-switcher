create table if not exists public.switch_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  destination_url text not null check (destination_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.switch_links enable row level security;

-- Logged-in users can manage records. For a single-admin setup, create only the intended admin user.
create policy "authenticated read switch links"
on public.switch_links for select to authenticated
using (true);

create policy "authenticated insert switch links"
on public.switch_links for insert to authenticated
with check (true);

create policy "authenticated update switch links"
on public.switch_links for update to authenticated
using (true) with check (true);

create policy "authenticated delete switch links"
on public.switch_links for delete to authenticated
using (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists switch_links_updated_at on public.switch_links;
create trigger switch_links_updated_at before update on public.switch_links
for each row execute function public.set_updated_at();

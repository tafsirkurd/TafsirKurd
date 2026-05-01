-- i18n cache health reporting table + site_settings seeds

-- Health event log (no personal data — platform/layer/version only)
create table if not exists i18n_cache_health (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  platform      text,           -- 'ios' | 'android' | 'web'
  app_version   text,           -- e.g. '2.4.1'
  layer_used    text not null,  -- 'bundled' | 'cache' | 'remote' | 'failed'
  cache_version text,           -- value of tafsirkurd_i18n_v3 schema ver at report time
  key_count     int,            -- number of keys in merged translations object
  status        text not null,  -- 'fresh_fetch' | 'valid_cache' | 'fetch_failed_using_bundle' | 'fetch_failed_no_bundle' | 'version_purge'
  error_msg     text,           -- first 200 chars of error if fetch failed
  session_id    text            -- opaque random string set once per app session (not linked to user)
);

-- RLS: anonymous INSERT allowed (health reports from app), SELECT requires service_role
alter table i18n_cache_health enable row level security;

create policy "anon can insert health events" on i18n_cache_health
  for insert to anon with check (true);

-- Index for dashboard queries
create index if not exists i18n_cache_health_created_at_idx on i18n_cache_health (created_at desc);
create index if not exists i18n_cache_health_status_idx on i18n_cache_health (status);

-- Seed site_settings entries (skip if already set)
insert into site_settings (key, value)
values
  ('i18n_cache_version',           '1'),
  ('i18n_health_reporting_enabled','true'),
  ('i18n_last_published_at',       '')
on conflict (key) do nothing;

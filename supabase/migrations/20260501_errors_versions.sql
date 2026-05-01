-- App error logs table
create table if not exists app_error_logs (
    id              bigserial primary key,
    platform        text,
    app_version     text,
    error_type      text not null,
    error_message   text,
    stack_trace     text,
    page_context    text,
    session_id      text,
    ip_hash         text,
    created_at      timestamptz not null default now()
);

create index if not exists app_error_logs_created_at_idx on app_error_logs (created_at desc);
create index if not exists app_error_logs_type_idx on app_error_logs (error_type);
create index if not exists app_error_logs_platform_idx on app_error_logs (platform);

-- RLS: service role only (no public access)
alter table app_error_logs enable row level security;
create policy "service_role_only" on app_error_logs
    using (auth.role() = 'service_role');

-- App version stats table
create table if not exists app_version_stats (
    id              bigserial primary key,
    platform        text not null,
    build_number    text not null,
    app_version     text,
    device_count    int not null default 1,
    first_seen      timestamptz not null default now(),
    last_seen       timestamptz not null default now(),
    unique (platform, build_number)
);

create index if not exists app_version_stats_platform_idx on app_version_stats (platform);
create index if not exists app_version_stats_last_seen_idx on app_version_stats (last_seen desc);

-- RLS: service role only
alter table app_version_stats enable row level security;
create policy "service_role_only" on app_version_stats
    using (auth.role() = 'service_role');

-- Trigger: increment device_count on conflict update
create or replace function increment_version_device_count()
returns trigger language plpgsql as $$
begin
    update app_version_stats
    set device_count = device_count + 1,
        last_seen    = new.last_seen,
        app_version  = coalesce(new.app_version, app_version)
    where platform = new.platform and build_number = new.build_number;
    return null;
end;
$$;

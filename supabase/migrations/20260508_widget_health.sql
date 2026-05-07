-- Widget health telemetry from iOS devices
create table if not exists public.widget_health_reports (
    id            bigserial primary key,
    created_at    timestamptz not null default now(),
    device_id     text,
    city          text,
    status        text not null,
    age_min       integer,
    payload_len   integer,
    source        text,
    write_status  text,
    ext_age_h     numeric,
    diagnostics   jsonb,
    app_version   text,
    ios_ver       text,
    platform      text default 'ios'
);

alter table public.widget_health_reports enable row level security;

create policy "service_role_all" on public.widget_health_reports
    for all
    using (auth.role() = 'service_role');

create index if not exists widget_health_reports_created_at_idx
    on public.widget_health_reports (created_at desc);

create index if not exists widget_health_reports_status_idx
    on public.widget_health_reports (status);

create index if not exists widget_health_reports_device_id_idx
    on public.widget_health_reports (device_id);

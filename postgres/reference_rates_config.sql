-- Optional manual setup on Railway Postgres (app auto-creates this table).

create table if not exists reference_rates_config (
  id text primary key,
  config jsonb not null,
  updated_at timestamptz not null default now()
);

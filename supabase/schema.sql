-- GymTrack — esquema de Supabase.
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run.
-- Es idempotente: se puede ejecutar varias veces.

-- Función común: "gana la versión más reciente" y marca de servidor para la descarga incremental.
create or replace function public.gt_lww()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return old; -- se ignora una versión más antigua que la guardada
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'gt_profile', 'gt_exercises', 'gt_routines', 'gt_routine_exercises',
    'gt_sessions', 'gt_session_exercises', 'gt_sets', 'gt_bodyweights'
  ]
  loop
    execute format($f$
      create table if not exists public.%1$I (
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        id text not null,
        data jsonb not null,
        updated_at bigint not null,
        deleted_at bigint,
        server_updated_at timestamptz not null default clock_timestamp(),
        primary key (user_id, id)
      );
      create index if not exists %1$s_sync_idx on public.%1$I (user_id, server_updated_at, id);
      alter table public.%1$I enable row level security;

      drop policy if exists "own rows select" on public.%1$I;
      drop policy if exists "own rows insert" on public.%1$I;
      drop policy if exists "own rows update" on public.%1$I;
      create policy "own rows select" on public.%1$I for select to authenticated using (user_id = auth.uid());
      create policy "own rows insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid());
      create policy "own rows update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

      drop trigger if exists %1$s_lww on public.%1$I;
      create trigger %1$s_lww before insert or update on public.%1$I
        for each row execute function public.gt_lww();
    $f$, t);
  end loop;
end;
$$;

-- No se concede DELETE: los borrados son lógicos (deleted_at) para que se propaguen a todos los dispositivos.

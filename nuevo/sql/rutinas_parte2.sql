-- ============================================================
-- Rutinas (parte 2) · nuevas columnas · 24-sep-2026
-- Para pegar en el SQL Editor de Supabase. NO ejecutar sin revisar.
--
-- 1. ejercicios.biblioteca_id  → enlace por id a ejercicios_biblioteca.
--    Se rellena para los ejercicios que ya existen cruzando por NOMBRE
--    (sin tildes, sin mayúsculas, sin espacios de más), y solo cuando el
--    nombre coincide con UN único ejercicio de la biblioteca.
--    El nombre del ejercicio NO se toca: la app del cliente sigue igual.
-- 2. mesociclos.deportivo y mesociclos.fecha_objetivo → para la pestaña
--    Preparación (ATR): solo bloques deportivos, con fecha obligatoria.
--
-- Solo añade columnas y rellena la nueva; no cambia ningún dato existente,
-- así que no hace falta copia de seguridad. Es atómico: si algo falla,
-- no se aplica nada.
-- ============================================================
do $$
declare
  tipo text;
  n int;
begin
  -- El tipo de la columna nueva se copia del id de la biblioteca (uuid, bigint, text...)
  select format_type(a.atttypid, a.atttypmod) into tipo
    from pg_attribute a
   where a.attrelid = 'public.ejercicios_biblioteca'::regclass
     and a.attname = 'id' and not a.attisdropped;
  if tipo is null then raise exception 'No encuentro la columna id de ejercicios_biblioteca'; end if;

  execute format('alter table public.ejercicios add column if not exists biblioteca_id %s', tipo);

  -- Clave foránea: si se borra un ejercicio de la biblioteca, el enlace queda en null (no se borra el ejercicio)
  if not exists (select 1 from pg_constraint where conname = 'ejercicios_biblioteca_id_fkey') then
    begin
      execute 'alter table public.ejercicios add constraint ejercicios_biblioteca_id_fkey
               foreign key (biblioteca_id) references public.ejercicios_biblioteca(id) on delete set null';
    exception when others then
      raise notice 'No se pudo crear la clave foránea (%). El enlace funciona igual, solo sin esa comprobación.', sqlerrm;
    end;
  end if;

  alter table public.mesociclos add column if not exists deportivo boolean not null default false;
  alter table public.mesociclos add column if not exists fecha_objetivo date;

  -- Rellenar el enlace de los ejercicios existentes (mismo criterio que normalizaNombreEj del panel)
  update public.ejercicios e
     set biblioteca_id = b.id
    from (
      select id,
             regexp_replace(trim(translate(lower(nombre_es), 'áéíóúüñàèìòùâêîôûç', 'aeiouunaeiouaeiouc')), '\s+', ' ', 'g') as clave
        from public.ejercicios_biblioteca
    ) b
   where e.biblioteca_id is null
     and regexp_replace(trim(translate(lower(e.nombre), 'áéíóúüñàèìòùâêîôûç', 'aeiouunaeiouaeiouc')), '\s+', ' ', 'g') = b.clave
     and (select count(*)
            from public.ejercicios_biblioteca x
           where regexp_replace(trim(translate(lower(x.nombre_es), 'áéíóúüñàèìòùâêîôûç', 'aeiouunaeiouaeiouc')), '\s+', ' ', 'g') = b.clave) = 1;
  get diagnostics n = row_count;
  raise notice 'Ejercicios enlazados con la biblioteca por nombre: %', n;
end $$;

-- Comprobación: cuántos quedan enlazados y cuáles no (nombres, para revisarlos)
select json_build_object(
  'ejercicios_total',      (select count(*) from public.ejercicios),
  'enlazados',             (select count(*) from public.ejercicios where biblioteca_id is not null),
  'sin_enlace',            (select count(*) from public.ejercicios where biblioteca_id is null),
  'nombres_sin_enlace',    (select json_agg(nombre order by nombre)
                              from (select distinct nombre from public.ejercicios where biblioteca_id is null order by nombre limit 60) s),
  'mesociclos_columnas',   (select json_agg(column_name) from information_schema.columns
                             where table_schema = 'public' and table_name = 'mesociclos'
                               and column_name in ('deportivo', 'fecha_objetivo'))
) as resultado;

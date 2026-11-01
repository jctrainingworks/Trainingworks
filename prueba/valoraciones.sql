-- Tabla para la pestaña "Valoración" del panel (tests de fuerza y resistencia).
-- Pégalo entero en el SQL Editor de Supabase y pulsa Run. Se puede ejecutar más de una vez sin romper nada.
-- El tipo de cliente_id se copia automáticamente del de clientes.id (uuid o número), así no hay que adivinarlo.

DO $$
DECLARE tipo_id text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO tipo_id
  FROM pg_attribute a
  WHERE a.attrelid = 'public.clientes'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.valoraciones (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id  %s NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
      fecha       timestamptz NOT NULL DEFAULT now(),
      test        text NOT NULL,
      datos       jsonb NOT NULL DEFAULT '{}'::jsonb,
      resultado   jsonb NOT NULL DEFAULT '{}'::jsonb,
      notas       text
    )$f$, tipo_id);
END $$;

CREATE INDEX IF NOT EXISTS valoraciones_cliente_fecha_idx ON public.valoraciones (cliente_id, fecha DESC);

ALTER TABLE public.valoraciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "valoraciones_entrenador" ON public.valoraciones;
CREATE POLICY "valoraciones_entrenador" ON public.valoraciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.valoraciones TO authenticated;

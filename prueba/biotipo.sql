-- Pestaña "Biotipo" del panel (mezcla ecto/meso/endo según Roberto Castellano).
-- Pégalo entero en el SQL Editor de Supabase y pulsa Run. Se puede ejecutar más de una vez sin romper nada.
-- El tipo de cliente_id se copia automáticamente del de clientes.id (uuid o número), así no hay que adivinarlo.

DO $$
DECLARE tipo_id text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO tipo_id
  FROM pg_attribute a
  WHERE a.attrelid = 'public.clientes'::regclass AND a.attname = 'id' AND NOT a.attisdropped;

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.biotipo_valoraciones (
      id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cliente_id                 %s NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
      fecha                      timestamptz NOT NULL DEFAULT now(),
      consentimiento_fotos_fecha timestamptz,
      foto_frontal               text,
      foto_lateral               text,
      foto_espalda               text,
      talla_cm                   numeric,
      peso_kg                    numeric,
      rasgos                     jsonb NOT NULL DEFAULT '{}'::jsonb,
      cuestionario               jsonb NOT NULL DEFAULT '{}'::jsonb,
      puntos                     jsonb NOT NULL DEFAULT '{}'::jsonb,
      propuesta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
      confirmado                 jsonb NOT NULL DEFAULT '{}'::jsonb,
      notas                      text
    )$f$, tipo_id);
END $$;

CREATE INDEX IF NOT EXISTS biotipo_valoraciones_cliente_fecha_idx ON public.biotipo_valoraciones (cliente_id, fecha DESC);

ALTER TABLE public.biotipo_valoraciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biotipo_valoraciones_entrenador" ON public.biotipo_valoraciones;
CREATE POLICY "biotipo_valoraciones_entrenador" ON public.biotipo_valoraciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.biotipo_valoraciones TO authenticated;

-- Almacenamiento PRIVADO para las fotos (solo el entrenador autenticado puede verlas; la app del cliente no tiene acceso).
-- Solo JPEG, máximo 5 MB por foto (las fotos ya se comprimen en el panel a ~150-350 KB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('biotipo', 'biotipo', false, 5242880, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg'];

DROP POLICY IF EXISTS "biotipo_fotos_entrenador" ON storage.objects;
CREATE POLICY "biotipo_fotos_entrenador" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'biotipo') WITH CHECK (bucket_id = 'biotipo');

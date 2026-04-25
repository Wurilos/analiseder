CREATE TABLE public.equipamento_observacoes (
  codigo TEXT PRIMARY KEY,
  observacao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipamento_observacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Observacoes - leitura publica"
  ON public.equipamento_observacoes FOR SELECT
  USING (true);

CREATE POLICY "Observacoes - insercao publica"
  ON public.equipamento_observacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Observacoes - atualizacao publica"
  ON public.equipamento_observacoes FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Observacoes - exclusao publica"
  ON public.equipamento_observacoes FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER equipamento_observacoes_updated_at
  BEFORE UPDATE ON public.equipamento_observacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
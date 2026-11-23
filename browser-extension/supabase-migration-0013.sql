-- =============================================================================
-- Birthday Gift IL - Browser Extension & Tampermonkey Lightweight Feed RPC
-- Privacy-first: returns ONLY public store domains & active benefit counts.
-- =============================================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Populate normalized hostnames for all 24 seeded stores
UPDATE public.stores SET domains = ARRAY['hm.com', 'www2.hm.com'] WHERE slug = 'hm';
UPDATE public.stores SET domains = ARRAY['originals.co.il'] WHERE slug = 'originals-israel';
UPDATE public.stores SET domains = ARRAY['asos.com'] WHERE slug = 'asos';
UPDATE public.stores SET domains = ARRAY['nike.com'] WHERE slug = 'nike';
UPDATE public.stores SET domains = ARRAY['vans.co.il'] WHERE slug = 'vans-israel';
UPDATE public.stores SET domains = ARRAY['worker.co.il'] WHERE slug = 'worker';
UPDATE public.stores SET domains = ARRAY['papaya.co.il'] WHERE slug = 'papaya';
UPDATE public.stores SET domains = ARRAY['samsung.com'] WHERE slug = 'samsung-il';
UPDATE public.stores SET domains = ARRAY['aldoshoes.co.il'] WHERE slug = 'aldo-brill';
UPDATE public.stores SET domains = ARRAY['ilmakiage.co.il'] WHERE slug = 'il-makiage';
UPDATE public.stores SET domains = ARRAY['adidas.co.il', 'adidas.com'] WHERE slug = 'adidas-adiclub';
UPDATE public.stores SET domains = ARRAY['nimrod.co.il'] WHERE slug = 'nimrod-stars';
UPDATE public.stores SET domains = ARRAY['paradise-jewelry.co.il'] WHERE slug = 'paradise-jewelry';
UPDATE public.stores SET domains = ARRAY['avishagarbel.co.il'] WHERE slug = 'avishag-arbel';
UPDATE public.stores SET domains = ARRAY['prettyballerinas.co.il'] WHERE slug = 'pretty-ballerinas';
UPDATE public.stores SET domains = ARRAY['hitkadasht.co.il'] WHERE slug = 'hitkadasht';
UPDATE public.stores SET domains = ARRAY['hodvehadar.co.il'] WHERE slug = 'hod-vehadar';
UPDATE public.stores SET domains = ARRAY['mcdonalds.co.il'] WHERE slug = 'mcdonalds-il';
UPDATE public.stores SET domains = ARRAY['golfco.co.il', 'steimatzky.co.il'] WHERE slug = 'golf-steimatzky';
UPDATE public.stores SET domains = ARRAY['terminalx.com', 'fox.co.il', 'dreamcard.co.il'] WHERE slug = 'fox-terminal-x';
UPDATE public.stores SET domains = ARRAY['dreamcard.co.il'] WHERE slug = 'dreamcard-vip';
UPDATE public.stores SET domains = ARRAY['roladin.co.il'] WHERE slug = 'roladin';
UPDATE public.stores SET domains = ARRAY['h-o.co.il'] WHERE slug = 'h-and-o';
UPDATE public.stores SET domains = ARRAY['castro.com'] WHERE slug = 'castro-cu';

-- Public lightweight RPC for Chrome Extension & Tampermonkey (Zero PII)
CREATE OR REPLACE FUNCTION public.get_extension_store_feed()
RETURNS TABLE (
  slug TEXT,
  name_he TEXT,
  domains TEXT[],
  discount_value TEXT,
  active_benefits_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH today_il AS (
    SELECT (NOW() AT TIME ZONE 'Asia/Jerusalem')::DATE AS d
  )
  SELECT
    s.slug,
    s.name_he,
    CASE
      WHEN array_length(s.domains, 1) > 0 THEN s.domains
      ELSE ARRAY[regexp_replace(regexp_replace(lower(s.website_url), '^https?://(www\.)?', ''), '/.*$', '')]
    END AS domains,
    s.discount_value,
    COUNT(ub.id)::BIGINT AS active_benefits_count
  FROM public.stores s
  CROSS JOIN today_il t
  LEFT JOIN public.user_benefits ub
    ON ub.store_id = s.id
   AND ub.status = 'active'
   AND ub.deleted_at IS NULL
   AND ub.window_start_date <= t.d
   AND ub.window_end_date >= t.d
  WHERE s.deleted_at IS NULL
    AND s.takedown_requested = FALSE
  GROUP BY s.id, s.slug, s.name_he, s.domains, s.website_url, s.discount_value
  ORDER BY COUNT(ub.id) DESC, s.suitability_rank ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_extension_store_feed() TO anon, authenticated;

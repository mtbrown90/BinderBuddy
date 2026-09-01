-- ============================================================
-- Adds an "all 3 styles" bundle option to the placeholder-PDF product.
-- A purchase with style = 'all' unlocks all three individual PDFs at
-- download time (see src/app/api/masterset-pdf/[purchaseId]/route.ts,
-- which picks the rendered style from a ?style= query param for these).
--
-- Run this once in the Supabase SQL editor.
-- ============================================================

alter table masterset_pdf_purchases drop constraint masterset_pdf_purchases_style_check;
alter table masterset_pdf_purchases add constraint masterset_pdf_purchases_style_check
  check (style in ('color', 'bw', 'text', 'all'));

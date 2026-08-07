alter table public.quotes
add column discount_rate_basis_points integer not null default 0,
add column deposit_rate_basis_points integer not null default 0,
add constraint quotes_discount_rate_basis_points_check
  check (discount_rate_basis_points between 0 and 10000),
add constraint quotes_deposit_rate_basis_points_check
  check (deposit_rate_basis_points between 0 and 10000);

alter table public.quote_sections
add column title text not null,
add column position bigint not null default 0,
add constraint quote_sections_title_check
  check (char_length(btrim(title)) > 0),
add constraint quote_sections_position_check
  check (position >= 0);

alter table public.quote_lines
add column catalog_item_id uuid,
add column label text not null,
add column description text,
add column unit text not null,
add column quantity_milliunits bigint not null,
add column unit_price_ht_cents bigint,
add column vat_rate_basis_points integer,
add column position bigint not null default 0,
add constraint quote_lines_catalog_item_organization_fkey
  foreign key (organization_id, catalog_item_id)
  references public.catalog_items (organization_id, id)
  on delete set null (catalog_item_id),
add constraint quote_lines_label_check
  check (char_length(btrim(label)) > 0),
add constraint quote_lines_description_check
  check (description is null or char_length(btrim(description)) > 0),
add constraint quote_lines_unit_check
  check (char_length(btrim(unit)) > 0),
add constraint quote_lines_quantity_milliunits_check
  check (quantity_milliunits > 0),
add constraint quote_lines_unit_price_ht_cents_check
  check (unit_price_ht_cents is null or unit_price_ht_cents >= 0),
add constraint quote_lines_vat_rate_basis_points_check
  check (vat_rate_basis_points is null or vat_rate_basis_points between 0 and 10000),
add constraint quote_lines_position_check
  check (position >= 0);

create index quote_lines_organization_catalog_item_idx
  on public.quote_lines (organization_id, catalog_item_id)
  where catalog_item_id is not null;

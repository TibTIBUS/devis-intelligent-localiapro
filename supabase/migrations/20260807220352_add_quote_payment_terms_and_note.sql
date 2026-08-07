alter table public.quotes
add column payment_terms text,
add column note text,
add constraint quotes_payment_terms_length_check
  check (payment_terms is null or char_length(btrim(payment_terms)) between 1 and 2000),
add constraint quotes_note_length_check
  check (note is null or char_length(btrim(note)) between 1 and 4000);

grant update (payment_terms, note) on public.quotes to authenticated;

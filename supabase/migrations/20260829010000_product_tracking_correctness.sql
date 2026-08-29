-- Canonical Amazon identity and marketplace currency for tracked products.
-- Apply only after 20260829000000_price_check_scheduling.sql.

alter table public.tracked_products
  add column if not exists marketplace text,
  add column if not exists currency text;

update public.tracked_products
set marketplace = lower(
  regexp_replace(
    split_part(
      regexp_replace(amazon_url, '^https?://', '', 'i'),
      '/',
      1
    ),
    '^(www|smile|m)\.',
    '',
    'i'
  )
)
where marketplace is null;

update public.tracked_products
set asin = upper(
  substring(
    amazon_url from '/(?:dp|gp/product)/([A-Za-z0-9]{10})(?:[/?]|$)'
  )
)
where asin is null;

update public.tracked_products
set currency = case marketplace
  when 'amazon.ae' then 'AED'
  when 'amazon.ca' then 'CAD'
  when 'amazon.co.jp' then 'JPY'
  when 'amazon.co.uk' then 'GBP'
  when 'amazon.com' then 'USD'
  when 'amazon.com.au' then 'AUD'
  when 'amazon.com.be' then 'EUR'
  when 'amazon.com.br' then 'BRL'
  when 'amazon.com.mx' then 'MXN'
  when 'amazon.com.tr' then 'TRY'
  when 'amazon.de' then 'EUR'
  when 'amazon.eg' then 'EGP'
  when 'amazon.es' then 'EUR'
  when 'amazon.fr' then 'EUR'
  when 'amazon.in' then 'INR'
  when 'amazon.it' then 'EUR'
  when 'amazon.nl' then 'EUR'
  when 'amazon.pl' then 'PLN'
  when 'amazon.sa' then 'SAR'
  when 'amazon.se' then 'SEK'
  when 'amazon.sg' then 'SGD'
  else currency
end
where currency is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tracked_products_marketplace_format'
      and conrelid = 'public.tracked_products'::regclass
  ) then
    alter table public.tracked_products
      add constraint tracked_products_marketplace_format
      check (marketplace is null or marketplace ~ '^amazon\.[a-z.]+$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tracked_products_asin_format'
      and conrelid = 'public.tracked_products'::regclass
  ) then
    alter table public.tracked_products
      add constraint tracked_products_asin_format
      check (asin is null or asin ~ '^[A-Z0-9]{10}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tracked_products_currency_format'
      and conrelid = 'public.tracked_products'::regclass
  ) then
    alter table public.tracked_products
      add constraint tracked_products_currency_format
      check (currency is null or currency ~ '^[A-Z]{3}$');
  end if;
end $$;

-- Inspect and resolve duplicates before applying this unique index to legacy
-- databases. It enforces the same identity used by the API for all canonical rows.
create unique index if not exists tracked_products_owner_marketplace_asin_uidx
  on public.tracked_products (device_id, marketplace, asin)
  where marketplace is not null and asin is not null;

begin;

create or replace function private.ensure_unique_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_slug text;
  candidate text;
  suffix text;
  duplicate_exists boolean;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base_slug := private.slugify(
      case tg_table_name
        when 'artists' then to_jsonb(new) ->> 'name'
        else to_jsonb(new) ->> 'title'
      end
    );
  else
    base_slug := private.slugify(new.slug);
  end if;

  if base_slug = '' then
    base_slug := tg_table_name;
  end if;

  candidate := base_slug;
  suffix := left(new.id::text, 8);

  execute format(
    'select exists(select 1 from public.%I where lower(slug) = lower($1) and id <> $2)',
    tg_table_name
  )
  into duplicate_exists
  using candidate, new.id;

  if duplicate_exists then
    candidate := base_slug || '-' || suffix;
  end if;

  new.slug := candidate;
  return new;
end;
$$;

commit;

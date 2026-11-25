-- Only catalog checks; no application data.
do $$
declare t text; p text; role_name text; expected boolean;
begin
  foreach t in array array['projects','sections','evidence'] loop
    if not (select relrowsecurity from pg_class where oid=('public.'||t)::regclass) then
      raise exception 'RLS missing on %',t;
    end if;
    foreach role_name in array array['anon','authenticated'] loop
      foreach p in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
        expected := role_name='authenticated' and p in ('SELECT','INSERT','UPDATE','DELETE');
        if has_table_privilege(role_name,'public.'||t,p) is distinct from expected then
          raise exception 'Unexpected privilege % % %',role_name,t,p;
        end if;
      end loop;
    end loop;
  end loop;
  raise notice 'S01 42 effective privilege checks and RLS on 3 tables PASS';
end $$;

import os, psycopg
u = os.environ['SUPABASE_DB_URL']
with psycopg.connect(u, connect_timeout=20, autocommit=True) as c, c.cursor() as cur:
    cur.execute("select id, date, hours, earned, difficulty, left(coalesce(note,''),60), length(coalesce(note,'')) from public.shifts order by date")
    for r in cur.fetchall(): print("SHIFT", r)
    cur.execute("select count(*) from auth.users")
    print("AUTH USERS:", cur.fetchone()[0])
    cur.execute("select current_user, session_user")
    print("USER:", cur.fetchone())
    cur.execute("select count(*) from public.memories")
    print("MEMORIES:", cur.fetchone()[0])
    cur.execute("select tablename, policyname, cmd, roles::text from pg_policies where schemaname='public'")
    for r in cur.fetchall(): print("POLICY", r)

-- 누름 시작 전 확인 (부름 Supabase SQL Editor 에서 Run) — 결과 표를 그대로 보여 주세요.
-- 누름이 빌려 쓰는 부름 표의 칸이 있는지만 봅니다. 아무것도 바꾸지 않습니다.
select t.tbl, t.col,
       exists (select 1 from information_schema.columns c
                where c.table_schema = 'public' and c.table_name = t.tbl and c.column_name = t.col) as ok
  from (values ('invites','code'),('invites','issuer_account_id'),('invites','issuer_persona_id'),('invites','max_uses'),
               ('invites','expires_at'),('invites','revoked_at'),('links','via_invite_id'),('links','created_at'),
               ('link_sides','link_id'),('link_sides','account_id'),('link_sides','persona_id'),
               ('calls','link_id'),('calls','call_type'),('calls','duration_seconds'),('calls','created_at'),
               ('personas','account_id'),('personas','display_name'),('personas','is_default')) as t(tbl, col)
union all
select 'function', 'is_admin', exists (select 1 from pg_proc where proname = 'is_admin')
union all
select 'function', 'accept_invite', exists (select 1 from pg_proc where proname = 'accept_invite');

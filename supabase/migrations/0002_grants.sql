-- service_role에 테이블 권한 부여. 이 프로젝트에선 0001 적용 후 service_role로 테이블 조회가
-- 42501(permission denied)로 막혀서 수동으로 추가했다. 새 프로젝트에서 0001 다음에 바로 실행할 것.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- 앞으로 새로 만드는 테이블에도 자동으로 service_role 권한이 붙게
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

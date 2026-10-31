// 서버 전용 Supabase 클라이언트 (서비스 롤 키 사용). 소유: 역할 1.
// TODO(역할 1): 실제 클라이언트 생성 및 세션/게스트 토큰 검증 유틸 구현.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase 서버 환경변수가 설정되지 않았습니다.");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// 브라우저용 Supabase 클라이언트 (anon key). 소유: 역할 1.
// TODO(역할 1): 매직링크 로그인 헬퍼 추가.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey);

// 브라우저용 Supabase 클라이언트 (anon key). 소유: 역할 1.
// 지금은 로그인/회원가입을 전부 서버(app/api/auth/signup|login)가 처리해서 여기서 바로 안 쓴다.
// 나중에 클라이언트에서 anon key로 직접 조회할 일이 생기면 그때 이 클라이언트를 쓸 것.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, anonKey);

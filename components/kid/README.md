# 아이 화면 (역할 4)

'story-planets' 시안을 옮긴 아이 화면입니다. 색·서체 토큰은 `app/globals.css`, Tailwind 색 이름은 `tailwind.config.ts`에 같은 값으로 있어요.

## 흐름 (4174 시안)

`/` · `/kid` 우리별(용이 머무는 별) → `이야기 용 만나기` → 마이크 권한 → `POST /api/sessions` → `/kid/adventure?episodeId=…&themeId=…(&short=1)`
- 아래 탭 `이야기 지도`에서 별을 넘겨 보고 `이 별에 머물기`를 누르면 용이 내려앉고 우리별로 돌아와요. 고른 별은 이 기기에 기억돼요.
- 세션 API가 실패하면(DB 없는 로컬 등) 역할 2가 지원하는 mock 회차 `mock-…-1`로 이어서 시연이 멈추지 않아요.
- `?demo=1`: 서버 없이 샘플 장소 카드("샘플" 표시)와 mock 회차로 시작. `?short=1`: 그대로 모험 화면에 넘겨요.

## 모험 화면 (역할 2 페이지, 겉모습만 역할 4)

`app/kid/adventure/page.tsx`는 이제 `AdventureStage`를 그려요. 음성 루프는 역할 2의 `useVoiceAdventure`를 그대로 써요(바꾼 것 없음).
- 용 상태(`DragonStatus`) + 마지막 내레이션 한 줄 + 선택지 큰 버튼 + `오늘은 그만할래` + 끝나면 건네주기 화면.
- 첫 화면에서 눌러 넘어오면 바로 시작하고, 주소로 바로 들어오면 `이야기 시작하기` 버튼이 보여요.
- mock 회차일 때만 아래에 회차 이름과 `처음부터`(대화 초기화)가 작게 보여요.
- 예전 화면으로 되돌리려면 페이지의 `AdventureStage`를 `VoiceSession`으로 바꾸면 돼요.

## 역할 2에게 — 가져다 쓰면 되는 것

| 부품 | 쓰는 곳 | 사용법 |
| --- | --- | --- |
| `HandoffScreen` | 회차가 끝났을 때 (`phase === "ended"`) | `<HandoffScreen episodeId={episodeId} />` — 「엄마 아빠에게 건네주세요」 + `보호자 보기`(2초 누르기 → 계산 문제) → `/parent?view=daily&ep=<episodeId>` |
| `DragonStatus` | 모험 중 상태 표시 | `<DragonStatus phase={phase} />` — 듣기·생각·말하기마다 용이 다르게 움직이고 짧은 말이 나와요 (글 못 읽는 아이용) |
| `KidShell` | 모험 화면 바탕 | `<KidShell>…</KidShell>` — 밤하늘 + 별 + 머리(부모님 버튼). 원하면 감싸서 쓰세요 |
| `Dragon` | 아무 데나 | `<Dragon className="…" />` — 눈동자가 손가락·마우스를 따라봐요 |

- 첫 `/api/story/turn` 요청에 실을 `themeId`는 `AdventureStage`가 prop으로 받고 있어요. `useVoiceAdventure`가 받아서 요청에 실어 주면 돼요 (`forest | waterfire | upside | rainbow`).
- 마이크가 첫 턴 전에 실패하면 "아래 버튼으로 골라볼까?"가 나오는데 아직 선택지가 없어서 고를 버튼이 없어요. 첫 턴(오프닝)은 마이크 없이도 받아 오면 좋겠어요.

## 역할 1에게 — 필요한 것

- **`POST /api/auth/parent-gate`**: `ParentGate`가 계산 문제를 맞히면 부르고 있어요. 지금은 404라서 화면 확인만으로 넘어가요. 생기면 응답 `ok`일 때만 통과해요 (실패 시 "확인하지 못했어요").
- **`GET /api/episodes?worldId=`**: 장소 카드. `{ episodes: [{ id, episode_number, island_title, status }] }`(camelCase도 받음). 완료(`completed`)만 보여요. `worldId`는 세션 생성 응답을 localStorage(`sangsang.worldId`)에 저장해 둔 값이에요.
- **`GET /api/episodes/[id]`** (아이 모드): 동화책 `title`, `island_title`, `episode_number`, `storybook_text`.
- **공유 카드 조회**: `/share/[token]`은 토큰으로 카드 정보를 찾는 방법이 아직 없어서 `/share/sample`만 보여요. `app/share/[token]/page.tsx`의 `lookup()`만 바꾸면 돼요.

## 로그인 화면

`/login`(역할 1 페이지)은 `components/parent/LoginScreen`을 그려요. 이메일 매직링크 하나, 비밀번호 없음, 사전 신청 동의는 선택(기본 꺼짐).
- `NEXT_PUBLIC_SUPABASE_URL`·`ANON_KEY`가 있으면 `supabase.auth.signInWithOtp`로 보내고, 링크는 `/callback?next=…`로 돌아와요. 없으면 "미리보기에서는 실제 메일을 보내지 않아요"만 보여 줘요.
- 역할 1: `/callback`(지금 501)에서 코드 교환 → 세션 쿠키 → 게스트 세계관 귀속 → `next`로 보내 주세요.

## 파일

- `FrontDoor` 첫 화면(홈 ↔ 별 고르기) · `PlanetMap` 별 고르기 · `PlanetArt` 별 그림 · `planets.ts` 별 표시 정보(이름은 `lib/story/themes.ts`)
- `ParentGate` 부모 관문 · `KidShell` 공통 틀 · `IslandList` 장소 카드 · `StoryBook` 동화책 · `startAdventure.ts` 출발 · `world.ts` 장소 데이터
- 그림: `public/kid/yong-eyebase.webp`(눈동자 뺀 용), `public/kid/planets/*.webp`

## 부모 화면

`/parent`(교신 리포트) · `/parent/episodes`(이야기 기록) · `/parent/episodes/[id]` · `/parent/settings`는 모두 `components/parent/StoryParentApp`(4174 시안)을 그려요.
데이터는 기존 `ParentDataProvider`(GET /api/episodes → 실패하면 예시 데이터)를 그대로 써요. 관찰 노트 PDF는 `components/parent/notePdf.ts`. 예전 화면 부품(ParentShell, ParentDashboard 등)은 지우지 않고 남겨 뒀어요.

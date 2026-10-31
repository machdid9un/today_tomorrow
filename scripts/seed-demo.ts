// 심사용 데모 계정 시드. 소유: 역할 3 (내용) — DB 쓰기는 service_role로 서버 밖에서 한 번만 실행한다.
//
// 무엇을 하나: 부모 화면이 "아직 쌓인 이야기가 없어요"가 아니라 며칠 쓴 가정처럼 보이게,
//   세계 1개(지우, 6살, 숨은 무지개 3밤 진행) + 끝난 회차 3개(동화책·관찰 노트·마음 담기 카드·주간 리포트 재료) + 각 회차의 대화 기록을 넣는다.
//   회차 2·3은 '마음 담기'를 쓴 회차라 관찰 노트에 '용이 이렇게 전했어요' 카드가 뜬다.
//
// 실행 (레포 루트, .env.local에 NEXT_PUBLIC_SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 있어야 함):
//   npx tsx --env-file=.env.local scripts/seed-demo.ts
//   npx tsx --env-file=.env.local scripts/seed-demo.ts --email demo@zzonggeut.app   ← 이미 가입한 계정에 이 세계를 붙인다(로그인하면 바로 보임)
//   npx tsx --env-file=.env.local scripts/seed-demo.ts --name 서아 --age 7
//
// 몇 번을 실행해도 같은 세계(고정 id)를 지우고 다시 채운다(멱등). 다른 세계·다른 계정은 건드리지 않는다.
// 끝나면 /parent?worldId=<id> 주소를 찍어 준다. 심사 전날 밤 기준으로 날짜를 '어제·그제·3일 전'으로 넣는다.
import { createClient } from "@supabase/supabase-js";
import type { ParentReportOut } from "../lib/story/reportGenerator";

// 고정 id: 다시 실행해도 같은 세계를 덮어쓴다 (형식만 UUID면 됨)
const DEMO_WORLD_ID = "0d3a0000-0000-4000-8000-000000000001";
const EP_IDS = ["0d3a0000-0000-4000-8000-0000000000e1", "0d3a0000-0000-4000-8000-0000000000e2", "0d3a0000-0000-4000-8000-0000000000e3"];

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

const NAME = arg("name") ?? "지우";
const AGE = Number(arg("age") ?? 6);
const EMAIL = arg("email");

/** n일 전 저녁 8시 30분 (KST) */
function nightAgo(days: number, hm = "20:30"): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${dd}T${hm}:00+09:00`).toISOString();
}
function plusMin(iso: string, min: number): string {
  return new Date(Date.parse(iso) + min * 60_000).toISOString();
}

type Turn = { c: string; n: string; ch?: string[] };

// ───────────────────────── 1화: 빨강 사자 (3일 전) ─────────────────────────
const EP1_TURNS: Turn[] = [
  { c: "", n: `안녕! 나는 이야기 용이에용. 너는 이름이 뭐예용?` },
  { c: NAME, n: `${NAME}! 반가워용. 여기는 숨은 무지개 별이에용. 검은 마왕이 일곱 가지 색을 몰래 가져가서 온 세상이 회색이 됐어용. 오늘부터 ${NAME}는 색을 되찾는 용사예용! 오늘 밤은 어디로 갈까용? 회색이 된 빨강 사자한테 갈까용, 아니면 조용해진 주황 귤나무로 갈까용?`, ch: ["빨강 사자", "주황 귤나무"] },
  { c: "사자!", n: `좋아용, 사자한테 가 보자용! 바위 뒤에 커다란 사자가 웅크리고 있어용. 그런데 불꽃 같던 갈기가 전부 회색이고, 으르렁 소리도 못 내고 꼬리만 떨고 있어용. ${NAME}는 사자한테 어떻게 다가가 볼까용?`, ch: ["살살 다가갈래", "이름을 부를래"] },
  { c: "살살 다가갈래", n: `${NAME}가 살금살금 다가가자 사자가 고개를 빼꼼 내밀었어용. 그런데 자기 그림자에 깜짝 놀라서 다시 숨어 버렸어용, 킥킥. 사자가 작게 말해용. "나 혼자는 무서워…" ${NAME}는 사자한테 뭐라고 해 줄까용?`, ch: ["내가 옆에 있을게", "같이 어흥 하자"] },
  { c: "내가 옆에 있을게", n: `${NAME}가 사자 옆에 꼭 붙어 앉았어용. 사자 꼬리가 조금씩 멈추고, 가슴에서 작은 불씨가 톡 튀어나왔어용! 그런데 발밑에 까만 그림자가 찰싹 붙어 불씨를 쪽쪽 빨아먹고 있어용. 까막 졸개예용. 졸개는 큰 소리를 제일 싫어한대용. 어떻게 할까용?`, ch: ["어흥 같이 해", "손뼉을 칠래"] },
  { c: "어흥 같이 해", n: `${NAME}와 사자가 동시에 "어흥!" 하고 외쳤어용. 까막 졸개가 "앗 깜짝이야!" 하고 데굴데굴 굴러 도망가면서 소리쳤어용. "마왕님이 색을 다 모으고 계시다!" 사자 갈기가 발끝부터 빨갛게 번져 가요. 사자가 활활 타오르는 갈기를 흔들며 말해용. "고마워, 이제부터 내가 같이 갈게." 사자한테 이름을 지어 줄까용? 뭐라고 부를까용?`, ch: ["불이", "활활이"] },
  { c: "불이", n: `불이! 멋진 이름이에용. 불이가 "어흥" 하고 기뻐하자 하늘에 첫 번째 색, 빨강이 돌아왔어용. 알록이 깃털 하나가 빨갛게 물들었어용. 두근거렸는데도 사자 옆에 끝까지 있어 줬지용. 불이는 ${NAME} 옆에 포근하게 누웠어용. 불이한테 잘 자라고 뭐라고 말해 줄까용?` },
  { c: "잘 자 불이, 이제 잘래", n: `불이가 꼬리로 ${NAME}를 살짝 감싸 줬어용. 빨강이 돌아온 하늘에 별이 하나 반짝 켜졌어용. 내일은 주황 귤나무가 ${NAME}를 기다려용. 이제 눈을 감아도 돼용. 잘 자용, ${NAME}.` },
];

const EP1_STORYBOOK = `숨은 무지개 별은 온통 회색이었어요. 검은 마왕이 일곱 가지 색을 몰래 가져가 버렸거든요. 그날 밤, ${NAME}는 색을 되찾는 용사가 되었어요.

바위 뒤에 커다란 사자가 웅크리고 있었어요. 불꽃 같던 갈기는 회색이 되었고, 꼬리만 달달 떨고 있었지요. "살살 다가갈래." ${NAME}가 속삭였어요.

사자는 고개를 빼꼼 내밀었다가, 제 그림자에 놀라 다시 숨어 버렸어요. "나 혼자는 무서워…" 사자가 작게 말했어요. 그러자 ${NAME}가 말했어요. "내가 옆에 있을게."

사자 가슴에서 작은 불씨가 톡 튀어나왔어요. 그런데 까만 그림자, 까막 졸개가 불씨를 쪽쪽 빨아먹고 있지 뭐예요. "어흥 같이 해!" ${NAME}가 외쳤어요.

"어흥!" 둘이 함께 외치자 까막 졸개는 데굴데굴 굴러 도망갔어요. 사자 갈기가 발끝부터 빨갛게, 빨갛게 번져 갔어요. 하늘에 첫 번째 색, 빨강이 돌아왔어요.

"불이." ${NAME}가 사자에게 이름을 지어 주었어요. 불이는 ${NAME} 곁에 포근하게 누웠어요. 빨간 하늘에 별 하나가 반짝 켜지고, ${NAME}는 스르르 잠이 들었어요.`;

const EP1_REPORT: ParentReportOut = {
  summary: `${NAME}는 숨은 무지개 별에서 회색이 된 빨강 사자 곁에 끝까지 있어 주고, 함께 "어흥" 외쳐 빨강을 되찾았어요. 사자에게 '불이'라는 이름을 지어 줬어요.`,
  childQuotes: ["살살 다가갈래", "내가 옆에 있을게", "어흥 같이 해", "불이"],
  childChoices: ["사자에게 살살 다가가기를 골랐어요", "무서워하는 사자 옆에 있어 주기로 했어요", "사자 이름을 '불이'로 지었어요"],
  observations: [
    {
      inference: `사자가 "나 혼자는 무서워"라고 하자 "내가 옆에 있을게"라고 했어요. 무서워하는 친구에게 먼저 곁을 내어 주는 쪽을 골랐어요.`,
      evidence: ["내가 옆에 있을게"],
    },
    {
      inference: `까막 졸개 앞에서 "어흥 같이 해"라고 했어요. 혼자 하기보다 함께 하는 방법을 떠올린 것일 수 있어요.`,
      evidence: ["어흥 같이 해"],
    },
  ],
  observation: "",
  lineForParent: "불이가 어흥 할 때 갈기가 무슨 색으로 변했어?",
  safetyFlags: [],
  nextEpisodeTeaser: "내일은 열매가 하나도 안 열리는 주황 귤나무 동네에 가요. 불이도 같이 가요.",
  moodWeather: "sunny",
  moodNote: `"어흥 같이 해"라고 신나게 외치며 이야기를 이끌었어요.`,
  moodEvidence: ["어흥 같이 해"],
  keywords: [{ word: "사자", count: 2 }, { word: "어흥", count: 2 }, { word: "불이", count: 2 }],
  planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 1, total: 7, goal: "검은 마왕이 가져간 일곱 색을 하나씩 되찾는다", collected: ["불이"] },
  seedSuggestions: [
    { preset: "courage", label: "용기 북돋기", emoji: "🔥", reason: `사자가 무서워할 때 "내가 옆에 있을게"라고 했어요. 내일은 용이 ${NAME}한테도 '할 수 있어용' 하고 곁에서 믿어 주는 이야기는 어떨까요? 무서우면 돌아가도 괜찮은 이야기예요.`, evidence: "내가 옆에 있을게" },
    { preset: "praise", label: "칭찬해주기", emoji: "🌟", reason: `"불이"라고 이름을 지어 줬어요. 내일은 용이 ${NAME}의 생각이 만든 변화를 알아봐 주는 이야기는 어떨까요?`, evidence: "불이" },
  ],
};

// ───────────────────────── 2화: 주황 귤나무 + 마음 담기 '용기' (그제) ─────────────────────────
const EP2_TURNS: Turn[] = [
  { c: "", n: `${NAME}! 불이랑 같이 다시 왔어용. 어제 빨강을 되찾았지용? 오늘 밤은 어디로 갈까용? 시무룩한 주황 귤나무한테 갈까용, 아니면 고개 숙인 노랑 해바라기 들판으로 갈까용?`, ch: ["주황 귤나무", "노랑 해바라기"] },
  { c: "귤나무", n: `귤나무 동네에 도착했어용. 회색이 된 귤나무가 시무룩하게 서 있어용. 열매가 하나도 안 열려서 동네가 어둡고 다들 배가 고프대용. 귤나무 뿌리 옆에 작은 샘이 있는데, 거기까지 가는 길이 어두운 굴이에용. ${NAME}는 어떻게 할까용?`, ch: ["샘물을 떠 올래", "노래를 불러 줄래"] },
  { c: "샘물 떠 올래", n: `좋은 생각이에용. 굴 입구에 서니까 안이 깜깜해용. 불이가 ${NAME} 옆에 바짝 붙었어용. 조금 두근거려도 괜찮아용. 내가 바로 옆에 있어용. ${NAME}라면 할 수 있어용. 무서우면 다른 길로 가도 돼용. 어떻게 할래용?`, ch: ["한 발만 가 볼래", "불이 갈기로 비춰 줘"] },
  { c: "한 발만 가 볼래", n: `${NAME}가 한 발, 또 한 발 들어가자 불이 갈기가 굴 안을 발갛게 비췄어용. 샘물이 반짝 보여용! 물을 떠서 귤나무에 주니까 나무가 꿈틀하고 꽃봉오리가 하나 생겼어용. 그런데 열매는 아직이에용. 귤나무가 속삭여용. "누가 곁에서 기다려 주면 열려." 기다리는 동안 뭐 할까용?`, ch: ["옆에 앉아서 기다릴래", "귤나무한테 이야기해 줄래"] },
  { c: "옆에 앉아서 기다릴래", n: `${NAME}가 귤나무 옆에 앉자, 바람이 살랑 불고 꽃봉오리가 두 개, 세 개로 늘었어용. 그때 까막 졸개가 슬그머니 와서 꽃봉오리 하나를 회색으로 덮으려 했어용! 불이가 "어흥!" 하니까 깜짝 놀라 도망가며 소리쳤어용. "마왕님 성엔 색이 하나도 없어서 깜깜해!" 귤나무한테 마지막으로 뭐라고 말해 줄까용?`, ch: ["기다릴게", "힘내"] },
  { c: "내가 기다릴게", n: `"퐁!" 첫 귤이 열렸어용! 그리고 퐁퐁퐁, 가지마다 주황 귤이 가득 열리고 나무가 주황빛으로 물들었어용. 알록이 깃털 하나가 주황이 됐어용. 두근거렸는데도 깜깜한 굴에 한 발 내밀었지용. 그게 바로 용기예용. 귤나무가 ${NAME}한테 귤 하나를 건네줘용. 먹어 볼까용, 아니면 불이랑 나눠 먹을까용?`, ch: ["불이랑 나눠 먹을래", "내가 먹을래"] },
  { c: "불이랑 나눠 먹을래 졸려", n: `불이랑 반씩 나눠 먹으니 힘이 번쩍 났어용. 오늘 ${NAME}는 두근거려도 해냈어용. 주황빛 귤나무 아래에서 불이가 먼저 새근새근 잠들었어용. 내일은 노랑 해바라기 들판이 기다려용. 잘 자용, ${NAME}.` },
];

const EP2_STORYBOOK = `귤나무 동네는 어둡고 조용했어요. 회색이 된 귤나무에 열매가 하나도 열리지 않았거든요. ${NAME}와 불이는 귤나무 앞에 섰어요.

"샘물 떠 올래." ${NAME}가 말했어요. 그런데 샘으로 가는 길은 깜깜한 굴이었어요. 이야기 용이 속삭였어요. "조금 두근거려도 괜찮아용. 내가 바로 옆에 있어용."

"한 발만 가 볼래." ${NAME}가 한 발, 또 한 발 내딛자 불이의 갈기가 굴 안을 발갛게 비췄어요. 반짝반짝, 샘물이 보였어요.

샘물을 주자 귤나무에 꽃봉오리가 톡 생겼어요. "옆에 앉아서 기다릴래." ${NAME}는 귤나무 곁에 앉았어요. 까막 졸개가 살금살금 다가왔지만, 불이의 "어흥!"에 데굴데굴 도망갔지요.

"내가 기다릴게." 그 말에 퐁, 첫 귤이 열렸어요. 퐁퐁퐁, 가지마다 주황 귤이 가득! 나무가 주황빛으로 환하게 물들었어요. 이야기 용이 말했어요. "두근거렸는데도 해냈지용."

${NAME}는 불이와 귤을 반씩 나눠 먹었어요. 주황빛 귤나무 아래, 둘은 새근새근 잠이 들었어요.`;

const EP2_REPORT: ParentReportOut = {
  summary: `${NAME}는 귤나무 동네에서 깜깜한 굴을 지나 샘물을 떠 오고, 귤나무 곁에서 기다려 주황을 되찾았어요. 귤은 불이와 나눠 먹었어요.`,
  childQuotes: ["샘물 떠 올래", "한 발만 가 볼래", "옆에 앉아서 기다릴래", "내가 기다릴게"],
  childChoices: ["샘물을 떠 오기로 골랐어요", "깜깜한 굴에 한 발만 가 보기로 했어요", "귤나무 옆에 앉아 기다리기로 했어요", "귤을 불이와 나눠 먹었어요"],
  observations: [
    {
      inference: `깜깜한 굴 앞에서 "한 발만 가 볼래"라고 했어요. 한꺼번에가 아니라 '한 발만'으로 자기 속도를 정한 것일 수 있어요.`,
      evidence: ["한 발만 가 볼래"],
    },
    {
      inference: `"옆에 앉아서 기다릴래", "내가 기다릴게"라고 했어요. 빨리 해결하기보다 곁에서 기다리는 쪽을 두 번 골랐어요.`,
      evidence: ["옆에 앉아서 기다릴래", "내가 기다릴게"],
    },
  ],
  observation: "",
  lineForParent: "굴 안에 들어갈 때 불이 갈기가 어떻게 비춰 줬어?",
  safetyFlags: [],
  nextEpisodeTeaser: "내일은 해가 사라져 고개를 푹 숙인 노랑 해바라기 들판에 가요.",
  moodWeather: "partly_cloudy",
  moodNote: `굴 앞에서 잠깐 망설였지만 "한 발만 가 볼래"라고 직접 정했어요.`,
  moodEvidence: ["한 발만 가 볼래"],
  keywords: [{ word: "기다릴게", count: 2 }, { word: "귤나무", count: 2 }, { word: "불이", count: 2 }],
  planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 2, total: 7, goal: "검은 마왕이 가져간 일곱 색을 하나씩 되찾는다", collected: ["불이", "귤"] },
  seedEcho: {
    label: "용기 북돋기",
    note: `깜깜한 굴 앞에서 ${NAME}가 망설일 때, 용이 옆에 있다고 말하고 돌아가도 괜찮다고 길을 열어 뒀어요.`,
    dragonLine: `조금 두근거려도 괜찮아용. 내가 바로 옆에 있어용. ${NAME}라면 할 수 있어용.`,
    childQuote: "한 발만 가 볼래",
  },
  seedSuggestions: [
    { preset: "praise", label: "칭찬해주기", emoji: "🌟", reason: `"내가 기다릴게"라는 말에 귤이 열렸어요. 내일은 용이 ${NAME}의 말이 만든 변화를 하나하나 알아봐 주는 이야기는 어떨까요?`, evidence: "내가 기다릴게" },
    { preset: "company", label: "곁에 있어주기", emoji: "🤝", reason: `"옆에 앉아서 기다릴래"라고 했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?`, evidence: "옆에 앉아서 기다릴래" },
  ],
};

// ───────────────────────── 3화: 노랑 해바라기 + 마음 담기 '칭찬' (어제) ─────────────────────────
const EP3_TURNS: Turn[] = [
  { c: "", n: `${NAME}! 불이도 왔고, 주머니엔 귤도 있어용. 오늘 밤은 어디로 갈까용? 고개 숙인 노랑 해바라기 들판으로 갈까용, 아니면 코를 쿨쿨 고는 초록 숲으로 갈까용?`, ch: ["노랑 해바라기", "초록 숲"] },
  { c: "해바라기", n: `해바라기 들판에 왔어용. 회색 해바라기들이 전부 고개를 푹 숙이고 있어용. 해가 사라져서 바라볼 게 없대용. 해 대신 ${NAME}가 해바라기들을 웃게 해 줘야 해용. 어떻게 웃길까용?`, ch: ["웃긴 얼굴 할래", "노래 불러 줄래"] },
  { c: "방귀 소리 낼래", n: `뿌우웅! ${NAME}가 방귀 소리를 내자 해바라기 하나가 "킥" 하고 고개를 들었어용! 그런데 나머지는 아직 숙이고 있어용. 네가 방귀 소리를 내 줘서 첫 번째 해바라기가 웃었어용. 고마워용! 해바라기가 속삭여용. "한 송이가 웃으면 옆으로 옆으로 옮아가." 이번엔 어떻게 해 볼까용?`, ch: ["더 크게 할래", "불이랑 같이 할래"] },
  { c: "불이랑 같이 뿡 할래", n: `${NAME}와 불이가 동시에 "뿌우웅!" 하자 옆 해바라기가 "하하", 그 옆이 "히히", 웃음이 들판으로 번져 가요! 그런데 아직 들판 끝 해바라기들은 멀어서 못 들었대용. 주머니에 뭐가 있지용? 귤이 있어용. 귤로 뭘 할까용?`, ch: ["귤 던져서 굴릴래", "귤 껍질로 해 만들래"] },
  { c: "귤 껍질로 해 만들래", n: `${NAME}가 귤 껍질을 동그랗게 펴서 높이 들었어용. 주황 귤 껍질이 작은 해처럼 반짝! 들판 끝 해바라기들이 "어, 해다!" 하고 고개를 들었어용. 네가 귤 껍질로 해를 만들어 줘서 멀리 있는 해바라기까지 웃었어용. 들판 전체가 노랗게, 노랗게 물들어용! 알록이 깃털이 노랑이 됐어용. 해바라기들이 ${NAME}한테 해바라기씨를 한 줌 줬어용. 씨를 뿌리면 어떻게 될까용?` },
  { c: "엄청 큰 해바라기 나올 거야", n: `맞아용, 뿌리면 해바라기가 쑥 자라서 환하게 빛나고 졸개들은 눈부셔서 도망간대용. 오늘은 ${NAME}가 방귀 소리로 첫 웃음을 만들고, 귤 껍질로 해를 만들어서 들판이 노래졌어용. 전부 ${NAME} 생각 덕분이에용. 노란 들판에 누워서 뭘 보고 싶어용?`, ch: ["별", "불이 얼굴"] },
  { c: "별 보고 싶어 이제 잘래", n: `노란 들판에 누우니 별이 하나, 둘 켜져용. 불이가 옆에서 새근새근. 내일은 덩굴이 길을 막은 초록 숲이 기다려용. 잘 자용, ${NAME}.` },
];

const EP3_STORYBOOK = `해바라기 들판은 온통 회색이었어요. 해가 사라져서 해바라기들이 모두 고개를 푹 숙이고 있었거든요. ${NAME}가 해 대신 들판을 웃겨 주기로 했어요.

"방귀 소리 낼래." 뿌우웅! 해바라기 하나가 킥, 하고 고개를 들었어요. 이야기 용이 웃으며 말했어요. "네가 방귀 소리를 내 줘서 첫 번째 해바라기가 웃었어용."

"불이랑 같이 뿡 할래." 둘이 함께 뿌우웅! 하자 옆 해바라기가 하하, 그 옆이 히히. 웃음이 들판으로 번져 갔어요.

멀리 있는 해바라기들은 아직 듣지 못했어요. 그때 ${NAME}가 말했어요. "귤 껍질로 해 만들래." 동그란 귤 껍질이 작은 해처럼 반짝 빛났어요.

"어, 해다!" 들판 끝 해바라기까지 고개를 들었어요. 들판이 노랗게, 노랗게 물들었어요. 이야기 용이 말했어요. "네가 귤 껍질로 해를 만들어 줘서 멀리 있는 해바라기까지 웃었어용."

해바라기들이 ${NAME}에게 씨를 한 줌 주었어요. 노란 들판에 누워 별을 세다가, ${NAME}는 불이 곁에서 스르르 잠이 들었어요.`;

const EP3_REPORT: ParentReportOut = {
  summary: `${NAME}는 해바라기 들판에서 방귀 소리로 첫 웃음을 만들고, 귤 껍질로 작은 해를 만들어 들판 전체를 노랗게 되찾았어요. 해바라기씨를 받았어요.`,
  childQuotes: ["방귀 소리 낼래", "불이랑 같이 뿡 할래", "귤 껍질로 해 만들래", "엄청 큰 해바라기 나올 거야"],
  childChoices: ["해바라기를 방귀 소리로 웃기기로 했어요", "불이와 함께 하기로 했어요", "귤 껍질로 해를 만들기로 했어요"],
  observations: [
    {
      inference: `"귤 껍질로 해 만들래"라고 했어요. 전날 받은 귤을 떠올려 새로운 쓰임을 생각해 냈어요.`,
      evidence: ["귤 껍질로 해 만들래"],
    },
    {
      inference: `"불이랑 같이 뿡 할래"라고 했어요. 혼자 더 크게 하기보다 친구와 함께 하는 쪽을 골랐어요.`,
      evidence: ["불이랑 같이 뿡 할래"],
    },
  ],
  observation: "",
  lineForParent: "귤 껍질 해를 보고 해바라기들이 뭐라고 했어?",
  safetyFlags: [],
  nextEpisodeTeaser: "내일은 덩굴이 길을 꽉 막고 코를 쿨쿨 고는 초록 숲에 가요.",
  moodWeather: "sunny",
  moodNote: `"방귀 소리 낼래", "뿡 할래"라며 깔깔 웃으며 이야기했어요.`,
  moodEvidence: ["방귀 소리 낼래", "불이랑 같이 뿡 할래"],
  keywords: [{ word: "해바라기", count: 2 }, { word: "불이", count: 2 }, { word: "귤", count: 2 }],
  planet: { id: "rainbow", planet: "숨은 무지개 행성", done: 3, total: 7, goal: "검은 마왕이 가져간 일곱 색을 하나씩 되찾는다", collected: ["불이", "귤", "해바라기씨"] },
  seedEcho: {
    label: "칭찬해주기",
    note: `${NAME}의 생각이 장면을 바꿀 때마다 용이 무엇이 어떻게 달라졌는지 짚어 고마워했어요(평가 말 없이).`,
    dragonLine: "네가 귤 껍질로 해를 만들어 줘서 멀리 있는 해바라기까지 웃었어용.",
    childQuote: "귤 껍질로 해 만들래",
  },
  seedSuggestions: [
    { preset: "company", label: "곁에 있어주기", emoji: "🤝", reason: `"불이랑 같이 뿡 할래"라고 했어요. 내일은 용이 처음부터 끝까지 곁에 꼭 붙어 있는 이야기는 어떨까요?`, evidence: "불이랑 같이 뿡 할래" },
    { preset: "rest", label: "편히 쉬어가기", emoji: "🌙", reason: "이런 마음도 담아 볼 수 있어요. 사건 없이 느리고 포근하게 쉬어 가는 이야기예요.", evidence: null },
  ],
};

for (const r of [EP1_REPORT, EP2_REPORT, EP3_REPORT]) r.observation = r.observations.map((o) => o.inference).join(" ");

const EPISODES = [
  { id: EP_IDS[0], n: 1, daysAgo: 3, title: "회색 사자의 첫 어흥", island: "사자 언덕", turns: EP1_TURNS, storybook: EP1_STORYBOOK, report: EP1_REPORT },
  { id: EP_IDS[1], n: 2, daysAgo: 2, title: "깜깜한 굴 너머의 귤나무", island: "귤나무 동네", turns: EP2_TURNS, storybook: EP2_STORYBOOK, report: EP2_REPORT },
  { id: EP_IDS[2], n: 3, daysAgo: 1, title: "귤 껍질 해와 웃는 들판", island: "해바라기 들판", turns: EP3_TURNS, storybook: EP3_STORYBOOK, report: EP3_REPORT },
];

const MEMORY = {
  characters: ["불이(빨강 사자, 동료)", "주황 귤나무", "노랑 해바라기들", "까막 졸개(검은 마왕 부하)"],
  items: ["귤", "해바라기씨", "귤 껍질 해"],
  places: ["사자 언덕", "귤나무 동네", "해바라기 들판"],
  keyEvents: [`${NAME}가 사자에게 '불이'라는 이름을 지어 주고 빨강을 되찾았다`, `${NAME}가 깜깜한 굴을 지나 샘물을 떠 오고 귤나무 곁에서 기다려 주황을 되찾았다`, `${NAME}가 방귀 소리와 귤 껍질 해로 해바라기 들판을 웃겨 노랑을 되찾았다`],
  nextHook: "까막 졸개가 '마왕님은 사실 외로우신 거야'라고 흘렸다. 다음은 덩굴이 길을 막은 초록 숲.",
  activePlanet: "rainbow",
  planets: {
    rainbow: { visits: 3, done: ["red_lion", "orange_tree", "yellow_sunflower"], collected: ["불이", "귤", "해바라기씨"], stage: 3 },
  },
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요해요. `npx tsx --env-file=.env.local scripts/seed-demo.ts` 로 실행하세요.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // 계정에 붙이기 (선택): 이미 가입한 이메일의 auth user id → public.users 보장 → worlds.owner_user_id
  let ownerUserId: string | null = null;
  if (EMAIL) {
    const email = EMAIL.trim().toLowerCase();
    let page = 1;
    while (!ownerUserId && page <= 20) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (hit) ownerUserId = hit.id;
      if (data.users.length < 200) break;
      page++;
    }
    if (!ownerUserId) {
      console.error(`가입된 계정을 못 찾았어요: ${email}. 먼저 /login 에서 회원가입하고 다시 실행하세요.`);
      process.exit(1);
    }
    const { error: userErr } = await sb.from("users").upsert({ id: ownerUserId }, { onConflict: "id" });
    if (userErr) throw userErr;
  }

  // 1) 세계 (고정 id, 덮어쓰기)
  const { error: worldErr } = await sb.from("worlds").upsert(
    {
      id: DEMO_WORLD_ID,
      owner_user_id: ownerUserId,
      guest_token_hash: null,
      guest_expires_at: null,
      child_name: NAME,
      child_age: Number.isFinite(AGE) ? AGE : 6,
      memory_json: MEMORY,
      next_seed_preset: null,
      next_seed_text: null,
    },
    { onConflict: "id" }
  );
  if (worldErr) throw worldErr;

  // 2) 이 세계의 옛 회차 비우기 (turns는 cascade)
  const { error: delErr } = await sb.from("episodes").delete().eq("world_id", DEMO_WORLD_ID);
  if (delErr) throw delErr;

  // 3) 끝난 회차 3개 + 대화 기록
  for (const ep of EPISODES) {
    const startedAt = nightAgo(ep.daysAgo);
    const { error: epErr } = await sb.from("episodes").insert({
      id: ep.id,
      world_id: DEMO_WORLD_ID,
      episode_number: ep.n,
      status: "completed",
      started_at: startedAt,
      ended_at: plusMin(startedAt, 9),
      end_reason: "sleep_request",
      title: ep.title,
      island_title: ep.island,
      storybook_text: ep.storybook,
      report_json: ep.report,
      next_teaser: ep.report.nextEpisodeTeaser,
    });
    if (epErr) throw epErr;
    const rows = ep.turns.map((t, i) => ({
      episode_id: ep.id,
      turn_index: i,
      child_text: t.c,
      narration: t.n,
      choices_json: t.ch ?? [],
      latency_ms: 1800 + ((i * 377) % 900),
      created_at: plusMin(startedAt, i),
    }));
    const { error: turnErr } = await sb.from("turns").insert(rows);
    if (turnErr) throw turnErr;
  }

  console.log("✅ 데모 세계 준비됨");
  console.log(`   worldId: ${DEMO_WORLD_ID}`);
  console.log(`   아이: ${NAME} (${AGE}살) · 숨은 무지개 3/7 · 끝난 회차 3개 (3일 전·그제·어제)`);
  console.log(`   부모 화면: /parent?worldId=${DEMO_WORLD_ID}`);
  if (ownerUserId) console.log(`   계정 ${EMAIL} 에 붙였어요 → /login 으로 로그인하면 바로 보여요.`);
  else console.log("   계정에 붙이려면: --email <가입한 이메일> 로 다시 실행 (멱등).");
  console.log("   아이 화면에서 4화를 이어 하려면: 위 부모 화면을 한 번 연 뒤 '아이 화면으로 가기' (이 기기에 worldId가 저장됨).");
}

export const DEMO = { worldId: DEMO_WORLD_ID, name: NAME, episodes: EPISODES, memory: MEMORY };

if (process.env.SEED_DRY === "1") {
  console.log(JSON.stringify({ worldId: DEMO_WORLD_ID, episodes: EPISODES.map((e) => ({ id: e.id, n: e.n, turns: e.turns.length, reportKeys: Object.keys(e.report) })) }, null, 1));
} else main().catch((err) => {
  console.error("❌ 시드 실패:", err?.message ?? err);
  process.exit(1);
});

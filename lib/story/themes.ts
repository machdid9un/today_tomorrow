// 행성(이야기 테마) 설정집. 소유: 역할 3.
// 팀 확정 세계관: 각 행성은 하나의 '놀이 주제'를 가진다. 아이의 말이 행성에 변화를 일으키고,
// 정답보다 아이의 상상과 설명이 중요하다. 행성마다 언어·감정·관계·감각 중 하나를 중심으로 삼는다.
//
// 행성마다 '밤 목록(nights)'이 있다(예: 숨은 무지개의 일곱 색). 한 밤은 그 밤만 들어도 완결되고,
// 밤마다 할 일은 고정이지만 어느 밤부터 할지는 아이가 고른다(마지막 밤만 고정). 두 밤마다 방해꾼이 한 번 나온다.
// 진행 상태(끝낸 밤·아이가 만든 것)는 worlds.memory_json.planets에 저장된다.
// 이 설정집은 ① 이야기 프롬프트 ② 갈림길 장면 ③ 음성 인식(STT) 낱말 힌트가 함께 쓴다.

export type PlanetId = "forest" | "waterfire" | "upside" | "rainbow";

/**
 * 한 밤의 줄거리. 밤마다 할 일은 고정이고, 어느 밤부터 할지는 아이가 고른다(마지막 밤만 고정).
 * 글은 모두 '이야기 용이 아이에게 전하는 말'로 쓴다(다른 인물의 말도 용이 전해 준다).
 */
export interface PlanetNight {
  id: string;
  /** 고를 때 들려주는 짧은 이름 (예: '빨강 사자') */
  label: string;
  /** 아이 대답에서 이 밤을 알아보는 낱말 */
  keywords: string[];
  /** 곤란(훅): 누가 무엇을 바라는데 무엇이 막고 있는가 */
  hook: string;
  /** 해결법: 아이가 하는 일 (질문 방향) */
  method: string;
  /** 첫 시도의 뜻밖의 결과 (실패라고 말하지 않음, 반만 되거나 웃긴 일) */
  twist: string;
  /** 진짜 이유 / 풀리는 열쇠 (두 번째 시도에서 드러남) */
  key: string;
  /** 해결 장면 (아이 말 덕분에) */
  resolve: string;
  /** 얻는 것: 다음 밤부터 쓸 수 있는 동료·물건 (어느 밤에 얻어도 쓸 수 있게) */
  reward: { name: string; use: string };
  /** 마지막 밤(모은 것을 다 쓰는 결전). 다른 밤을 다 끝내야 열린다 */
  finale?: boolean;
}

/** 방해꾼: 두 밤을 끝낼 때마다 한 번 나온다(2·4·6번째 밤). 가진 것으로 쫓아내고, 나올 때마다 단서를 하나 흘린다 */
export interface PlanetVillain {
  name: string;
  desc: string;
  /** 쫓아내는 방식 (다치지 않게) */
  repel: string;
  /** 나올 때마다 차례로 흘리는 단서 (마지막 밤 결말의 근거) */
  hints: string[];
}

export interface StoryTheme {
  id: PlanetId;
  planet: string;
  tag: string;
  /** 중심 영역 */
  domain: "언어" | "감정" | "관계" | "감각" | "창작";
  /** 아이가 하는 놀이 동작 */
  play: string;
  mood: string;
  /** 이 행성다운 질문 방식 (턴 2·열린 질문에 쓰임) */
  questionStyle: string;
  /** 정답이 없게 받아 주는 규칙 + 이 행성다운 '몰라' 힌트 */
  answerRules: string;
  clues: string[];
  characters: string[];
  items: string[];
  places: string[];
  actions: string[];
  /** STT 힌트: 아이가 이 별에서 '말할 법한' 낱말 중 가장 흔한 것 (실시간 50개 한도 안에 먼저 넣음) */
  sttCore: string[];
  /** STT 힌트: 그 밖에 나올 수 있는 낱말 (배치 전사·긴 목록용) */
  sttMore: string[];
  softeners?: string;
  /** 이 별의 단짝 친구 (매 밤 나오는 고정 인물). 오늘 밤의 문제는 이 친구의 바람에서 시작한다 */
  host: { name: string; desc: string };
  /**
   * 세계관: 이 별에 '처음' 왔을 때 이야기 용이 첫 장면 앞에서 들려준다.
   * intro = 이 별이 어떤 곳이고 무엇이 문제인지 (아이에게 그대로 말할 1~2문장), role = 오늘부터 아이의 역할 (한 마디)
   */
  world: { intro: string; role: string };
  /** 부모 관찰 노트: 이 별에서 볼 만한 것, 좋은 관찰 예, 절대 쓰면 안 되는 해석 */
  observe: { focus: string; example: string; never: string };
  /** 시즌 제목과, 밤 시작에 단짝 친구가 남은 밤을 알려 주는 말투 */
  season: { title: string; chooseLine: string };
  villain: PlanetVillain;
  nights: PlanetNight[];
}

/** 숨은 무지개 행성의 7색 (표시 순서). 찾는 순서는 아이가 고르고, 보라(마왕 결전)만 마지막 */
export const RAINBOW_COLORS = ["빨강", "주황", "노랑", "초록", "파랑", "남색", "보라"];

export const THEMES: StoryTheme[] = [
  {
    id: "forest",
    planet: "구름숲 행성",
    tag: "작은 시작, 커다란 상상",
    domain: "창작",
    play: "세계를 자유롭게 만들고 이름 붙이기 (쓰임 정하기 → 이름 짓기 → 자리 놓기)",
    mood: "아이가 이름 붙인 만큼 자라는 폭신한 구름숲. 아이가 만든 것은 다음 밤에도 숲에 그대로 남아 있다",
    questionStyle:
      "아이가 직접 만들고 이름 붙이게 묻는다. 이름을 묻기 전에 쓰임을 먼저 묻는다('이 나무는 무슨 일을 하는 나무일까용?' → '그럼 뭐라고 불러 줄까용?'). 생김새·사는 친구·놓을 자리도 아이가 정한다('이 집엔 누가 살고 있을까용?'). 아이가 만든 것은 바로 숲에 생겨나게 그린다.",
    answerRules:
      "아이가 지은 이름·모양은 무엇이든 그대로 숲의 일부가 된다('뿌뿌' → 뿌뿌나무). 이미 지은 이름을 바꾸고 싶어 하면 덮어쓰지 말고 별명으로 더한다. '몰라'면 ① 쓰임·생김새를 두 가지 중 고르게 하고('반짝이는 나무? 노래하는 나무?') ② 그래도 어려우면 '나무가 살랑 했어용. 살랑나무 어때용?'처럼 용이 먼저 하나 내고 아이가 고르게 하거나 ③ '이름은 내일 지어도 돼용. 오늘은 아직나무라고 부를까용?'. 괴물은 부끄럼 많은 큰 친구로, 부수기·태우기는 변신·숨기·노을빛으로 바꾼다.",
    clues: ["사각사각 나뭇잎 소리", "부엉부엉 부엉이 소리", "똑똑 작은 문 두드리는 소리", "반딧불이 불빛이 깜빡깜빡", "살랑살랑 구름 나무 흔들리는 소리"],
    characters: ["몽글이", "아기 새", "반딧불이", "다람쥐", "휘잉이", "아기 토끼", "아기 부엉이", "고슴도치", "아기 곰", "달팽이"],
    items: ["이름 없는 나무", "작은 집", "열매", "이불", "사다리", "바구니", "등불", "도토리"],
    places: ["구름 나무 아래", "숲속 작은 집", "연못", "언덕", "오솔길"],
    actions: ["이름 지어 줄래", "집 지을래", "여기 놓을래", "또 만들래", "친구 부를래", "같이 살래"],
    sttCore: ["구름숲", "몽글이", "휘잉이", "아기 새", "구름 집", "구름 길", "우산 나무", "구름 다리", "구름 케이크", "큰 바람", "생일", "케이크", "구름 나무", "작은 집", "다람쥐", "아기 토끼", "부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 사슴", "달팽이", "구름양", "새싹이", "열매", "이불", "연못", "언덕", "오솔길", "내가 지을래", "이름은", "여기 놓을래", "또 만들래", "같이 살아"],
    sttMore: ["숲속", "나무집", "오두막", "창문", "지붕", "굴뚝", "우편함", "편지", "도토리", "버섯", "솔방울", "나뭇잎", "꽃", "사과", "딸기", "사다리", "바구니", "등불", "옹달샘", "디딤돌", "징검다리", "다리", "그네", "울타리", "잔치", "선물", "노래", "자장가", "구름 지붕", "나뭇잎 지붕", "동그라미", "세모", "네모", "하트", "별 모양", "폭신폭신", "사각사각", "살랑살랑", "바스락", "사르르", "쑥쑥", "부엉부엉", "똑똑", "반짝반짝", "몽실이", "폭신이", "초롱이", "뽀송이", "아직나무", "이거 내 거야", "이름 지어 줄래", "집 지을래", "친구 부를래", "같이 갈래", "심을래", "놀러 갈래"],
    host: { name: "몽글이", desc: "폭신한 구름 양. 숲지기인데 수줍고 자주 깜빡 잊어서, 아이와 함께 숲을 채우고 싶어 한다" },
    world: {
      intro: "구름숲 행성은 이름을 붙여 주면 구름이 나무도 되고 집도 되는 폭신한 숲이에용. 그런데 아직 이름이 없어서 숲이 텅 비고 깜깜해용.",
      role: "숲에 이름을 붙여 불을 밝히는 이름 짓기 대장",
    },
    observe: {
      focus: "아이가 지은 이름·쓰임·자리, 만든 것을 아끼고 챙기는 방식",
      example: "\"고슴도치가 폭신 이불 입으면 안 따가워\"라고 했어요. 친구가 불편하지 않을 방법부터 떠올렸어요.",
      never: "이름을 빨리 못 지어요 / 창의성이 또래보다 부족해 보여요",
    },
    season: {
      title: "구름숲 불빛 — 친구 하나를 도울 때마다 숲에 불빛 하나",
      chooseLine: "몽글이가 귀에 속삭여용. '아직 도와주지 못한 친구가 있어용.'",
    },
    villain: {
      name: "휘잉이",
      desc: "떠돌이 바람. 아이가 만든 것을 휙 흩뜨려 놓고 간다. 나쁜 마음은 아니고, 이름이 없어서 아무 데도 머물 수 없는 바람이다",
      repel: "아이가 흩어진 것의 이름을 다시 불러 주면 그것이 제자리로 돌아오고, 휘잉이는 멋쩍어서 휘리릭 가 버린다",
      hints: ["휘잉이가 가면서 중얼거렸어용. '나도 머물 데가 있으면 좋겠다…'", "휘잉이가 가면서 중얼거렸어용. '나는 이름이 없어서 아무 데도 못 머물러…'", "휘잉이가 가면서 중얼거렸어용. '누가 내 이름을 불러 주면 좋겠다…'"],
    },
    nights: [
      {
        id: "bird_house",
        label: "아기 새",
        keywords: ["새", "아기 새", "집"],
        hook: "몽글이가 비에 젖은 아기 새를 데려왔어용. 숲에 집이 하나도 없어서 아기 새가 오들오들 떨고 있어용.",
        method: "아이가 구름으로 집을 만든다: 어떤 모양일지, 어디에 놓을지, 이름은 무엇인지 아이가 정한다(이름을 부르면 구름이 그 집이 된다).",
        twist: "아이가 말한 모양대로 구름 집이 생겼는데, 아직 이름이 없어서 바람에 둥실 떠올라 아기 새가 못 들어간다.",
        key: "이 숲의 구름은 이름을 불러 줘야 땅에 내려와 머문다.",
        resolve: "아이가 지은 이름을 부르자 집이 사르르 내려와 자리 잡고, 아기 새가 들어가 창문에 첫 불빛이 켜진다.",
        reward: { name: "구름 집", use: "비가 오거나 추울 때 누구든 들어가 쉴 수 있다" },
      },
      {
        id: "firefly_road",
        label: "반딧불이",
        keywords: ["반딧불", "반딧불이", "길"],
        hook: "반딧불이 꼬마가 집에 가는 길을 잃었어용. 숲이 깜깜해서 어디가 길인지 안 보인대용.",
        method: "아이가 구름 길을 만든다: 길을 어디로 낼지, 길 이름은 무엇인지 아이가 정한다.",
        twist: "아이가 말한 대로 길이 생겼는데, 길이 빙글빙글 꼬여서 반딧불이가 제자리로 돌아온다(웃김).",
        key: "길에도 이름이 있어야 똑바로 뻗는다.",
        resolve: "아이가 지은 이름을 부르자 길이 쭉 펴지고, 반딧불이가 그 길을 따라 집에 간다. 길 위에 불빛이 하나 켜진다.",
        reward: { name: "구름 길", use: "이름을 부르면 어디로든 데려다 준다" },
      },
      {
        id: "umbrella_tree",
        label: "다람쥐 가족",
        keywords: ["다람쥐", "우산", "나무"],
        hook: "비가 오는데 다람쥐 가족이 비를 피할 곳이 없어서 꼬리로 서로를 덮어 주고 있어용.",
        method: "아이가 우산 나무를 만든다: 잎이 어떤 모양일지, 이름은 무엇인지 아이가 정한다.",
        twist: "아이가 말한 대로 나무가 쑥 자랐는데, 잎이 너무 작아 빗방울이 톡톡 새어 다람쥐 코에 떨어진다.",
        key: "이름을 불러 주면 잎이 활짝 펴진다.",
        resolve: "아이가 지은 이름을 부르자 잎이 우산처럼 활짝 펴지고, 다람쥐 가족이 그 아래에서 꼬리를 말고 잠든다. 불빛이 하나 켜진다.",
        reward: { name: "우산 나무", use: "비와 바람을 막아 준다" },
      },
      {
        id: "cloud_bridge",
        label: "시냇물 친구들",
        keywords: ["시냇물", "다리", "건너"],
        hook: "숲 친구들이 시냇물 건너편의 친구를 만나고 싶은데, 다리가 없어서 서로 손만 흔들고 있어용.",
        method: "아이가 구름 다리를 만든다: 다리 모양과 이름을 아이가 정한다.",
        twist: "아이가 말한 대로 다리가 놓였는데, 구름이 폭신해서 발이 푹푹 빠진다(웃김).",
        key: "이름을 불러 주면 구름이 단단해진다.",
        resolve: "아이가 지은 이름을 부르자 다리가 탱탱해지고, 친구들이 다리 위에서 만나 서로 안는다. 불빛이 하나 켜진다.",
        reward: { name: "구름 다리", use: "건널 수 없는 곳을 건너게 해 준다" },
      },
      {
        id: "monggeul_birthday",
        label: "몽글이",
        keywords: ["몽글", "생일", "케이크"],
        hook: "몽글이가 시무룩해용. 자기는 생일이 언제인지 몰라서 생일을 한 번도 안 해 봤대용.",
        method: "아이가 몽글이의 생일을 정해 주고(오늘로 해도 좋다), 구름 케이크를 만든다: 어떤 맛, 어떤 모양일지 아이가 정한다.",
        twist: "아이가 말한 케이크가 생겼는데, 너무 커서 몽글이가 케이크 위에 올라앉아 버린다(웃김).",
        key: "케이크에도 이름이 있어야 딱 맞는 크기가 된다.",
        resolve: "아이가 지은 이름을 부르자 케이크가 딱 맞게 작아지고, 숲 친구들이 모두 모여 몽글이의 첫 생일을 축하한다. 불빛이 하나 켜진다.",
        reward: { name: "구름 케이크", use: "한 입 먹으면 힘이 나고 마음이 따뜻해진다" },
      },
      {
        id: "big_wind",
        label: "큰 바람",
        keywords: ["바람", "휘잉"],
        finale: true,
        hook: "휘이잉! 아주 큰 휘잉이가 와서 숲을 통째로 날려 버리려 해용. 구름 집도, 길도, 나무도 흔들흔들 떠오르고 있어용.",
        method: "아이가 지금까지 만든 것들의 이름을 하나씩 부른다(가진 것 참고). 부를 때마다 그것이 꽉 붙잡고 버틴다. 마지막엔 큰 바람에게 어떻게 할지 아이가 정한다.",
        twist: "이름을 하나 부르니 그것만 멈추고 나머지는 여전히 흔들린다. 다 불러야 한다.",
        key: "휘잉이는 이름이 없어서 아무 데도 머물 수 없던 바람이었다.",
        resolve: "아이가 이름을 다 부르자 숲이 꿈쩍도 하지 않는다. 아이가 휘잉이에게 이름을 지어 주고 구름 침대를 내어 주자, 큰 바람이 살랑바람이 되어 숲에 머문다. 숲의 불빛이 모두 켜진다.",
        reward: { name: "구름숲 완성", use: "휘잉이는 숲의 자장가 바람이 되어 밤마다 살랑살랑 불어 준다" },
      },
    ],
  },
  {
    id: "waterfire",
    planet: "물불 행성",
    tag: "서로 달라도 함께",
    domain: "관계",
    play: "서로 다른 존재의 마음을 차례로 듣고 둘 다 괜찮은 방법 찾기 (무슨 일이야? → 어떤 마음이야? → 어떻게 하면 둘 다 좋을까?)",
    mood: "가운데 반달 언덕을 사이에 두고 동글동글 물방울 마을과 따끈따끈 불씨 마을이 있다. 둘 다 반달 언덕에서 놀고 싶지만, 물방울은 불 옆에서 '치익' 김이 될까 봐, 불씨는 물이 튀면 작아질까 봐 조심스럽다. 마음은 둘 다 착하다",
    questionStyle:
      "판정 없이 상황을 보고 → 한쪽 마음에 이름을 붙이고 → 다른 쪽의 이유를 듣고 → 둘 다 웃을 방법을 아이가 낸다. 예: '물방울 친구는 지금 어떤 마음일까용?', '불씨 친구는 왜 언덕에 가고 싶을까용?', '둘 다 웃을 수 있는 방법이 있을까용?'. '누가 잘못했어?'는 묻지 않는다.",
    answerRules:
      "아이가 한쪽 편을 들어도 꾸짖지 않고 '그럼 불씨는 지금 어떤 얼굴일까용?'처럼 다른 쪽 얼굴만 살짝 보여 준다. 아이가 낸 해결책은 엉뚱해도 이 별의 논리로 통하게 그린다('불씨를 냉장고에' → 불씨가 시원한 동굴에서 잠깐 쉬고 오기로 함). 그 뒤 양쪽이 '좋아!' 하는 반응을 짧게 들려준다. '몰라'면 마음 낱말 세 개 중 고르게 하거나('속상해? 서운해? 심심해?'), 몸짓 단서를 주거나('불꽃이 쪼그맣게 움츠러들었어용'), 용이 일부러 엉뚱한 안을 내서('둘 다 물구나무 서서 볼까용?') 아이가 고치게 한다. 교훈은 말하지 않고 두 마을이 가까워지는 장면으로만 보여 준다.",
    clues: ["톡톡 물방울 떨어지는 소리", "타닥타닥 작은 불씨 소리", "치이익 김 나는 소리", "졸졸 시냇물 소리"],
    characters: ["똘방이", "타닥이", "아기 불씨", "쑥덕이", "이슬", "김 구름", "개구리", "물고기", "반딧불이", "무지개 새"],
    items: ["징검돌", "다리", "선물", "우산", "담요", "찻잔", "등불", "깃발"],
    places: ["물방울 마을", "불씨 마을", "반달 언덕", "시냇물", "김구름 다리"],
    actions: ["같이 놀래", "번갈아 할래", "마음 들어 볼래", "안아 줄래", "나눠 줄래", "다리 놓을래"],
    sttCore: ["물불", "똘방이", "타닥이", "쑥덕이", "아기 불씨", "물방울", "물방울 마을", "불씨", "불씨 마을", "반달 언덕", "시냇물", "징검돌", "김 구름", "얼음꽃", "겨울밤", "노래", "선물", "같이 놀아", "번갈아 해", "미안해", "괜찮아", "속상해", "화났어", "서운해", "나눠 줘", "내가 도와줄게", "같이 보면 돼", "둘 다", "안아 줄래", "포근해"],
    sttMore: ["물불 행성", "물방울 친구", "불씨 친구", "개구리", "물고기", "반딧불이", "바람", "무지개 새", "모닥불", "불꽃", "김", "무지개", "다리", "강", "웅덩이", "비", "구름", "우산", "담요", "찻잔", "등불", "깃발", "선물", "따뜻한 차", "축제", "불꽃놀이", "그림자놀이", "초대장", "약속", "화해", "사이좋게", "친구 하자", "같이 하자", "반반", "차례대로", "고마워", "심심해", "슬퍼", "기뻐", "따뜻해", "차가워", "뜨거워", "촉촉해", "시원해", "톡톡", "타닥타닥", "치익", "졸졸", "몽글몽글", "보글보글", "토닥토닥", "다리 놓을래", "노래 부를래", "손잡을래"],
    softeners:
      "다툼은 '둘 다 하고 싶은 게 있다'로만 그리고, 싸움·고함·우는 소리·문 쾅 같은 장면은 쓰지 않는다. 한 마을이 떠나거나 사라지거나 꺼지는 결말은 쓰지 않는다('불씨 꺼 버려' → 꺼지는 대신 졸린 아기 불씨가 됨, 물방울의 눈물 → 이슬이 되어 꽃이 핌). 매 밤 둘이 함께 있는 포근한 장면으로 끝낸다. 아이가 '엄마 아빠도 싸워'처럼 현실을 말하면 캐묻지 말고 '그런 일이 있었구나용. 말해 줘서 고마워용.' 한 문장으로 받아 준 뒤 포근한 장면으로 돌아온다(그 말은 이야기에 넣지 않는다).",
    host: { name: "똘방이와 타닥이", desc: "물방울 마을의 동글동글 똘방이와 불씨 마을의 따끈따끈 타닥이. 서로 좋아하지만 너무 달라서 자꾸 엇갈린다" },
    world: {
      intro: "물불 행성 가운데엔 반달 언덕이 있고, 한쪽엔 물방울 마을, 다른 쪽엔 불씨 마을이 있어용. 두 마을은 서로 좋아하는데 너무 달라서 자꾸 엇갈려용.",
      role: "두 마을 사이에 징검돌을 놓아 주는 다리 친구",
    },
    observe: {
      focus: "두 쪽의 마음을 번갈아 떠올리는 순간, 아이가 낸 '둘 다 좋은 방법'",
      example: "처음엔 \"물방울이 먼저야\"라고 했다가 \"불씨도 별 보고 싶었던 거야\"라고 덧붙였어요. 두 쪽의 이유를 번갈아 떠올려 보는 순간이 있었어요.",
      never: "'꺼 버려'라고 한 걸 보면 공격성이 있거나 집에 갈등이 있는 것 같아요",
    },
    season: {
      title: "징검돌 다리 — 엇갈림 하나를 풀 때마다 시냇물에 돌 하나",
      chooseLine: "똘방이와 타닥이가 번갈아 말해용. '오늘은 이런 일이 있었어용.'",
    },
    villain: {
      name: "쑥덕이",
      desc: "소문 앵무새. 들은 말을 이상하게 바꿔서 전한다('똘방이가 너 싫대!'). 나쁜 마음은 아니고, 자기한테 직접 말해 주는 친구가 없어서 그렇다",
      repel: "아이가 두 친구를 직접 만나게 해서 진짜 말을 듣게 하면 오해가 풀리고, 쑥덕이는 깃털을 부르르 털며 날아간다",
      hints: ["쑥덕이가 가면서 중얼거렸어용. '나한텐 아무도 직접 말을 안 해 줘…'", "쑥덕이가 가면서 중얼거렸어용. '나도 진짜 말을 전하고 싶은데…'", "쑥덕이가 가면서 중얼거렸어용. '누가 나한테도 비밀을 말해 주면 좋겠다…'"],
    },
    nights: [
      {
        id: "half_moon_hill",
        label: "반달 언덕",
        keywords: ["언덕", "반달", "놀"],
        hook: "똘방이도 타닥이도 반달 언덕에서 같이 놀고 싶은데, 물방울은 '치익' 김이 될까 봐, 불씨는 작아질까 봐 언덕 양쪽 끝에서 서로 바라만 보고 있어용.",
        method: "아이가 두 친구의 마음을 차례로 듣고(어떤 마음일까?), 둘 다 괜찮게 같이 놀 방법을 낸다.",
        twist: "아이가 낸 방법대로 해 봤는데 둘이 너무 가까워져 '치익' 작은 김이 나고, 둘이 동시에 뒤로 폴짝 물러난다(웃김).",
        key: "딱 한 걸음 사이를 두면 둘 다 괜찮다. 그 사이를 무엇으로 채울지 아이가 정한다.",
        resolve: "아이 말대로 하자 둘이 언덕 위에서 처음으로 같이 웃고, 시냇물에 첫 징검돌이 놓인다.",
        reward: { name: "언덕 놀이 자리", use: "둘이 언제든 같이 노는 자리" },
      },
      {
        id: "two_songs",
        label: "노래",
        keywords: ["노래", "부르"],
        hook: "물방울 마을은 '찰랑찰랑' 조용한 노래를, 불씨 마을은 '타닥타닥' 신나는 노래를 부르는데, 서로 자기 노래가 좋다며 등을 돌리고 있어용.",
        method: "아이가 두 노래를 합친 새 노래를 만든다: 소리를 어떻게 섞을지, 노래 이름은 무엇인지 아이가 정한다.",
        twist: "둘이 동시에 불렀더니 소리가 뒤죽박죽 엉켜서 개구리가 귀를 막는다(웃김).",
        key: "한 번씩 번갈아 부르면 두 소리가 한 노래가 된다.",
        resolve: "아이가 정한 대로 번갈아 부르자 '찰랑 타닥 찰랑 타닥' 물불 노래가 되고, 두 마을이 함께 흥얼거린다. 징검돌이 하나 놓인다.",
        reward: { name: "물불 노래", use: "부르면 두 마을이 가까워지고 마음이 풀린다" },
      },
      {
        id: "ice_flower",
        label: "선물",
        keywords: ["선물", "얼음꽃", "꽃"],
        hook: "똘방이가 타닥이에게 얼음꽃을 선물했는데, 타닥이 앞에서 사르르 녹아 버려서 둘 다 속상해 울상이에용.",
        method: "아이가 둘 다 괜찮은 선물을 찾는다: 무엇을 선물할지, 어떻게 건널지 아이가 정한다.",
        twist: "아이가 고른 선물을 건넸는데 너무 뜨겁거나 너무 차가워서 둘이 동시에 '앗!' 하고 손을 뗀다(웃김).",
        key: "둘 사이의 반달 언덕에 놓아 두면 선물이 딱 맞는 온도가 된다.",
        resolve: "아이 말대로 언덕에 놓자 선물이 반짝이고, 타닥이가 똘방이에게도 답례 선물을 준다. 징검돌이 하나 놓인다.",
        reward: { name: "녹지 않는 선물", use: "마음을 전할 때 쓰면 상대가 꼭 알아본다" },
      },
      {
        id: "lost_ember",
        label: "아기 불씨",
        keywords: ["아기 불씨", "불씨", "길 잃"],
        hook: "아기 불씨가 물방울 마을에서 길을 잃었어용. 물방울들은 불이 무서워 집 문을 꼭 닫고, 아기 불씨는 점점 작아지며 울고 있어용.",
        method: "아이가 아기 불씨를 집에 데려다 준다: 어떻게 안전하게 데려갈지(무엇에 태울지, 누구에게 부탁할지) 아이가 정한다.",
        twist: "아이 말대로 데려가는데 물방울들이 창문 틈으로 빼꼼 보다가, 아기 불씨가 하품을 하자 '귀여워!' 하고 문을 연다(웃김).",
        key: "아기 불씨는 무서운 불이 아니라 추운 밤 손을 녹여 주는 작은 불이었다.",
        resolve: "물방울들이 아기 불씨를 타닥이에게 데려다 주고, 두 마을이 처음으로 서로 집에 놀러 가기로 한다. 징검돌이 하나 놓인다.",
        reward: { name: "아기 불씨 친구", use: "추울 때 손을 녹여 주고, 어두운 곳을 밝혀 준다" },
      },
      {
        id: "steam_cloud",
        label: "김 구름",
        keywords: ["김", "구름", "안개"],
        hook: "똘방이와 타닥이가 실수로 부딪혔는데 '치익' 하고 김이 올라가 하늘에 작은 구름이 됐어용. 둘은 깜짝 놀라 서로 미안하다고만 하고 있어용.",
        method: "아이가 둘이 같이 만들 수 있는 것을 정한다: 김 구름으로 무엇을 만들지(이불, 다리, 솜사탕…) 아이가 정한다.",
        twist: "둘이 다시 살짝 부딪혀 김을 만들었는데 구름이 너무 작아서 개구리 한 마리만 덮인다(웃김).",
        key: "둘이 서로 다르기 때문에 둘만 만들 수 있는 것이 있다.",
        resolve: "둘이 신나서 김을 더 만들어 아이가 정한 것이 하늘에 둥실 떠오르고, 두 마을이 함께 올려다본다. 징검돌이 하나 놓인다.",
        reward: { name: "김 구름 이불", use: "덮으면 바람도 추위도 막아 주는 포근한 이불" },
      },
      {
        id: "winter_night",
        label: "겨울밤",
        keywords: ["겨울", "추워", "눈"],
        finale: true,
        hook: "아주 추운 겨울밤이 왔어용. 물방울 마을은 꽁꽁 얼어 가고, 불씨 마을은 찬바람에 하나씩 꺼져 가요. 두 마을이 서로를 도와야 하는데 시냇물이 가로막고 있어용.",
        method: "아이가 지금까지 얻은 것(가진 것 참고)을 골라 쓰고, 두 마을이 서로를 어떻게 도울지 정한다.",
        twist: "한 마을만 먼저 도우면 다른 마을이 더 추워진다. 둘을 동시에 도울 방법이 필요하다.",
        key: "불씨는 얼음을 녹이고, 물방울은 김 구름으로 불씨를 바람에서 덮어 준다. 서로 다르기 때문에 서로를 살릴 수 있다.",
        resolve: "아이 말대로 하자 징검돌이 모두 이어져 다리가 되고, 두 마을이 다리 위에서 첫 축제를 연다. 쑥덕이도 진짜 말만 전하는 앵무새가 되어 축제 소식을 전한다.",
        reward: { name: "징검돌 다리 완성", use: "두 마을이 언제든 오가는 다리" },
      },
    ],
  },
  {
    id: "upside",
    planet: "거꾸로 행성",
    tag: "모든 것이 반대로 움직이는 세계",
    domain: "언어",
    play: "반대로 말하기 · 거꾸로 주문 짓기 · 엉뚱한 문장 만들기 (7세 이상은 글자 뒤집기)",
    mood: "뒤죽박죽 마법사가 말을 뒤집어 놓아, 친구들이 말한 것은 반대로 이뤄지는 엉뚱하고 웃긴 별. 비가 위로 올라가고, 침대는 천장에 붙어 있다. 단, 아이가 지은 주문은 무엇이든 그대로 통한다. 아이가 만든 주문이 매 밤 거꾸로 주문책에 한 장씩 쌓인다",
    questionStyle:
      "아이가 거꾸로 주문을 짓게 묻는다('비를 내리게 하는 주문을 뭐라고 할까용?', '이 주문 이름은 뭐라고 할까용?'). 어떤 말이든 주문이 된다. 어린 아이에겐 주문 예시 두 개를 붙여 따라 말해도 되게 한다(예: '쑥쑥 뿅', '뒤죽 박죽'). 맞는 반대말을 고르게 하는 질문은 하지 않는다.",
    answerRules:
      "아이가 지은 주문은 무엇이든 그대로 이루어진다('초록!'도 주문이 된다). 반대로 되는 건 뒤뚱이와 다른 친구들의 말뿐이고, 그래서 웃긴 일이 생긴다(뒤뚱이 '커져라' → 문이 더 작아져 개미 손님이 옴). 아이에게 정답·오답을 말하지 않고, 아이를 두 번 연속 막히게 하지 않는다. '몰라'면 용이 일부러 엉뚱한 주문을 보여 주고('바나나 뿅은 어때용?') 아이가 고치거나 고르게 한다. 아이의 진짜 '싫어'·'그만'에는 거꾸로 규칙을 쓰지 않는다. 부수기·무서운 말은 거꾸로 규칙으로 풀어 준다(친구가 '다 부서져라' → 모두 더 튼튼하게 꼭 붙음, '커다란 늑대' → 손톱만 한 솜털 늑대). 남을 놀리는 말은 웃긴 소리(뿡, 뾰로롱)로 바꿔 받는다. 마지막 인사는 거꾸로 하지 않고 바르게 '잘 자용'.",
    clues: ["뿅뿅 거꾸로 튀어 오르는 소리", "또르르 위로 올라가는 빗방울 소리", "뒤뚱뒤뚱 거꾸로 걷는 발소리", "키득키득 거꾸로 웃음소리"],
    characters: ["뒤뚱이", "뒤죽박죽 마법사", "뒤죽이", "거꾸로 고양이", "박쥐", "나무늘보", "물구나무 곰", "개미", "오뚝이", "달님"],
    items: ["거꾸로 주문책", "거꾸로 우산", "모자", "신발", "문", "사다리", "시계", "베개"],
    places: ["거꾸로 집", "천장 침대", "하늘 웅덩이", "거꾸로 길", "거꾸로 놀이터"],
    actions: ["반대로 말할래", "거꾸로 할래", "주문 외울래", "물구나무 설래", "웃긴 말 할래", "뒤로 걸을래"],
    sttCore: ["거꾸로", "반대로", "주문", "주문책", "마법사", "뒤죽이", "뿅", "뾰로롱", "메아리", "그림판", "뒤뚱이", "거꾸로 고양이", "박쥐", "나무늘보", "물구나무", "커져라", "작아져라", "올라가", "내려가", "올라가라", "내려가라", "열려라", "닫혀라", "위", "아래", "또 해 줘", "수리수리 마수리"],
    sttMore: ["거꾸로 행성", "거꾸로 주문책", "물구나무 곰", "개미", "오뚝이", "펭귄", "거꾸로 새", "달님", "거꾸로 우산", "모자", "신발", "사다리", "시계", "베개", "거꾸로 집", "천장", "하늘 웅덩이", "거꾸로 길", "거꾸로 놀이터", "하늘", "땅", "앞", "뒤", "왼쪽", "오른쪽", "크다", "작다", "길다", "짧다", "높다", "낮다", "많다", "적다", "무겁다", "가볍다", "빠르게", "느리게", "덥다", "춥다", "뜨겁다", "차갑다", "밝다", "어둡다", "낮", "밤", "웃어", "울어", "들어가", "나가", "일어나", "잘 깨", "잘 가", "안녕", "시끄러워", "조용해", "좋아", "싫어", "얍", "뿅", "뾰로롱", "아브라카다브라", "뒤뚱뒤뚱", "빙글빙글", "대롱대롱", "키득키득", "하암", "방귀", "뿡뿡", "반대로 말할래", "주문 외울래", "웃긴 말 할래"],
    host: { name: "뒤뚱이", desc: "물구나무로 걸어 다니는 장난꾸러기 거꾸로 펭귄. 말이 반대로 이루어지는 이 별에서 자꾸 곤란해진다" },
    world: {
      intro: "거꾸로 행성은 뒤죽박죽 마법사가 말을 몽땅 뒤집어 놓은 별이에용. 친구들이 말하면 반대로 되는데, 네가 지은 주문만은 그대로 이루어져용.",
      role: "거꾸로 주문을 만드는 주문 마법사",
    },
    observe: {
      focus: "반대 규칙을 알아채고 말을 바꿔 써 보는 순간, 엉뚱한 문장을 즐기는 모습",
      example: "\"커져라\"라고 했다가 문이 작아지자 \"그럼 작아져라!\"로 바로 바꿔 말했어요. 이야기 속 규칙을 알아채고 자기 말을 고쳐 써 봤어요.",
      never: "반대말을 자주 틀려요 / 어휘 발달이 느린 것 같아요",
    },
    season: {
      title: "거꾸로 주문책 — 아이가 지은 주문 한 장씩",
      chooseLine: "뒤뚱이가 물구나무를 선 채로 말해용. '오늘은 이런 게 거꾸로 됐어용.'",
    },
    villain: {
      name: "뒤죽이",
      desc: "뒤죽박죽 마법사의 꼬마 박쥐. 아이가 고쳐 놓은 것을 다시 뒤집어 놓고 키득키득 날아간다",
      repel: "아이가 지난 밤에 지은 주문(주문책) 중 하나를 다시 외치면 뒤집힌 것이 바로 돌아오고, 뒤죽이는 어리둥절해서 날아간다",
      hints: ["뒤죽이가 날아가며 소리쳤어용. '마법사님은 요즘 하나도 안 웃으셔!'", "뒤죽이가 날아가며 소리쳤어용. '마법사님은 누가 웃어 주는 걸 제일 좋아하셔!'", "뒤죽이가 날아가며 소리쳤어용. '마법사님도 사실은 같이 놀고 싶으신 거야!'"],
    },
    nights: [
      {
        id: "rain_up",
        label: "위로 가는 비",
        keywords: ["비", "이불", "젖"],
        hook: "비가 땅이 아니라 하늘로 올라가고 있어용. 그래서 천장에 있는 뒤뚱이 침대 이불이 축축하게 젖었어용.",
        method: "아이가 비를 내리게 하는 주문을 짓는다(어떤 말이든 주문이 된다). 뒤뚱이는 자꾸 바르게 말해서 더 꼬이게 한다.",
        twist: "뒤뚱이가 먼저 '비야 내려와!' 하고 바르게 외치자, 비가 더 신나서 위로 솟아 달님 코를 간질인다(웃김). 이 별에선 친구들 말은 반대로 되지만, 아이의 주문은 그대로 통한다.",
        key: "이 별에서 아이가 지은 주문만은 그대로 이루어진다.",
        resolve: "아이가 지은 주문을 외치자 비가 톡톡 내려와 이불을 비껴가고, 빗소리가 자장가처럼 작아진다. 주문책에 첫 장이 생긴다.",
        reward: { name: "비 주문", use: "외치면 무엇이든 내려오거나 가라앉는다" },
      },
      {
        id: "ceiling_bed",
        label: "천장 침대",
        keywords: ["침대", "천장"],
        hook: "뒤뚱이 침대가 천장에 딱 붙어서 안 내려와용. 뒤뚱이가 폴짝폴짝 뛰어도 닿지 않아 잘 수가 없대용.",
        method: "아이가 침대를 내리는 주문을 짓는다.",
        twist: "뒤뚱이가 '침대야 내려와!' 하고 바르게 말하자 침대가 천장을 데굴데굴 굴러다닌다(웃김).",
        key: "아이의 주문만 그대로 통한다.",
        resolve: "아이의 주문에 침대가 사르르 내려와 뒤뚱이가 폴싹 눕는다. 주문책에 한 장이 더 생긴다.",
        reward: { name: "침대 주문", use: "외치면 무엇이든 제자리로 돌아온다" },
      },
      {
        id: "ant_door",
        label: "개미 문",
        keywords: ["문", "생일", "개미"],
        hook: "오늘은 뒤뚱이 생일인데 집 문이 개미만큼 작아져서 손님들이 못 들어와용. 나무늘보가 문 앞에서 천천히 고개를 갸웃하고 있어용.",
        method: "아이가 문을 딱 맞게 만드는 주문을 짓는다. 첫 손님이 누구인지도 아이가 정한다.",
        twist: "뒤뚱이가 '문아 커져라!' 하자 문이 더 작아져 개미 손님들이 줄줄이 들어온다(웃김).",
        key: "아이의 주문만 그대로 통한다.",
        resolve: "아이의 주문에 문이 딱 맞게 커지고 손님들이 들어와 거꾸로 생일 노래를 부른다(노래 가사 한 줄을 아이가 정해도 좋다). 주문책에 한 장이 더 생긴다.",
        reward: { name: "문 주문", use: "외치면 무엇이든 딱 맞는 크기가 된다" },
      },
      {
        id: "upside_picture",
        label: "거꾸로 그림판",
        keywords: ["그림", "그림판"],
        hook: "말하면 그림이 그려지는 그림판이 있는데, 뒤뚱이가 말한 건 전부 거꾸로 그려져서 하늘이 아래에, 땅이 위에 있어용.",
        method: "아이가 그림판에 그릴 것을 말한다(아이가 말한 건 바로 그려진다). 7세 이상이면 낱말을 거꾸로 말해 보는 놀이를 한 번 넣어도 좋다.",
        twist: "뒤뚱이가 옆에서 '예쁘게!' 하자 그림이 꼬불꼬불해진다(웃김).",
        key: "아이가 말한 것은 그대로 그려지고, 아이가 지은 이름을 부르면 그림이 움직인다.",
        resolve: "아이가 말한 그림이 바로 서서 움직이고, 그림이 주문책 표지가 된다. 주문책에 한 장이 더 생긴다.",
        reward: { name: "그림 주문", use: "외치면 말한 것이 그림으로 나타나 도와준다" },
      },
      {
        id: "echo_name",
        label: "메아리",
        keywords: ["메아리", "이름"],
        hook: "거꾸로 길의 메아리가 친구들이 부르는 아이 이름을 엉뚱하게 바꿔서 돌려줘용. 친구들이 아이를 부르고 싶은데 자꾸 다른 이름이 돼요.",
        method: "아이가 이 별에서만 쓰는 자기만의 거꾸로 이름(별명)을 짓는다. 어린 아이는 '안녕'을 거꾸로 하거나 좋아하는 소리로 지어도 좋다.",
        twist: "뒤뚱이가 아이 이름을 바르게 부르자 메아리가 '뿡!' 하고 돌려준다(웃김).",
        key: "아이가 지은 이름만은 메아리도 바꾸지 못한다.",
        resolve: "친구들이 아이가 지은 거꾸로 이름을 부르자 메아리가 또렷하게 돌려주고, 거꾸로 친구 이름표에 그 이름이 적힌다. 주문책에 한 장이 더 생긴다.",
        reward: { name: "거꾸로 이름", use: "부르면 친구들이 어디서든 달려온다" },
      },
      {
        id: "wizard",
        label: "뒤죽박죽 마법사",
        keywords: ["마법사", "뒤죽박죽"],
        finale: true,
        hook: "뒤죽박죽 마법사가 커다란 모자를 쓰고 나타나 별 전체를 한 번에 뒤집으려 해용. 길도, 집도, 친구들도 둥실둥실 떠오르기 시작했어용.",
        method: "아이가 지금까지 지은 주문(가진 것 참고)을 골라 외치고, 마지막엔 새 주문 하나를 짓는다.",
        twist: "주문 하나로 길은 돌아오지만 마법사는 끄떡없다. 마법사는 주문보다 다른 것에 약하다.",
        key: "마법사는 누가 웃어 주는 걸 제일 좋아한다. 아이의 엉뚱한 주문에 마법사가 웃음을 터뜨리면 마법이 풀린다.",
        resolve: "아이의 마지막 주문에 마법사가 '푸하하' 웃어 모자가 툭 떨어지고 별이 제자리로 돌아온다. 마법사는 거꾸로 파티 담당이 되고, 모두 박쥐처럼 거꾸로 매달려 잠든다. 주문책이 완성된다.",
        reward: { name: "거꾸로 주문책 완성", use: "마법사가 밤마다 거꾸로 파티를 열어 준다" },
      },
    ],
  },
  {
    id: "rainbow",
    planet: "숨은 무지개 행성",
    tag: "사라진 색깔 찾기",
    domain: "감각",
    play: "숨은 색 친구 찾기 · 색 섞기 · 새 색 이름 짓기 · 사물에 새로운 색 입히기",
    mood: "검은 마왕이 일곱 색을 몽땅 빼앗아 망토 속에 숨겨서 온 세상이 회색이 된 별. 모든 색을 섞으면 까매지니 마왕 혼자 새까맣다. 색 하나를 되찾을 때마다 그 색이 세상에 돌아오고 알록이 깃털 하나에 색이 돌아온다",
    questionStyle:
      "오늘 색의 고충을 푸는 방법을 아이가 정하게 묻는다: 사자에게 무슨 말을 해 줄지, 귤나무 곁에서 무엇을 할지, 해바라기를 어떻게 웃길지, 숲을 어떤 소리로 깨울지, 고래에게 어떻게 말할지, 별을 뭐라고 속삭여 부를지. 가진 것이 있으면 무엇을 쓸지 묻는다('귤을 먹을까용, 해바라기씨를 뿌릴까용?'). '빨강이랑 노랑을 섞으면 무슨 색일까용?' 같은 퀴즈는 하지 않는다.",
    answerRules:
      "아이가 낸 방법은 엉뚱해도 이 별의 논리로 통하게 그린다. 마왕·졸개와의 싸움은 빛·소리·용기·웃음·덩굴로 묶기로만 하고, 아이가 '칼로 찔러!' 해도 빛의 칼에서 무지개빛이 뿜어져 마왕이 휘청하는 식으로 바꾼다. 다치거나 죽는 장면은 없다. 색에 남자색·여자색 같은 말을 쓰지 않고 색 친구에게 성별 호칭을 붙이지 않는다. 피부색은 '살색' 대신 '살구색'. 검정은 나쁜 색이 아니라 모든 색이 모인 색이고, 마왕도 결국 밤하늘을 채워 주는 친구가 된다. '몰라'면 가진 것 중 두 개를 보기로 들려주거나, 사자·알록이가 먼저 한 번 해 보이고 아이가 따라 하게 한다.",
    clues: ["사르륵 색이 번지는 소리", "'나 여기 있지롱' 작은 목소리", "콩콩 숨바꼭질 발소리", "퐁퐁 물감 방울 소리"],
    characters: ["알록이", "빨강 사자", "주황 귤나무", "노랑 해바라기", "초록 숲", "아기 고래", "남색 별", "검은 마왕", "까막 졸개", "무지개 새"],
    items: ["붓", "물감", "크레파스", "무지개 칸", "꽃", "사과", "바나나", "구름"],
    places: ["사과밭", "해바라기 언덕", "바닷가", "풀숲", "색깔 연못"],
    actions: ["찾을래", "섞어 볼래", "칠할래", "이름 지어 줄래", "숨바꼭질할래", "무지개 만들래"],
    sttCore: ["숨은 무지개", "무지개", "색깔", "빨강", "주황", "노랑", "초록", "파랑", "남색", "보라", "사자", "귤", "귤나무", "해바라기", "해바라기씨", "덩굴", "고래", "별", "마왕", "검은 마왕", "까막 졸개", "졸개", "알록이", "고래 피리", "별빛 조약돌", "으르렁", "어흥", "힘내", "울어도 돼", "쉿", "섞어 볼래", "이 색으로 칠해", "찾았다", "여기 있다", "다 섞어", "또 찾자", "물감", "무지개다", "숨바꼭질"],
    sttMore: ["숨은 무지개 행성", "주황이", "남색이", "분홍이", "하양이", "까망이", "무지개 새", "빨간색", "주황색", "노란색", "초록색", "파란색", "남색", "보라색", "분홍색", "하늘색", "연두색", "하얀색", "검은색", "회색", "갈색", "금색", "은색", "살구색", "밤하늘색", "반짝이색", "딸기우유색", "아이스크림색", "알록달록", "무지개색", "일곱 색깔", "무지개 칸", "무지개 다리", "붓", "크레파스", "색연필", "물감 방울", "꽃", "사과", "바나나", "레몬", "딸기", "포도", "귤", "구름", "하늘", "바다", "풀잎", "사과밭", "해바라기 언덕", "바닷가", "풀숲", "색깔 연못", "분홍 숲", "보라 구름", "내가 좋아하는 색은", "칠할래", "찾을래", "까꿍", "살금살금", "반짝반짝", "쪼르르", "콩콩", "몽글몽글"],
    host: { name: "알록이", desc: "색이 숨어 버려 하얗게 된 무지개 새. 색 친구를 하나 찾을 때마다 깃털 한 가닥이 그 색으로 돌아온다" },
    world: {
      intro: "숨은 무지개 행성은 검은 마왕이 일곱 색깔을 몽땅 빼앗아 가서 온 세상이 회색이 된 별이에용. 색을 다 모아 버린 마왕만 혼자 새까매용.",
      role: "일곱 색깔을 되찾는 무지개 용사",
    },
    observe: {
      focus: "아이가 고른 색·섞은 색·새로 지은 색 이름, 사물에 색과 마음을 붙이는 방식",
      example: "\"빨강이랑 하양이 섞으면 딸기우유색\"이라고 했어요. 좋아하는 음식과 색을 이어 새 이름을 지었어요.",
      never: "색 섞기를 틀리게 말해요 / 분홍을 좋아하니 여성스러운 성향이에요",
    },
    season: {
      title: "사라진 일곱 색깔 — 색 하나를 되찾을 때마다 알록이 깃털 하나",
      chooseLine: "알록이가 하얀 날개를 펄럭이며 말해용. '아직 못 찾은 색이 있어용.'",
    },
    villain: {
      name: "까막 졸개",
      desc: "검은 마왕의 부하. 회색 그림자처럼 생겼고 빛을 싫어한다. 되찾은 색을 다시 회색으로 덮으려 한다",
      repel: "다치지 않게: 해바라기 빛에 눈부셔 도망가거나, 덩굴에 묶여 데굴데굴 굴러가거나, 사자 으르렁에 깜짝 놀라 숨는다. 가진 것이 없으면 이야기 용의 콧김이나 아이의 큰 소리로 쫓는다",
      hints: ["까막 졸개가 도망가며 소리쳤어용. '마왕님이 색을 다 모으고 계시다!'", "까막 졸개가 도망가며 소리쳤어용. '마왕님 성엔 색이 하나도 없어서 깜깜해!'", "까막 졸개가 도망가며 작게 말했어용. '마왕님은… 사실 외로우신 거야.'"],
    },
    nights: [
      {
        id: "red_lion",
        label: "빨강 사자",
        keywords: ["빨강", "빨간", "사자"],
        hook: "회색이 된 불꽃 사자가 바위 뒤에 숨어 있어용. 색을 뺏긴 뒤로 겁쟁이가 돼서 으르렁 소리도 못 내고 꼬리만 떨고 있어용.",
        method: "아이가 사자에게 용기를 북돋아 준다: 무슨 말을 해 줄지, 어떻게 함께할지 아이가 정한다.",
        twist: "아이가 말을 건네자 사자가 살짝 고개를 내밀었다가, 자기 그림자에 놀라 다시 숨는다(웃김). 사자는 아이가 곁에 있어 주면 한 걸음 내디딜 수 있다.",
        key: "용기는 혼자 내는 게 아니라 곁에 누가 있을 때 생긴다.",
        resolve: "아이 덕분에 사자가 한 걸음 내디디며 '어흥' 작게 외치자 갈기가 붉게 타오르고, 알록이 깃털 하나가 빨강이 된다. 사자는 이제부터 아이와 함께 다닌다.",
        reward: { name: "빨강 사자", use: "동료. 으르렁 한 번에 졸개가 놀라 숨고, 아이가 무서울 때 곁을 지킨다" },
      },
      {
        id: "orange_tree",
        label: "주황 귤나무",
        keywords: ["주황", "귤", "귤나무"],
        hook: "회색이 된 귤나무가 시무룩해용. 열매가 하나도 안 열려서 귤나무 동네가 어둡고 배고프대용.",
        method: "아이가 귤나무 곁에서 같이 기다려 주고 물을 준다. 기다리는 동안 귤나무 동네를 자유롭게 모험해도 좋다(아이가 가고 싶은 곳).",
        twist: "물을 주자 나무가 꿈틀하고 꽃봉오리가 하나 생기는데, 아직 열매는 안 열린다. 기다려야 한다.",
        key: "귤나무는 누가 곁에서 기다려 줄 때 열매를 맺는다.",
        resolve: "아이가 돌아와 다시 곁에 앉자 '퐁' 하고 첫 귤이 열리며 나무가 주황빛으로 물든다. 알록이 깃털 하나가 주황이 된다.",
        reward: { name: "귤", use: "지쳤을 때 먹으면 힘이 번쩍 난다" },
      },
      {
        id: "yellow_sunflower",
        label: "노랑 해바라기",
        keywords: ["노랑", "노란", "해바라기"],
        hook: "회색 해바라기 들판이 모두 고개를 푹 숙이고 있어용. 해가 사라져서 바라볼 게 없대용.",
        method: "아이가 해 대신 해바라기들을 웃게 한다: 웃긴 말, 노래, 표정 소리 등 아이가 정한다.",
        twist: "아이가 웃기자 해바라기 하나만 '킥' 하고 고개를 들고, 나머지는 아직 숙이고 있다. 한 번 더 해야 한다.",
        key: "해바라기는 한 송이가 웃으면 옆으로 옆으로 웃음이 옮아간다.",
        resolve: "아이가 한 번 더 하자 들판 전체가 '하하' 고개를 들고 노랗게 물든다. 알록이 깃털 하나가 노랑이 된다.",
        reward: { name: "해바라기씨", use: "뿌리면 해바라기가 쑥 자라 환하게 빛나고, 졸개들이 눈부셔서 도망간다" },
      },
      {
        id: "green_forest",
        label: "초록 숲",
        keywords: ["초록", "숲", "덩굴"],
        hook: "회색 숲이 깊이 잠들어 있어용. 덩굴이 길을 꽉 막아 아무도 지나가지 못하고, 숲은 코를 쿨쿨 골고 있어용.",
        method: "아이가 소리로 숲을 깨운다: 사각사각, 짹짹, 똑똑 같은 소리 중 아이가 정하거나 새로 만든다.",
        twist: "아이가 소리를 내자 숲이 '음냐' 하고 돌아눕기만 한다(웃김). 한 번 더, 다른 소리를 보태면 된다.",
        key: "숲은 아이의 소리를 따라 부르는 새소리에 깬다.",
        resolve: "새들이 아이 소리를 따라 부르자 숲이 '하암' 하고 깨어 초록으로 물들고, 덩굴이 스르르 풀려 길을 내준다. 알록이 깃털 하나가 초록이 된다.",
        reward: { name: "덩굴", use: "건널 땐 다리가 되고, 휘두르면 졸개를 꽁꽁 묶는 무기가 된다" },
      },
      {
        id: "blue_sea",
        label: "파랑 바다",
        keywords: ["파랑", "파란", "바다", "고래"],
        hook: "회색 바다가 꽁꽁 얼어 있어용. 얼음 아래 아기 고래가 슬픈데 꾹 참고 있어서, 참은 눈물이 바다를 얼려 버렸대용.",
        method: "아이가 아기 고래의 마음을 들어 주고, 울어도 된다고 말해 준다(어떻게 말할지 아이가 정한다).",
        twist: "아이가 말을 건네자 고래가 '안 슬퍼' 하고 더 꾹 참아 얼음이 삐걱 소리를 낸다. 한 번 더 곁에 있어 줘야 한다.",
        key: "참은 눈물이 아니라 흘린 눈물이 얼음을 녹인다.",
        resolve: "아이 덕분에 고래가 '엉엉' 울자 따뜻한 눈물에 얼음이 녹고 바다가 파랗게 출렁인다. 알록이 깃털 하나가 파랑이 된다.",
        reward: { name: "고래 피리", use: "불면 아기 고래가 와서 어디든 태워 준다" },
      },
      {
        id: "indigo_sky",
        label: "남색 밤하늘",
        keywords: ["남색", "밤하늘", "하늘", "별"],
        hook: "밤하늘이 회색이라 별이 하나도 없어용. 별들은 시끄러운 그림자 소리가 무서워 구름 뒤에 꼭꼭 숨었대용.",
        method: "아이가 아주 작게 속삭여 별을 부른다: 무슨 말로 부를지 아이가 정한다.",
        twist: "아이가 부르자 별 하나만 빼꼼 나오고, 바람 소리에 다시 숨는다. 더 조용히 해야 한다.",
        key: "별은 아주 조용한 곳에서, 속삭이는 목소리에만 나온다.",
        resolve: "모두 숨을 죽이고 아이가 속삭이자 별들이 하나둘 켜지며 하늘이 남색으로 물든다. 알록이 깃털 하나가 남색이 된다.",
        reward: { name: "별빛 조약돌", use: "어두운 곳을 비춰 길을 보여 준다" },
      },
      {
        id: "purple_king",
        label: "보라, 검은 마왕",
        keywords: ["보라", "마왕", "검은"],
        finale: true,
        hook: "검은 마왕의 성이에용. 마왕이 마지막 색 보라를 망토 속에 꼭 쥐고 있어서, 성 안이 깜깜해용. 마왕 혼자만 새까매요.",
        method: "아이가 지금까지 얻은 것(가진 것 참고) 중 무엇을 쓸지 고르고, 마지막엔 아이만의 주문 한 마디를 외친다.",
        twist: "가진 것 하나를 쓰자 마왕이 휘청하지만 망토를 더 꽉 쥔다. 다른 것을 더 쓰고, 마지막엔 아이의 말이 필요하다.",
        key: "마왕은 모두가 색이 있는데 자기만 없어서 외로웠고, 색을 다 모았더니 더 까매져 더 외로워졌다.",
        resolve: "아이의 마지막 주문에 망토가 펄럭 열리고 일곱 색이 쏟아져 무지개가 완성된다. 작아진 마왕에게 아이가 한 마디 건네자, 마왕은 밤마다 하늘을 까맣게 채워 별을 빛나게 해 주기로 한다. 모두 무지개 아래에서 잠든다.",
        reward: { name: "무지개 완성", use: "검은 마왕이 밤마다 하늘을 채워 주어 별이 빛나고 모두 잘 잔다" },
      },
    ],
  },
];

function hash(key: string, salt: number): number {
  let h = salt;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function isThemeId(v: unknown): v is PlanetId {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}

/** 회차의 행성. themeId(아이가 지도에서 고른 별)가 오면 그것을, 없으면 episodeId로 고정(같은 회차는 늘 같은 별). */
export function themeFor(episodeKey: string | undefined, themeId?: string | null): StoryTheme {
  const chosen = themeId ? THEMES.find((t) => t.id === themeId) : undefined;
  if (chosen) return chosen;
  return THEMES[hash(episodeKey ?? "", 3) % THEMES.length];
}

/** 대화 기록에 행성 이름이 나오면 그 행성 (회차 종료 시 themeId를 못 받았을 때 대비) */
export function themeFromText(text: string): StoryTheme | null {
  return THEMES.find((t) => text.includes(t.planet) || text.includes(t.planet.replace(" 행성", ""))) ?? null;
}

export function pickFromTheme<T>(list: T[], episodeKey: string | undefined, salt: number): T {
  return list[hash(episodeKey ?? "", salt) % list.length];
}

// ───────────────────────── 시즌 진행 ─────────────────────────

/** worlds.memory_json.planets[행성] — 다녀간 횟수, 끝낸 밤(id), 아이가 이 별에 만든 것 */
export interface PlanetProgress {
  visits: number;
  /** 끝낸 밤의 id (끝낸 순서대로) */
  done: string[];
  /** 아이가 이 별에 만든 것: 지은 이름·주문·방법 (아이 말 그대로의 짧은 낱말) */
  collected: string[];
  /** 끝낸 밤 수 (= done.length. 옛 저장분·부모 화면 호환용) */
  stage: number;
}

export type PlanetMemory = Partial<Record<PlanetId, PlanetProgress>>;

export function emptyProgress(): PlanetProgress {
  return { visits: 0, done: [], collected: [], stage: 0 };
}

/** 숨은 무지개: 밤 id ↔ 색 이름 (옛 저장분 변환·동화책용) */
const RAINBOW_NIGHT_COLOR: Record<string, string> = {
  red_lion: "빨강",
  orange_tree: "주황",
  yellow_sunflower: "노랑",
  green_forest: "초록",
  blue_sea: "파랑",
  indigo_sky: "남색",
  purple_king: "보라",
};

function normalizeProgress(theme: StoryTheme, r: Record<string, unknown>): PlanetProgress {
  const visits = Number.isFinite(Number(r.visits)) ? Math.max(0, Math.floor(Number(r.visits))) : 0;
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const ids = new Set(theme.nights.map((n) => n.id));
  let done = strs(r.done).filter((id) => ids.has(id));
  let collected = strs(r.collected);
  if (!Array.isArray(r.done)) {
    // 옛 저장분: rainbow는 collected에 색 이름, 나머지는 stage(끝낸 단계 수)
    const oldStage = Number.isFinite(Number(r.stage)) ? Math.max(0, Math.floor(Number(r.stage))) : 0;
    if (theme.id === "rainbow") {
      const colorToId = Object.fromEntries(Object.entries(RAINBOW_NIGHT_COLOR).map(([id, c]) => [c, id]));
      done = collected.map((c) => colorToId[c]).filter((id): id is string => Boolean(id) && id !== "purple_king");
      if (oldStage > 0 && done.length >= 6) done.push("purple_king");
    } else {
      done = theme.nights.filter((n) => !n.finale).slice(0, oldStage).map((n) => n.id);
    }
  }
  collected = collected.filter((c) => !RAINBOW_COLORS.includes(c)).slice(-20);
  done = [...new Set(done)];
  return { visits, done, collected, stage: done.length };
}

/** memory_json에서 행성 진행 상태 읽기 (없거나 깨졌으면 빈 값. 옛 형식도 읽는다) */
export function readPlanets(raw: unknown): PlanetMemory {
  const out: PlanetMemory = {};
  const planets = raw && typeof raw === "object" ? (raw as Record<string, unknown>).planets : null;
  if (!planets || typeof planets !== "object") return out;
  for (const t of THEMES) {
    const p = (planets as Record<string, unknown>)[t.id];
    if (!p || typeof p !== "object") continue;
    out[t.id] = normalizeProgress(t, p as Record<string, unknown>);
  }
  return out;
}

/** memory_json.activePlanet (지도에서 고른 별을 회차 동안 기억. 회차 종료 때 시즌 진행 계산에 씀) */
export function readActivePlanet(raw: unknown): PlanetId | null {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>).activePlanet : null;
  return isThemeId(v) ? v : null;
}

export function nightById(theme: StoryTheme, id: string | null | undefined): PlanetNight | null {
  return theme.nights.find((n) => n.id === id) ?? null;
}

/** 끝낸 밤(마지막 밤 제외) 수 */
function doneCount(theme: StoryTheme, progress: PlanetProgress | null | undefined): number {
  const done = new Set(progress?.done ?? []);
  return theme.nights.filter((n) => !n.finale && done.has(n.id)).length;
}

/**
 * 아직 안 한 밤. 마지막 밤은 다른 밤을 다 끝낸 뒤에만 들어온다.
 * 빈 배열이면 시즌을 다 끝낸 것(자유 모험).
 */
export function remainingNights(theme: StoryTheme, progress: PlanetProgress | null | undefined): PlanetNight[] {
  const done = new Set(progress?.done ?? []);
  const normal = theme.nights.filter((n) => !n.finale && !done.has(n.id));
  if (normal.length) return normal;
  return theme.nights.filter((n) => n.finale && !done.has(n.id));
}

/** 숨은 무지개: 아직 못 찾은 색 (동화책·보고서용) */
export function remainingColors(progress: PlanetProgress | null | undefined): string[] {
  const done = new Set(progress?.done ?? []);
  return RAINBOW_COLORS.filter((c) => {
    const id = Object.keys(RAINBOW_NIGHT_COLOR).find((k) => RAINBOW_NIGHT_COLOR[k] === c);
    return id ? !done.has(id) : true;
  });
}

/** 지금까지 얻은 것(끝낸 밤의 보상). 마지막 밤은 보상이 아니라 결말 */
export function itemsFor(theme: StoryTheme, progress: PlanetProgress | null | undefined): { name: string; use: string }[] {
  const done = progress?.done ?? [];
  return done
    .map((id) => nightById(theme, id))
    .filter((n): n is PlanetNight => Boolean(n) && !n!.finale)
    .map((n) => n.reward);
}

/** 오늘 밤 방해꾼이 나오는가: 두 밤을 끝낼 때마다(2·4·6번째 밤), 마지막 밤은 제외 */
export function villainDue(theme: StoryTheme, progress: PlanetProgress | null | undefined, night: PlanetNight | null): boolean {
  if (!night || night.finale) return false;
  return doneCount(theme, progress) % 2 === 1;
}

/** 방해꾼이 이번에 흘릴 단서 */
export function villainHint(theme: StoryTheme, progress: PlanetProgress | null | undefined): string {
  const i = Math.min(Math.floor(doneCount(theme, progress) / 2), theme.villain.hints.length - 1);
  return theme.villain.hints[Math.max(0, i)];
}

/**
 * 밤 시작에 아이에게 들려줄 보기(남은 밤 중 둘, 회차마다 고정). 마지막 밤만 남았으면 그것 하나.
 * 비어 있으면 시즌을 다 끝낸 것.
 */
export function offeredNights(theme: StoryTheme, progress: PlanetProgress | null | undefined, episodeKey: string | undefined): PlanetNight[] {
  const left = remainingNights(theme, progress);
  if (left.length <= 2) return left;
  const i = hash(episodeKey ?? "", 23) % left.length;
  const j = (i + 1 + (hash(episodeKey ?? "", 29) % (left.length - 1))) % left.length;
  return [left[i], left[j]];
}

/** 아이 대답에서 밤 찾기 (보기에 든 밤을 먼저, 그다음 남은 밤 전체) */
export function matchNight(text: string, offered: PlanetNight[], remaining: PlanetNight[]): PlanetNight | null {
  const t = text.replace(/\s+/g, "");
  const hit = (n: PlanetNight) => n.keywords.some((k) => t.includes(k.replace(/\s+/g, "")));
  return offered.find(hit) ?? remaining.find(hit) ?? null;
}

export interface NightPlan {
  /** 오늘 밤. null이면 시즌을 다 끝낸 뒤의 자유 모험 */
  night: PlanetNight | null;
  /** 밤 시작에 들려준(줄) 보기 */
  offered: PlanetNight[];
  /** 아이가 고르는 턴이 필요한가 (보기가 둘) */
  needsChoice: boolean;
  /** 아이가 직접 골랐는가 */
  chosenByChild: boolean;
}

/**
 * 오늘 밤 정하기. answer = 고르기 질문에 아이가 한 대답(아직 없으면 null).
 * 보기가 둘이면 고르기 턴이 있고, 대답이 없거나 못 알아들으면 첫 보기로 간다.
 */
export function planNight(
  theme: StoryTheme,
  progress: PlanetProgress | null | undefined,
  episodeKey: string | undefined,
  answer: string | null
): NightPlan {
  const offered = offeredNights(theme, progress, episodeKey);
  if (!offered.length) return { night: null, offered, needsChoice: false, chosenByChild: false };
  if (offered.length === 1) return { night: offered[0], offered, needsChoice: false, chosenByChild: false };
  const picked = answer ? matchNight(answer, offered, remainingNights(theme, progress)) : null;
  return { night: picked ?? offered[0], offered, needsChoice: true, chosenByChild: Boolean(picked) };
}

/** 가진 것 한 줄 (프롬프트용) */
export function itemsLine(theme: StoryTheme, progress: PlanetProgress | null | undefined): string {
  const items = itemsFor(theme, progress);
  if (!items.length) return "아직 얻은 것이 없다(이야기 용과 아이의 목소리뿐).";
  return items.map((it) => `${it.name}(${it.use})`).join(" / ");
}

/**
 * 오늘 밤 줄거리 카드: 프롬프트가 턴마다 가져다 쓰는 조각들.
 * free: 시즌을 다 끝낸 별에서 쓰는 고전 동화 뼈대(plotPatterns).
 */
export function nightBrief(
  theme: StoryTheme,
  progress: PlanetProgress | null | undefined,
  night: PlanetNight | null,
  free: { directive: string; resolve: string }
): {
  nightId: string;
  goal: string;
  hook: string;
  twist: string;
  method: string;
  key: string;
  resolve: string;
  directive: string;
  reward: string;
  finale: boolean;
  items: string;
  villain: { due: boolean; name: string; desc: string; repel: string; hint: string };
} {
  const items = itemsLine(theme, progress);
  const villain = {
    due: villainDue(theme, progress, night),
    name: theme.villain.name,
    desc: theme.villain.desc,
    repel: theme.villain.repel,
    hint: villainHint(theme, progress),
  };
  if (!night) {
    return {
      nightId: "free",
      goal: `${theme.planet}에서의 자유 모험`,
      hook: `${theme.host.name}에게 오늘 밤 작은 곤란이 생겼어용(아래 장면과 이어지게 한다).`,
      twist: "아이 생각대로 해 봤더니 반만 되거나 웃긴 일이 생긴다. 아이 생각 하나를 더하면 해결된다.",
      method: `이 별의 놀이 '${theme.play}'를 한 번 넣는다.`,
      key: "아이가 앞에서 말한 것이 열쇠가 된다.",
      resolve: free.resolve,
      directive: `${free.directive} (이 장면을 ${theme.planet}의 친구·장소로 옮겨 그린다.)`,
      reward: "",
      finale: false,
      items,
      villain: { ...villain, due: false },
    };
  }
  return {
    nightId: night.id,
    goal: `${night.label} — ${night.method.split(":")[0].split("(")[0].trim()}`,
    hook: night.hook,
    twist: night.twist,
    method: night.method,
    key: night.key,
    resolve: night.resolve,
    directive: `${night.method} 아이가 고른 대로 해 보는 장면을 그리고, 그 결과로 뜻밖의 일이 생긴다: ${night.twist}`,
    reward: `${night.reward.name} — ${night.reward.use}`,
    finale: Boolean(night.finale),
    items,
    villain,
  };
}

/**
 * 회차가 끝난 뒤 진행 상태 갱신.
 * reached: 이야기가 충분히 진행됐는가(첫 시도 다음 턴까지). 아니면 방문 횟수만 늘린다
 * nightId: 오늘 밤 id
 * collected: 아이가 지은 이름·만든 것·주문·방법 (아이 말 그대로의 짧은 낱말)
 */
export function advancePlanet(
  theme: StoryTheme,
  progress: PlanetProgress | null | undefined,
  opts: { reached: boolean; nightId?: string | null; collected?: string[] }
): PlanetProgress {
  const p: PlanetProgress = {
    visits: (progress?.visits ?? 0) + 1,
    done: [...(progress?.done ?? [])],
    collected: [...(progress?.collected ?? [])],
    stage: 0,
  };
  if (opts.reached && opts.nightId && nightById(theme, opts.nightId) && !p.done.includes(opts.nightId)) {
    p.done.push(opts.nightId);
  }
  for (const c of opts.collected ?? []) {
    const v = c.trim().slice(0, 20);
    if (v && !p.collected.includes(v) && !RAINBOW_COLORS.includes(v)) p.collected.push(v);
  }
  p.collected = p.collected.slice(-20);
  p.stage = p.done.length;
  return p;
}

/** 시즌 전체 밤 수와 끝낸 수 (부모 화면 진행 막대용) */
export function progressCount(theme: StoryTheme, progress: PlanetProgress | null | undefined): { done: number; total: number } {
  const ids = new Set(theme.nights.map((n) => n.id));
  const done = (progress?.done ?? []).filter((id) => ids.has(id)).length;
  return { done: Math.min(done, theme.nights.length), total: theme.nights.length };
}

/** 진행 상태를 한 줄로 (프롬프트·동화책·부모 화면용). night를 주면 오늘 밤도 붙인다 */
export function progressLine(theme: StoryTheme, progress: PlanetProgress | null | undefined, night?: PlanetNight | null): string {
  const p = progress ?? emptyProgress();
  const { done, total } = progressCount(theme, p);
  const doneLabels = p.done.map((id) => nightById(theme, id)?.label).filter(Boolean) as string[];
  const made = p.collected;
  const madeText = made.length ? ` 지금까지 아이가 이 별에 만든 것: ${made.slice(-6).join(", ")}.` : "";
  const head = done
    ? `'${theme.season.title}' ${done}/${total}밤 끝냄(${doneLabels.join("·")}).`
    : `'${theme.season.title}' 아직 끝낸 밤이 없다(0/${total}).`;
  const left = remainingNights(theme, p);
  if (!left.length) return `${head} 시즌을 다 끝낸 뒤의 ${p.visits + 1}번째 방문. 자유 모험.${madeText}`;
  const tonight = night ? ` 오늘 밤: ${night.label}${night.finale ? " (마지막 밤, 결전)" : ""}.` : ` 남은 밤: ${left.map((n) => n.label).join("·")}.`;
  return `${head}${tonight} 가진 것: ${itemsLine(theme, p)}${madeText}`;
}

// ───────────────────────── 프롬프트·STT ─────────────────────────

/** 이야기 프롬프트에 넣을 행성 맥락 (아이 말이 우선이라는 단서 포함) */
export function themeContext(theme: StoryTheme, progress?: PlanetProgress | null): string {
  return [
    `[오늘의 별] ${theme.planet} — ${theme.tag}. ${theme.mood}.`,
    `이 별의 단짝 친구: ${theme.host.name} — ${theme.host.desc}. 방해꾼: ${theme.villain.name} — ${theme.villain.desc}.`,
    `놀이 주제(${theme.domain}): ${theme.play}. 아이의 말이 이 별에 실제 변화를 일으킨다. 정답보다 아이의 상상과 설명이 중요하다.`,
    "놀이의 주인은 아이다: 이름·모양·방법·주문·색은 아이가 정한다. 이야기 용이 먼저 정해 버리거나 아이가 말하지 않은 것을 정한 것처럼 쓰지 않는다. 용이 먼저 하나를 내는 건 아이가 계속 고르기 어려워할 때만이고, 그것도 '○○ 어때용?'처럼 물어서 아이가 고르면 정한다. 아이가 다른 쪽을 원하면 아이 말이 우선이고, 오늘 밤 줄거리는 아이가 고른 쪽 안에서 이어 간다.",
    `시즌 줄거리: ${progressLine(theme, progress)}`,
    `질문 방식: ${theme.questionStyle}`,
    `대답 받기: ${theme.answerRules}`,
    theme.softeners ? `조심: ${theme.softeners}` : "",
    "이 별의 낱말(이 안에서 고르면 아이가 알아듣고 따라 말하기 쉽다):",
    `친구: ${theme.characters.join(", ")}`,
    `물건: ${theme.items.join(", ")}`,
    `장소: ${theme.places.join(", ")}`,
    "아이가 이 별 밖의 것을 말하면 아이 말이 우선이다.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** STT 힌트용 낱말 묶음 (중요한 순: 핵심 → 그 밖). 중복 제거 */
export function themeSttWords(theme: StoryTheme, coreOnly = false): string[] {
  const words = coreOnly ? theme.sttCore : [theme.planet, ...theme.sttCore, ...theme.characters, ...theme.sttMore];
  return [...new Set(words)];
}

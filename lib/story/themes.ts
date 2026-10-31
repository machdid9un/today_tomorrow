// 행성(이야기 테마) 설정집. 소유: 역할 3.
// 팀 확정 세계관: 각 행성은 하나의 '놀이 주제'를 가진다. 아이의 말이 행성에 변화를 일으키고,
// 정답보다 아이의 상상과 설명이 중요하다. 행성마다 언어·감정·관계·감각 중 하나를 중심으로 삼는다.
//
// 행성마다 '시즌 줄거리(arc)'가 있다(예: 숨은 무지개의 7색 찾기). 한 밤은 그 밤만 들어도 완결되고,
// 다녀갈 때마다 단계가 하나씩 나아간다(진행 상태는 worlds.memory_json.planets에 저장).
// 이 설정집은 ① 이야기 프롬프트 ② 갈림길 장면 ③ 음성 인식(STT) 낱말 힌트가 함께 쓴다.

export type PlanetId = "forest" | "waterfire" | "upside" | "rainbow";

export interface PlanetStage {
  id: string;
  /** 이 단계의 목표(한 줄) */
  goal: string;
  /** 갈림길(씨앗) 턴에 넣을 장면. {next}는 코드가 채운다(예: 숨은 무지개의 오늘 찾을 색) */
  directive: string;
  /** 갈림길 다음 턴부터 마무리까지의 해결 방향 */
  resolve: string;
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
  arc: { title: string; stages: PlanetStage[] };
}

/** 숨은 무지개 행성의 7색 (찾는 순서 기본값. 아이가 남은 색 중 고를 수 있다) */
export const RAINBOW_COLORS = ["빨강", "주황", "노랑", "초록", "파랑", "남색", "보라"];

export const THEMES: StoryTheme[] = [
  {
    id: "forest",
    planet: "구름숲 행성",
    tag: "작은 시작, 커다란 상상",
    domain: "창작",
    play: "세계를 자유롭게 만들고 이름 붙이기",
    mood: "폭신한 구름 나무 사이로 작은 집이 보이는 숲. 아이가 만든 것들이 하나씩 숲에 생겨난다",
    questionStyle:
      "아이가 직접 만들고 이름 붙이게 묻는다: '이 나무 이름을 뭐라고 지어 줄까용?', '집 지붕은 무슨 모양일까용?', '숲에 무엇을 하나 더 만들까용?'. 아이가 만든 것은 바로 숲에 생겨나게 그린다.",
    answerRules:
      "아이가 지은 이름·모양은 무엇이든 그대로 숲의 일부가 된다(엉뚱할수록 반긴다). '몰라'면 숲의 소리·모양 힌트를 주고('바람에 사각사각 흔들리는 나무예용. 사각이? 폭신이?'), 그래도 어려우면 용이 먼저 하나 지어 보이고 아이가 바꿀 수 있게 한다.",
    clues: ["사각사각 나뭇잎 소리", "부엉부엉 부엉이 소리", "똑똑 작은 문 두드리는 소리", "반딧불이 불빛이 깜빡깜빡"],
    characters: ["다람쥐", "아기 토끼", "아기 부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 여우", "두더지", "아기 사슴", "달팽이"],
    items: ["이름 없는 나무", "작은 집", "우편함", "편지", "도토리", "버섯", "나뭇잎 우산", "꽃"],
    places: ["구름 나무 아래", "숲속 작은 집", "디딤돌 길", "버섯 마을", "옹달샘"],
    actions: ["이름 지어 줄래", "집 지을래", "만들래", "친구 부를래", "길 만들래", "같이 갈래"],
    sttCore: ["구름숲", "구름 나무", "이름 없는 나무", "작은 집", "다람쥐", "아기 토끼", "부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 여우", "두더지", "아기 사슴", "달팽이", "도토리", "버섯", "나뭇잎", "열매", "지붕", "이름 지어 줄래", "집 지을래", "만들래", "친구 부를래", "같이 갈래"],
    sttMore: ["숲속", "오두막", "창문", "문", "굴뚝", "우편함", "편지", "솔방울", "꽃", "꽃잎", "사과", "딸기", "체리", "나뭇잎 우산", "옹달샘", "디딤돌", "조약돌", "징검다리", "다리", "길", "그네", "사다리", "울타리", "침대", "이불", "등불", "축제", "노래", "구름 지붕", "나뭇잎 지붕", "동그라미", "세모", "네모", "하트", "별 모양", "폭신폭신", "사각사각", "부엉부엉", "똑똑", "반짝반짝", "뭉게뭉게", "몽실이", "뭉게", "폭신이", "초롱이", "뽀송이", "콩이", "별이", "구름이", "심을래", "물 줄래", "놀러 갈래", "인사할래", "초대할래", "길 만들래"],
    arc: {
      title: "우리만의 숲 만들기",
      stages: [
        {
          id: "name_tree",
          goal: "이름 없는 나무에 이름을 지어 준다",
          directive:
            "숲 한가운데 이름이 없어 시무룩한 구름 나무가 있는 장면. 아이가 이름을 지어 주면 나무가 반짝 기뻐하며 잎을 흔든다. 어떤 이름을 지어 줄지, 또는 나무에게 어떤 열매가 열리게 할지 두 갈래로 묻는다.",
          resolve: "아이가 지은 이름(또는 열매)으로 나무가 숲의 첫 친구가 된다. 마무리엔 나무 아래에서 함께 쉰다.",
        },
        {
          id: "build_house",
          goal: "숲속 작은 집을 아이 생각대로 짓는다",
          directive:
            "아이가 지은 나무 옆 빈터에 작은 집을 지을 수 있는 장면. 지붕을 무엇으로 만들지(구름 지붕 / 나뭇잎 지붕), 또는 누가 살면 좋을지 아이가 고르게 한다.",
          resolve: "아이가 고른 모양으로 집이 생기고 불이 켜진다. 마무리엔 집 창가의 포근한 불빛.",
        },
        {
          id: "new_friend",
          goal: "숲에 새 친구를 초대한다",
          directive:
            "숲속 작은 집에 똑똑 누군가 찾아온 장면. 처음 보는 친구에게 어떻게 인사할지, 또는 그 친구가 어떤 동물일지 아이가 정하게 한다.",
          resolve: "새 친구가 숲에 살게 되고, 아이가 지은 이름으로 불린다. 마무리엔 모두 나란히 누워 별을 본다.",
        },
        {
          id: "make_path",
          goal: "숲의 길과 다리를 아이가 그려 넣는다",
          directive:
            "숲의 친구들이 서로 놀러 가고 싶은데 길이 없는 장면. 길을 무엇으로 만들지(디딤돌 / 반짝이 조약돌), 다리를 어디에 놓을지 아이가 고르게 한다.",
          resolve: "아이가 만든 길로 친구들이 오가며 숲이 이어진다. 마무리엔 길 위 반딧불이가 하나둘 잠든다.",
        },
        {
          id: "forest_festival",
          goal: "지금까지 만든 것들이 모이는 숲 축제(시즌 마무리)",
          directive:
            "지금까지 아이가 이름 짓고 만든 것들이 모두 모여 숲 축제를 여는 장면. 축제에서 무엇을 할지(노래 / 등불 띄우기) 아이가 고르게 한다. 이후 다녀갈 때는 숲에 새로운 것을 하나씩 더한다.",
          resolve: "아이가 만든 숲 전체가 반짝이며 축제가 열리고, 모두 아이 덕분에 숲이 생겼다고 고마워한다(칭찬 대신 고마움). 마무리엔 축제 등불이 하나둘 꺼지며 잠든다.",
        },
      ],
    },
  },
  {
    id: "waterfire",
    planet: "물불 행성",
    tag: "서로 달라도 함께",
    domain: "관계",
    play: "서로 다른 존재의 입장을 듣고 화해시키기",
    mood: "한쪽엔 동글동글 물방울 마을, 다른 쪽엔 따끈따끈 불씨 마을. 서로 달라서 자꾸 오해가 생기지만 마음은 착한 이웃들",
    questionStyle:
      "양쪽 마음을 차례로 듣고 아이가 생각을 내게 묻는다: '물방울 친구는 왜 속상했을까용?', '불씨 친구 마음은 어땠을까용?', '둘이 같이 놀려면 어떻게 하면 좋을까용?'. 누가 잘못했는지 따지는 질문은 하지 않는다.",
    answerRules:
      "아이가 어느 편을 들어도 괜찮다. 그 생각을 받아 준 뒤 다른 쪽 마음도 살짝 들려준다(판정하지 않는다). 아이가 낸 화해 방법은 무엇이든 효과가 있게 그린다. '몰라'면 '물방울은 차갑고 불씨는 따뜻해용. 둘이 함께하면 무엇이 생길까용? 김? 무지개?'처럼 두 성질을 합치는 힌트를 준다. 소리치기·때리기 대신 오해와 서툰 마음으로만 그린다.",
    clues: ["톡톡 물방울 떨어지는 소리", "타닥타닥 작은 불씨 소리", "치이익 김 나는 소리", "웅성웅성 두 마을 소리"],
    characters: ["물방울 아이", "불씨 아이", "물방울 할머니", "불씨 할아버지", "구름 우체부", "김 요정", "아기 개구리", "아기 반딧불", "무지개 새", "작은 물고기"],
    items: ["물방울 모자", "불씨 등불", "다리", "약속 편지", "따뜻한 차", "우산", "모닥불", "무지개 김"],
    places: ["물방울 마을", "불씨 마을", "두 마을 사이 강", "가운데 다리", "축제 광장"],
    actions: ["화해시킬래", "같이 놀래", "들어 볼래", "다리 놓을래", "약속할래", "안아 줄래"],
    sttCore: ["물불", "물방울", "물방울 마을", "불씨", "불씨 마을", "물방울 아이", "불씨 아이", "불꽃", "모닥불", "김", "무지개", "다리", "강", "웅덩이", "미안해", "고마워", "화해", "사이좋게", "같이 놀자", "안아 줄래", "들어 볼래", "화해시킬래", "다리 놓을래", "약속할래"],
    sttMore: ["물방울 할머니", "불씨 할아버지", "구름 우체부", "김 요정", "개구리", "반딧불", "물고기", "무지개 새", "수증기", "비", "구름", "우산", "등불", "촛불", "약속 편지", "따뜻한 차", "무지개 김", "축제", "불꽃놀이", "그림자놀이", "노래 부를래", "같이 놀래", "손잡을래", "따뜻해", "차가워", "뜨거워", "시원해", "속상해", "화났어", "서운해", "슬퍼", "기뻐", "괜찮아", "싸우지 마", "친구 하자", "둘 다 좋아", "같이 하자", "반반", "번갈아", "톡톡", "타닥타닥", "치이익", "보글보글", "토닥토닥"],
    softeners:
      "다툼은 오해와 서툰 마음으로만 그리고, 화내기·소리치기·벌주기는 쓰지 않는다. 현실의 가족 다툼을 떠올리게 하는 말(엄마·아빠·싸움 소리)은 쓰지 않고, 매 밤 조금씩이라도 포근하게 풀린다.",
    arc: {
      title: "물방울 마을과 불씨 마을이 친구가 되기까지",
      stages: [
        {
          id: "hear_water",
          goal: "물방울 마을의 속상한 마음을 듣는다",
          directive:
            "물방울 아이가 '불씨 마을이 너무 뜨거워서 우리 웅덩이가 줄어들었어'라며 속상해하는 장면. 물방울 아이를 어떻게 달래 줄지(꼭 안아 주기 / 이야기 더 들어 주기) 아이가 고르게 한다.",
          resolve: "아이가 마음을 들어 준 덕분에 물방울 아이 표정이 풀리고, 불씨 마을 쪽에서도 작은 불빛이 이쪽을 바라본다. 마무리엔 물방울 소리가 잔잔해진다.",
        },
        {
          id: "hear_fire",
          goal: "불씨 마을의 마음도 듣는다",
          directive:
            "불씨 아이가 '물방울이 튀어서 우리 불이 꺼질 뻔했어'라며 시무룩한 장면. 불씨 아이에게 무슨 말을 해 줄지, 또는 어떻게 따뜻하게 해 줄지 아이가 고르게 한다.",
          resolve: "불씨 아이도 마음이 풀리고, 두 마을 모두 서로 일부러 그런 게 아니었다는 걸 알게 된다. 마무리엔 불씨가 작게 반짝이며 잠든다.",
        },
        {
          id: "find_common",
          goal: "두 마을이 같이 좋아하는 것을 찾는다",
          directive:
            "물방울 아이와 불씨 아이가 강가에서 마주친 장면. 둘이 함께 할 수 있는 놀이(노래 부르기 / 그림자놀이)를 아이가 골라 준다.",
          resolve: "아이가 고른 놀이를 하며 둘이 처음으로 같이 웃는다. 물과 불이 만나 따뜻한 김이 피어오른다. 마무리엔 김이 구름처럼 포근하게 덮인다.",
        },
        {
          id: "build_bridge",
          goal: "두 마을을 잇는 다리와 약속을 만든다",
          directive:
            "두 마을 사이 강에 다리를 놓을 수 있는 장면. 다리를 무엇으로 만들지(무지개 김 다리 / 조약돌 다리), 또는 서로 지킬 약속을 무엇으로 할지 아이가 정하게 한다.",
          resolve: "아이가 정한 다리와 약속 덕분에 두 마을이 오가기 시작한다. 마무리엔 다리 위 불빛과 물빛이 함께 반짝인다.",
        },
        {
          id: "festival",
          goal: "물불 축제(시즌 마무리)",
          directive:
            "두 마을이 함께 여는 첫 물불 축제 장면. 물과 불이 함께 만드는 무지개 김 불꽃놀이에서 무엇을 그릴지 아이가 고르게 한다. 이후 다녀갈 때는 두 마을에 생긴 새로운 작은 일을 함께 풀어 간다.",
          resolve: "물방울과 불씨가 손잡고 아이가 고른 그림을 하늘에 그린다. 마무리엔 따뜻한 김 속에서 모두 잠든다.",
        },
      ],
    },
  },
  {
    id: "upside",
    planet: "거꾸로 행성",
    tag: "모든 것이 반대로 움직이는 세계",
    domain: "언어",
    play: "반대말과 엉뚱한 문장으로 언어 놀이하기",
    mood: "비가 하늘로 내리고, 집이 거꾸로 서 있고, 말한 것이 반대로 이루어지는 엉뚱하고 웃긴 별",
    questionStyle:
      "반대말·거꾸로 말·엉뚱한 문장을 만들게 묻는다: '여기선 '크다'의 반대말을 말해야 문이 열려용. 뭐라고 할까용?', '비를 다시 내리게 하는 거꾸로 주문은 뭘까용?', '세상에서 제일 웃긴 거꾸로 문장을 만들어 볼까용?'.",
    answerRules:
      "반대말이 '틀려도' 정답 처리하지 않고 더 엉뚱한 일이 일어나게 그린다(예: '작다' 대신 '맛있다'라고 하면 문이 쿠키로 변해용). 아이가 지은 주문은 낱말 그대로 '거꾸로 주문'이 된다. '몰라'면 쉬운 짝(크다/작다, 덥다/춥다, 위/아래)을 보기 두 개로 들려준다. 남을 놀리는 말이나 나쁜 말은 웃긴 소리(뿡, 뾰로롱)로 바꿔 받는다.",
    clues: ["뿅뿅 거꾸로 튀어 오르는 소리", "또르르 위로 올라가는 빗방울 소리", "삐걱삐걱 거꾸로 선 집 소리", "히히 거꾸로 웃음소리"],
    characters: ["거꾸로 고양이", "물구나무 토끼", "뒤로 걷는 오리", "거꾸로 펭귄", "반대 박사 부엉이", "거꾸로 나무", "뒤집힌 거북이", "구름 물고기", "하늘 지렁이", "거꾸로 왕"],
    items: ["거꾸로 우산", "뒤집힌 의자", "거꾸로 시계", "주문 사전", "위로 내리는 비", "거꾸로 모자", "반대 거울", "뒤집힌 케이크"],
    places: ["거꾸로 선 집", "하늘 바닥", "반대 다리", "뒤집힌 숲", "거꾸로 광장"],
    actions: ["거꾸로 할래", "반대로 말할래", "주문 외울래", "물구나무 설래", "웃긴 말 할래", "뒤로 걸을래"],
    sttCore: ["거꾸로", "반대로", "반대말", "뒤집어", "물구나무", "주문", "거꾸로 고양이", "물구나무 토끼", "뒤로 걷는 오리", "거꾸로 펭귄", "거꾸로 왕", "위", "아래", "크다", "작다", "덥다", "춥다", "빠르게", "느리게", "올라가", "내려가", "열려라", "닫혀라", "수리수리 마수리"],
    sttMore: ["거꾸로 행성", "반대 박사", "부엉이", "거북이", "구름 물고기", "지렁이", "거꾸로 나무", "거꾸로 우산", "거꾸로 시계", "반대 거울", "거꾸로 모자", "뒤집힌 의자", "뒤집힌 케이크", "주문 사전", "거꾸로 선 집", "하늘 바닥", "하늘", "땅", "앞", "뒤", "왼쪽", "오른쪽", "길다", "짧다", "많다", "적다", "높다", "낮다", "무겁다", "가볍다", "밝다", "어둡다", "뜨겁다", "차갑다", "낮", "밤", "웃어", "울어", "들어가", "나가", "일어나", "잘 가", "안녕", "시끄러워", "조용해", "좋아", "싫어", "얍", "뿅", "뾰로롱", "아브라카다브라", "방귀", "뿡뿡", "뒤로 걸을래", "거꾸로 할래", "반대로 말할래", "주문 외울래", "웃긴 말 할래"],
    arc: {
      title: "거꾸로 주문 모으기",
      stages: [
        {
          id: "rain_up",
          goal: "하늘로 올라가는 비를 다시 내리게 하는 주문",
          directive:
            "비가 하늘로 또르르 올라가 버려 거꾸로 고양이 집 앞이 바싹 마른 장면. 비를 내리게 할 반대말 주문(예: '올라가'의 반대)을 아이가 직접 말하게 하거나, 우산을 거꾸로 쓸지 바로 쓸지 고르게 한다.",
          resolve: "아이의 주문(맞든 엉뚱하든)으로 비가 이상하고 재미있게 내린다. 그 주문은 첫 번째 거꾸로 주문이 된다. 마무리엔 빗소리가 자장가처럼 작아진다.",
        },
        {
          id: "upside_house",
          goal: "거꾸로 선 집의 문을 여는 반대말",
          directive:
            "거꾸로 선 집의 문이 '반대말을 말해야 열려'라고 말하는 장면. 문에 적힌 낱말(크다 / 덥다 같은 쉬운 말)의 반대말을 아이가 말하거나, 엉뚱한 문장을 지어 보게 한다.",
          resolve: "아이가 말한 대로 문이 열리거나 더 웃긴 일이 생기고, 그 말이 두 번째 주문이 된다. 마무리엔 집 안 거꾸로 침대에서 쉰다.",
        },
        {
          id: "backward_words",
          goal: "말한 것이 반대로 이루어지는 날, 원하는 걸 반대로 말하기",
          directive:
            "오늘은 말한 것이 반대로 이루어지는 날이라, 뒤로 걷는 오리가 '빨리 가자!'고 하자 아주 느려진 장면. 오리를 빨리 가게 하려면 뭐라고 말해야 할지 아이가 생각해 말하게 한다.",
          resolve: "아이의 반대 말 덕분에 오리가 깔깔 웃으며 움직인다. 그 말이 세 번째 주문이 된다. 마무리엔 '잘 자'의 반대말 놀이로 웃다가 조용해진다.",
        },
        {
          id: "silly_song",
          goal: "엉뚱한 거꾸로 노래·문장 짓기",
          directive:
            "거꾸로 광장에서 거꾸로 노래 대회가 열린 장면. 아이가 엉뚱한 문장 한 줄(예: '고양이가 하늘을 마셔요')을 지어 노래 첫 줄로 정하게 한다.",
          resolve: "아이의 문장으로 노래가 만들어지고 모두 따라 부른다. 네 번째 주문이 된다. 마무리엔 노래가 점점 작게 흥얼흥얼.",
        },
        {
          id: "upside_king",
          goal: "모은 주문으로 거꾸로 왕을 만나는 잔치(시즌 마무리)",
          directive:
            "지금까지 아이가 만든 거꾸로 주문들을 들은 거꾸로 왕이 잔치를 여는 장면. 오늘 밤 행성을 거꾸로 둘지, 잠깐 바로 세울지 아이가 고르게 한다. 이후 다녀갈 때는 새 주문을 하나씩 더 모은다.",
          resolve: "아이가 고른 대로 행성이 바뀌고, 모두 아이의 주문을 외치며 웃는다. 마무리엔 거꾸로 별들이 하나둘 반짝이다 잠든다.",
        },
      ],
    },
  },
  {
    id: "rainbow",
    planet: "숨은 무지개 행성",
    tag: "사라진 색깔 찾기",
    domain: "감각",
    play: "색깔을 자유롭게 섞고 사물에 새로운 색 입히기",
    mood: "무지개의 일곱 색이 숨바꼭질하러 숨어 버려 조금 흐릿해진 별. 색깔 친구를 찾을 때마다 별이 한 가지 색으로 다시 물든다",
    questionStyle:
      "색을 상상하고 섞고 입히게 묻는다: '이 나무에 무슨 색을 칠해 줄까용?', '노랑이랑 파랑을 섞으면 무슨 색이 될까용?', '색깔 친구는 어디에 숨었을까용?'. 색의 느낌(따뜻한, 시원한, 말랑한)도 묻는다.",
    answerRules:
      "색 섞기는 과학적으로 틀려도 새 색으로 인정한다(예: '빨강+파랑=반짝이색'이면 반짝이색이 생긴다). 아이가 입힌 색은 그대로 행성에 칠해진다(분홍 나무, 보라 구름 환영). 색깔에 남자색·여자색 같은 고정관념은 쓰지 않는다. '몰라'면 그 색이 있을 법한 곳 두 군데(사과 나무 / 노을 언덕)를 보기로 준다.",
    clues: ["사르륵 색이 번지는 소리", "까꿍 하는 작은 목소리", "흐릿한 빛이 깜빡깜빡", "퐁퐁 물감 방울 소리"],
    characters: ["빨강 친구", "주황 친구", "노랑 친구", "초록 친구", "파랑 친구", "남색 친구", "보라 친구", "무지개 새", "물감 다람쥐", "흐릿한 구름"],
    items: ["무지개 조각", "물감 방울", "색깔 붓", "분홍 나무", "보라 구름", "색 바구니", "투명 우산", "빛 거울"],
    places: ["흐릿한 숲", "노을 언덕", "색깔 호수", "무지개 다리 터", "물감 동굴"],
    actions: ["색 칠할래", "섞어 볼래", "찾을래", "숨바꼭질할래", "빨강 찾을래", "무지개 만들래"],
    sttCore: ["숨은 무지개", "무지개", "색깔", "빨강", "주황", "노랑", "초록", "파랑", "남색", "보라", "분홍", "빨간색", "노란색", "파란색", "보라색", "분홍색", "섞어 볼래", "칠할래", "찾을래", "숨바꼭질", "까꿍", "찾았다", "색깔 친구", "물감"],
    sttMore: ["주황색", "초록색", "남색", "하늘색", "연두색", "하얀색", "검은색", "회색", "갈색", "금색", "은색", "반짝이", "반짝이색", "투명", "알록달록", "무지개색", "일곱 색깔", "빨강 친구", "주황 친구", "노랑 친구", "초록 친구", "파랑 친구", "남색 친구", "보라 친구", "무지개 새", "물감 다람쥐", "흐릿한 구름", "무지개 다리", "무지개 조각", "물감 방울", "붓", "크레파스", "색연필", "색 바구니", "빛 거울", "분홍 나무", "보라 구름", "노을 언덕", "색깔 호수", "물감 동굴", "흐릿한 숲", "사과", "바나나", "레몬", "딸기", "포도", "귤", "하늘", "바다", "풀", "꽃", "여기 있다", "꼭꼭 숨어라", "따뜻한 색", "시원한 색", "무지개 만들래", "색 칠할래"],
    arc: {
      title: "사라진 일곱 색깔 찾기",
      stages: [
        {
          id: "find_color",
          goal: "숨은 색깔 친구 한 명을 찾아 별에 색을 되돌린다 (일곱 번 반복)",
          directive:
            "오늘 찾을 색깔 친구는 {next}이다. 흐릿한 별 어딘가에서 {next} 친구가 '까꿍' 하고 숨어 있는 장면. {next} 친구가 어디에 숨었을지 두 곳 중 고르게 하거나, 찾으면 무엇에 {next}을 칠해 줄지 아이가 고르게 한다.",
          resolve:
            "아이 덕분에 {next} 친구를 찾고, 아이가 고른 것에 {next}이 칠해지며 별이 조금 더 환해진다. 남은 색 친구들은 다음 밤에 찾기로 한다. 마무리엔 새로 찾은 색이 은은하게 잠든다.",
        },
        {
          id: "rainbow_back",
          goal: "일곱 색이 모두 모여 무지개가 돌아온다(시즌 마무리)",
          directive:
            "일곱 색깔 친구가 모두 모여 무지개 다리를 다시 놓으려는 장면. 무지개 끝에 무엇이 생기면 좋을지, 또는 무지개에 아이만의 여덟 번째 색을 더할지 아이가 고르게 한다. 이후 다녀갈 때는 아이가 새 색을 만들어 별을 꾸민다.",
          resolve: "아이가 고른 대로 무지개가 반짝 돌아오고, 별 전체가 아이가 입힌 색으로 물든다. 마무리엔 무지개가 별빛처럼 은은해진다.",
        },
      ],
    },
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

/** worlds.memory_json.planets[행성] — 다녀간 횟수, 끝낸 단계 수, 모은 것(찾은 색·지은 이름·주문 등) */
export interface PlanetProgress {
  visits: number;
  /** 끝낸 단계 수 (숨은 무지개는 일곱 색을 다 찾은 뒤 '무지개 돌아옴'을 끝내면 1) */
  stage: number;
  collected: string[];
}

export type PlanetMemory = Partial<Record<PlanetId, PlanetProgress>>;

export function emptyProgress(): PlanetProgress {
  return { visits: 0, stage: 0, collected: [] };
}

/** memory_json에서 행성 진행 상태 읽기 (없거나 깨졌으면 빈 값) */
export function readPlanets(raw: unknown): PlanetMemory {
  const out: PlanetMemory = {};
  const planets = raw && typeof raw === "object" ? (raw as Record<string, unknown>).planets : null;
  if (!planets || typeof planets !== "object") return out;
  for (const t of THEMES) {
    const p = (planets as Record<string, unknown>)[t.id];
    if (!p || typeof p !== "object") continue;
    const r = p as Record<string, unknown>;
    out[t.id] = {
      visits: Number.isFinite(Number(r.visits)) ? Math.max(0, Math.floor(Number(r.visits))) : 0,
      stage: Number.isFinite(Number(r.stage)) ? Math.max(0, Math.floor(Number(r.stage))) : 0,
      collected: Array.isArray(r.collected)
        ? r.collected.filter((x): x is string => typeof x === "string").slice(-20)
        : [],
    };
  }
  return out;
}

/** memory_json.activePlanet (지도에서 고른 별을 회차 동안 기억. 회차 종료 때 시즌 진행 계산에 씀) */
export function readActivePlanet(raw: unknown): PlanetId | null {
  const v = raw && typeof raw === "object" ? (raw as Record<string, unknown>).activePlanet : null;
  return isThemeId(v) ? v : null;
}

/** 숨은 무지개: 아직 못 찾은 색 */
export function remainingColors(progress: PlanetProgress | null | undefined): string[] {
  const found = new Set(progress?.collected ?? []);
  return RAINBOW_COLORS.filter((c) => !found.has(c));
}

/** 오늘의 목표 색 후보 (숨은 무지개). 아이가 둘 중 고를 수 있게 남은 색 앞의 두 개 */
export function nextColorChoices(progress: PlanetProgress | null | undefined): string[] {
  return remainingColors(progress).slice(0, 2);
}

/** 지금 단계. null이면 시즌을 다 끝낸 뒤라 자유 모험(고전 동화 뼈대를 이 별에 맞게) */
export function currentStage(theme: StoryTheme, progress: PlanetProgress | null | undefined): PlanetStage | null {
  const done = progress?.stage ?? 0;
  if (theme.id === "rainbow") {
    if (remainingColors(progress).length > 0) return theme.arc.stages[0];
    return done < 1 ? theme.arc.stages[1] : null;
  }
  return done < theme.arc.stages.length ? theme.arc.stages[done] : null;
}

/** {next} 채우기: 첫 번째는 long(보기 포함), 나머지는 short */
function fill(text: string, long: string, short = long): string {
  const parts = text.split("{next}");
  return parts.map((seg, i) => (i === 0 ? seg : `${i === 1 ? long : short}${seg}`)).join("");
}

function josaEul(word: string): string {
  const last = Array.from(word).pop() ?? "";
  const code = last.charCodeAt(0);
  const batchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return batchim ? "을" : "를";
}

/**
 * 갈림길 장면 지시문과 해결 방향 (진행 상태 반영).
 * free 뼈대(고전 동화)는 시즌을 다 끝낸 뒤에만 쓰고, 이 별의 친구·장소로 옮겨 쓰게 한다.
 */
export function stageDirective(
  theme: StoryTheme,
  progress: PlanetProgress | null | undefined,
  free: { directive: string; resolve: string }
): { directive: string; resolve: string; goal: string; stageId: string } {
  const stage = currentStage(theme, progress);
  if (!stage) {
    return {
      directive: `${free.directive} (이 장면을 ${theme.planet}의 친구·장소로 옮겨 그리고, 이 별의 놀이인 '${theme.play}'가 한 번 들어가게 한다.)`,
      resolve: free.resolve,
      goal: `${theme.planet}에서의 자유 모험`,
      stageId: "free",
    };
  }
  let next = "";
  if (theme.id === "rainbow" && stage.id === "find_color") {
    const [a, b] = nextColorChoices(progress);
    next = b ? `${a}(아이가 원하면 ${b})` : a;
    // '{next}을' 같은 조사를 색 이름에 맞춘다 (빨강을 / 노랑을 / 보라를)
    return {
      directive: fill(stage.directive.replace(/\{next\}을/g, `{next}${josaEul(a)}`), next, a),
      resolve: fill(stage.resolve.replace(/\{next\}이/g, `{next}${josaEul(a) === "을" ? "이" : "가"}`), a),
      goal: `숨은 ${a} 친구 찾기`,
      stageId: stage.id,
    };
  }
  return { directive: fill(stage.directive, next), resolve: fill(stage.resolve, next), goal: stage.goal, stageId: stage.id };
}

/**
 * 회차가 끝난 뒤 진행 상태 갱신.
 * reached: 갈림길 장면까지 가서 아이가 답했는가 (아니면 방문 횟수만 늘린다)
 * foundColor: 숨은 무지개에서 오늘 찾은 색 (남은 색 중 하나여야 인정)
 * collected: 아이가 지은 이름·만든 것·주문 등 (아이 말 그대로의 짧은 낱말)
 */
export function advancePlanet(
  theme: StoryTheme,
  progress: PlanetProgress | null | undefined,
  opts: { reached: boolean; foundColor?: string | null; collected?: string[] }
): PlanetProgress {
  const p: PlanetProgress = {
    visits: (progress?.visits ?? 0) + 1,
    stage: progress?.stage ?? 0,
    collected: [...(progress?.collected ?? [])],
  };
  const stage = currentStage(theme, progress);
  if (opts.reached && stage) {
    if (theme.id === "rainbow" && stage.id === "find_color") {
      const remaining = remainingColors(progress);
      const color = opts.foundColor && remaining.includes(opts.foundColor) ? opts.foundColor : remaining[0];
      if (color) p.collected.push(color);
    } else {
      p.stage += 1;
    }
  }
  if (theme.id !== "rainbow" || !stage || stage.id !== "find_color") {
    for (const c of opts.collected ?? []) {
      const v = c.trim().slice(0, 20);
      if (v && !p.collected.includes(v) && !RAINBOW_COLORS.includes(v)) p.collected.push(v);
    }
  }
  // 숨은 무지개는 찾은 색을 지켜야 하므로 색이 아닌 것만 잘라 낸다
  if (p.collected.length > 20) {
    const colors = p.collected.filter((c) => RAINBOW_COLORS.includes(c));
    const rest = p.collected.filter((c) => !RAINBOW_COLORS.includes(c)).slice(-(20 - colors.length));
    p.collected = [...colors, ...rest];
  }
  return p;
}

/** 시즌 전체 단계 수와 끝낸 수 (부모 화면 진행 막대용) */
export function progressCount(theme: StoryTheme, progress: PlanetProgress | null | undefined): { done: number; total: number } {
  if (theme.id === "rainbow") {
    const found = (progress?.collected ?? []).filter((c) => RAINBOW_COLORS.includes(c)).length;
    return { done: found + Math.min(progress?.stage ?? 0, 1), total: RAINBOW_COLORS.length + 1 };
  }
  return { done: Math.min(progress?.stage ?? 0, theme.arc.stages.length), total: theme.arc.stages.length };
}

/** 진행 상태를 한 줄로 (프롬프트·동화책·부모 화면용) */
export function progressLine(theme: StoryTheme, progress: PlanetProgress | null | undefined): string {
  const p = progress ?? emptyProgress();
  const stage = currentStage(theme, p);
  if (theme.id === "rainbow") {
    const found = p.collected.filter((c) => RAINBOW_COLORS.includes(c));
    const head = found.length
      ? `지금까지 찾은 색 ${found.length}/7: ${found.join("·")}.`
      : "아직 찾은 색이 없다(일곱 색 모두 숨어 있음).";
    if (!stage) return `${head} 무지개가 돌아온 뒤라, 이제는 아이가 새 색을 만들어 별을 꾸미는 자유 모험.`;
    return stage.id === "find_color"
      ? `${head} 남은 색: ${remainingColors(p).join("·")}. 오늘은 한 가지 색 친구만 찾는다.`
      : `${head} 오늘은 일곱 색이 모두 모여 무지개가 돌아오는 날.`;
  }
  const made = p.collected.length ? ` 지금까지 아이가 이 별에 만든 것: ${p.collected.slice(-6).join(", ")}.` : "";
  if (!stage) return `시즌 줄거리('${theme.arc.title}')를 다 끝낸 뒤의 ${p.visits + 1}번째 방문. 자유 모험.${made}`;
  const { done, total } = progressCount(theme, p);
  return `${theme.arc.title} ${done + 1}/${total}단계 — 오늘 목표: ${stage.goal}.${made}`;
}

// ───────────────────────── 프롬프트·STT ─────────────────────────

/** 이야기 프롬프트에 넣을 행성 맥락 (아이 말이 우선이라는 단서 포함) */
export function themeContext(theme: StoryTheme, progress?: PlanetProgress | null): string {
  return [
    `[오늘의 별] ${theme.planet} — ${theme.tag}. ${theme.mood}.`,
    `놀이 주제(${theme.domain}): ${theme.play}. 아이의 말이 이 별에 실제 변화를 일으킨다. 정답보다 아이의 상상과 설명이 중요하다.`,
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

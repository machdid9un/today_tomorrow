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
  /** 부모 관찰 노트: 이 별에서 볼 만한 것, 좋은 관찰 예, 절대 쓰면 안 되는 해석 */
  observe: { focus: string; example: string; never: string };
  arc: { title: string; stages: PlanetStage[] };
}

/** 숨은 무지개 행성의 7색 (표시 순서). 찾는 순서는 RAINBOW_ZONES를 따른다 */
export const RAINBOW_COLORS = ["빨강", "주황", "노랑", "초록", "파랑", "남색", "보라"];

/**
 * 찾는 순서(반고정 3구역): ① 씨앗 색(빨강·노랑·파랑, 아이가 고름) → ② 섞어 깨우는 색(주황·초록·보라, 찾은 색을 섞어서)
 * → ③ 밤하늘 색(남색, 마지막 고정). 아이가 순서를 고르면 '내가 찾았다'는 마음이 생기고, 씨앗 색을 먼저 찾아야 섞기가 된다.
 */
export const RAINBOW_ZONES: string[][] = [["빨강", "노랑", "파랑"], ["주황", "초록", "보라"], ["남색"]];

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
    characters: ["다람쥐", "아기 토끼", "아기 부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 사슴", "달팽이", "구름양", "새싹이"],
    items: ["이름 없는 나무", "작은 집", "열매", "이불", "사다리", "바구니", "등불", "도토리"],
    places: ["구름 나무 아래", "숲속 작은 집", "연못", "언덕", "오솔길"],
    actions: ["이름 지어 줄래", "집 지을래", "여기 놓을래", "또 만들래", "친구 부를래", "같이 살래"],
    sttCore: ["구름숲", "구름 나무", "이름 없는 나무", "작은 집", "다람쥐", "아기 토끼", "부엉이", "고슴도치", "반딧불이", "아기 곰", "아기 사슴", "달팽이", "구름양", "새싹이", "열매", "이불", "연못", "언덕", "오솔길", "내가 지을래", "이름은", "여기 놓을래", "또 만들래", "같이 살아"],
    sttMore: ["숲속", "나무집", "오두막", "창문", "지붕", "굴뚝", "우편함", "편지", "도토리", "버섯", "솔방울", "나뭇잎", "꽃", "사과", "딸기", "사다리", "바구니", "등불", "옹달샘", "디딤돌", "징검다리", "다리", "그네", "울타리", "잔치", "선물", "노래", "자장가", "구름 지붕", "나뭇잎 지붕", "동그라미", "세모", "네모", "하트", "별 모양", "폭신폭신", "사각사각", "살랑살랑", "바스락", "사르르", "쑥쑥", "부엉부엉", "똑똑", "반짝반짝", "몽실이", "폭신이", "초롱이", "뽀송이", "아직나무", "이거 내 거야", "이름 지어 줄래", "집 지을래", "친구 부를래", "같이 갈래", "심을래", "놀러 갈래"],
    observe: {
      focus: "아이가 지은 이름·쓰임·자리, 만든 것을 아끼고 챙기는 방식",
      example: "\"고슴도치가 폭신 이불 입으면 안 따가워\"라고 했어요. 친구가 불편하지 않을 방법부터 떠올렸어요.",
      never: "이름을 빨리 못 지어요 / 창의성이 또래보다 부족해 보여요",
    },
    arc: {
      title: "구름 씨앗 — 이름 하나가 숲의 불빛 하나",
      stages: [
        {
          id: "name_tree",
          goal: "이름 없는 나무의 쓰임과 이름을 정해 준다",
          directive:
            "구름숲 한가운데 이름 없는 나무가 새로 돋아 시무룩한 장면. 먼저 이 나무가 무슨 일을 하는 나무일지 묻는다(밤에 불을 켜 주는 나무일까용, 노래하는 나무일까용, 아니면 다른 일을 할까용?). 이름은 다음 턴에 아이가 직접 지어 주게 연다('그럼 뭐라고 불러 줄까용?').",
          resolve: "아이가 정한 쓰임과 아이가 지은 이름으로 나무가 반짝 눈을 뜨고 숲의 첫 불빛이 된다(아이가 아직 이름을 안 지었으면 '뭐라고 불러 줄까용?'으로 아이에게 맡긴다). 내일 밤 첫 열매가 열릴지도 모른다는 기대만 살짝 남긴다. 마무리엔 그 나무 아래에서 함께 쉰다.",
        },
        {
          id: "build_house",
          goal: "숲속 작은 집에 누가 사는지 정해 준다",
          directive:
            "아이가 지은 나무 아래 작은 집 문이 똑똑 열리는 장면. 이 집에 누가 살고 있을지 두 갈래로 묻는다(고슴도치일까용, 아기 토끼일까용?).",
          resolve: "아이가 정한 친구가 집에 들어가고 창문에 불이 켜진다. 집에 필요한 것(이불·지붕)을 아이 생각대로 하나 더한다. 마무리엔 창가 불빛이 포근하게 깜빡인다.",
        },
        {
          id: "new_friend",
          goal: "숲에 새 친구를 만들어 초대한다",
          directive:
            "숲에 처음 보는 친구가 수줍게 놀러 온 장면. 이 친구가 누구인지, 어떻게 생겼는지 아이가 정하게 묻는다(구름처럼 폭신한 친구일까용, 반짝이 꼬리가 있는 친구일까용, 아니면 다른 모습일까용?). 이름도 아이가 짓게 한다.",
          resolve: "아이가 정한 모습과 이름으로 친구가 숲에 살게 된다. 친구가 '놀 곳이 있으면 좋겠다'고 속삭이며 잠든다.",
        },
        {
          id: "forest_place",
          goal: "숲에 장소(연못·언덕·길)를 만들고 이름 붙인다",
          directive:
            "숲 친구들이 함께 놀 곳이 필요한 장면. 연못을 만들지, 언덕을 만들지 아이가 고르게 하고, 그 장소 이름도 지어 주게 한다.",
          resolve: "아이가 만든 장소가 생기고, 지금까지 만든 것들이 반짝이는 오솔길로 이어진다. 마무리엔 오솔길 반딧불이가 하나둘 잠든다.",
        },
        {
          id: "forest_song",
          goal: "숲의 잠자리 인사말·소리를 지어 준다",
          directive:
            "밤이 되자 숲 친구들이 '우리 숲만의 잠자리 인사'를 갖고 싶어 하는 장면. 아이가 숲의 인사말이나 잠 소리를 하나 지어 주게 묻는다(사르르일까용, 살랑살랑일까용, 아니면 새로운 소리?).",
          resolve: "친구들이 아이가 지은 말을 차례로 따라 하며 하나둘 잠든다.",
        },
        {
          id: "forest_festival",
          goal: "지금까지 만든 것들이 모이는 구름숲 잔치(시즌 마무리)",
          directive:
            "지금까지 아이가 이름 짓고 만든 것들이 모두 모여 구름숲 잔치를 여는 장면. 잔치에서 무엇을 할지(노래 / 등불 띄우기) 아이가 고르게 한다.",
          resolve: "아이가 만든 숲 전체가 반짝이며 잔치가 열리고, 모두 아이 덕분에 숲이 생겼다고 고마워한다(평가 대신 고마움). 마무리엔 잔치 등불이 하나둘 꺼진다.",
        },
      ],
    },
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
    characters: ["물방울 친구", "불씨 친구", "이슬", "촛불이", "김구름", "개구리", "물고기", "반딧불이", "바람", "무지개 새"],
    items: ["징검돌", "다리", "선물", "우산", "담요", "찻잔", "등불", "깃발"],
    places: ["물방울 마을", "불씨 마을", "반달 언덕", "시냇물", "김구름 다리"],
    actions: ["같이 놀래", "번갈아 할래", "마음 들어 볼래", "안아 줄래", "나눠 줄래", "다리 놓을래"],
    sttCore: ["물불", "물방울", "물방울 마을", "불씨", "불씨 마을", "반달 언덕", "시냇물", "징검돌", "김구름", "이슬", "촛불이", "같이 놀아", "번갈아 해", "미안해", "괜찮아", "속상해", "화났어", "서운해", "나눠 줘", "내가 도와줄게", "같이 보면 돼", "둘 다", "안아 줄래", "포근해"],
    sttMore: ["물불 행성", "물방울 친구", "불씨 친구", "개구리", "물고기", "반딧불이", "바람", "무지개 새", "모닥불", "불꽃", "김", "무지개", "다리", "강", "웅덩이", "비", "구름", "우산", "담요", "찻잔", "등불", "깃발", "선물", "따뜻한 차", "축제", "불꽃놀이", "그림자놀이", "초대장", "약속", "화해", "사이좋게", "친구 하자", "같이 하자", "반반", "차례대로", "고마워", "심심해", "슬퍼", "기뻐", "따뜻해", "차가워", "뜨거워", "촉촉해", "시원해", "톡톡", "타닥타닥", "치익", "졸졸", "몽글몽글", "보글보글", "토닥토닥", "다리 놓을래", "노래 부를래", "손잡을래"],
    softeners:
      "다툼은 '둘 다 하고 싶은 게 있다'로만 그리고, 싸움·고함·우는 소리·문 쾅 같은 장면은 쓰지 않는다. 한 마을이 떠나거나 사라지거나 꺼지는 결말은 쓰지 않는다('불씨 꺼 버려' → 꺼지는 대신 졸린 아기 불씨가 됨, 물방울의 눈물 → 이슬이 되어 꽃이 핌). 매 밤 둘이 함께 있는 포근한 장면으로 끝낸다. 아이가 '엄마 아빠도 싸워'처럼 현실을 말하면 캐묻지 말고 '그런 일이 있었구나용. 말해 줘서 고마워용.' 한 문장으로 받아 준 뒤 포근한 장면으로 돌아온다(그 말은 이야기에 넣지 않는다).",
    observe: {
      focus: "두 쪽의 마음을 번갈아 떠올리는 순간, 아이가 낸 '둘 다 좋은 방법'",
      example: "처음엔 \"물방울이 먼저야\"라고 했다가 \"불씨도 별 보고 싶었던 거야\"라고 덧붙였어요. 두 쪽의 이유를 번갈아 떠올려 보는 순간이 있었어요.",
      never: "'꺼 버려'라고 한 걸 보면 공격성이 있거나 집에 갈등이 있는 것 같아요",
    },
    arc: {
      title: "징검돌 — 마음 하나를 들어 줄 때마다 시냇물에 돌 하나",
      stages: [
        {
          id: "two_villages",
          goal: "반달 언덕에서 만난 두 마을의 마음을 듣는다",
          directive:
            "반달 언덕에서 물방울 친구와 불씨 친구가 서로 '내가 먼저!' 하고 있는 장면(누가 잘못했는지 따지지 않고, 둘 다 언덕이 너무 좋은가 보다고 말해 준다). 물방울 친구가 지금 어떤 마음일지, 또는 불씨 친구는 왜 언덕에 가고 싶은지 아이가 생각해 말하게 한다.",
          resolve: "다른 쪽 마음도 한 문장 들려준 뒤, 아이가 낸 방법으로(아이가 방법을 아직 안 냈으면 '둘 다 웃을 방법이 있을까용?'으로 아이에게 묻고, 용이 지어내지 않는다) 둘이 언덕에 나란히 앉는다. 물과 불이 가까이 앉자 따뜻한 김이 몽글 피어오르고, 시냇물에 첫 징검돌이 놓인다.",
        },
        {
          id: "water_heart",
          goal: "물방울 친구의 걱정을 들어 준다",
          directive:
            "물방울 친구가 볼을 뽀옹 부풀린 장면: 불씨 옆에 가면 '치익' 김이 되어 사라질까 봐 걱정이다. 물방울의 마음에 이름을 붙여 주게 하거나(속상해 / 무서워 / 서운해), 물방울을 어떻게 안심시킬지 아이가 정하게 한다.",
          resolve: "물방울이 마음을 들어 준 덕분에 한결 편해지고, 불씨도 '나도 조심할게' 하고 다가온다. 징검돌이 하나 더 놓인다.",
        },
        {
          id: "fire_heart",
          goal: "불씨 친구의 걱정을 들어 준다",
          directive:
            "불씨 친구가 불꽃을 쪼그맣게 움츠린 장면: 물이 튀면 작아질까 봐 걱정이다. 불씨의 마음에 이름을 붙여 주게 하거나, 불씨를 어떻게 따뜻하게 지켜 줄지 아이가 정하게 한다.",
          resolve: "불씨도 마음이 풀려 작게 반짝이고, 물방울과 불씨가 서로 일부러 그런 게 아니었다는 걸 안다. 징검돌이 하나 더 놓인다.",
        },
        {
          id: "hill_promise",
          goal: "반달 언덕을 함께 쓰는 방법을 정한다",
          directive:
            "물방울과 불씨가 모두 반달 언덕에서 별을 보고 싶은 장면. 둘 다 웃을 수 있는 방법을 아이가 정하게 한다(번갈아 앉을까용, 아니면 같이 나란히 앉을까용, 다른 방법도 좋아용).",
          resolve: "아이가 낸 방법에 양쪽이 '좋아!' 하고(용이 다른 방법을 지어내지 않는다), 언덕에 둘의 발자국이 나란히 찍힌다. 마무리엔 둘이 같은 별을 본다.",
        },
        {
          id: "steam_bridge",
          goal: "물과 불이 만나 생긴 김구름으로 다리를 놓는다",
          directive:
            "물과 불이 만나 생긴 따뜻한 김구름이 시냇물 위에 모여드는 장면. 김구름 다리를 어떤 모양으로 할지, 다리 이름을 뭐라고 할지 아이가 정하게 한다.",
          resolve: "아이가 정한 김구름 다리가 생기고 두 마을이 오가기 시작한다. 축제 초대장이 살랑 날아온다.",
        },
        {
          id: "festival",
          goal: "물불 축제(시즌 마무리)",
          directive:
            "두 마을이 함께 여는 첫 물불 축제 장면. 축제 이름이나 함께 할 놀이(김구름 그림 그리기 / 그림자놀이)를 아이가 정하게 한다.",
          resolve: "물방울과 불씨가 아이가 정한 놀이를 함께 하고, 따뜻한 김 속에서 모두 나란히 잠든다.",
        },
      ],
    },
  },
  {
    id: "upside",
    planet: "거꾸로 행성",
    tag: "모든 것이 반대로 움직이는 세계",
    domain: "언어",
    play: "반대로 말하기 · 거꾸로 주문 짓기 · 엉뚱한 문장 만들기 (7세 이상은 글자 뒤집기)",
    mood: "말한 것이 반대로 이뤄지는 엉뚱하고 웃긴 별. 비가 위로 올라가고, 집은 천장이 바닥이다. 아이가 만든 주문이 매 밤 거꾸로 주문책에 한 장씩 쌓인다",
    questionStyle:
      "원하는 것을 '반대로' 말하게 하거나 거꾸로 주문·엉뚱한 문장을 짓게 묻는다: '비를 땅으로 내리게 하려면 뭐라고 말해야 할까용?', '이 주문 이름은 뭐라고 할까용?', '뒤뚱이는 거꾸로 집에서 어디서 자면 좋을까용?'. 만 4세나 나이를 모르면 '반대말' 대신 구체적인 짝을 두 가지로 들려준다('올라가라일까용, 내려가라일까용?').",
    answerRules:
      "반대가 '틀리면' 정답 처리 대신 더 웃긴 거꾸로가 된다('커져라' → 문이 더 작아져 개미 손님이 옴). 반대말이 아닌 말('초록!')도 새 규칙이 된다. 단, 반대 규칙으로 두 번 연속 좌절시키지 않는다: 두 번째 시도는 꼭 아이가 원하는 대로 되게 한다. '몰라'면 몸 힌트('손을 위로 쭉, 이번엔 아래로 툭. 위의 반대는 어디일까용?')나 용이 일부러 틀린 반대('위의 반대는… 바나나일까용?')로 아이가 고쳐 주게 한다. 아이의 진짜 '싫어'·'그만'에는 거꾸로 규칙을 쓰지 않는다. 부수기·무서운 말은 거꾸로 규칙으로 풀어 준다('다 부서져라' → 모두 더 튼튼하게 꼭 붙음, '커다란 늑대' → 손톱만 한 솜털 늑대). 남을 놀리는 말은 웃긴 소리(뿡, 뾰로롱)로 바꿔 받는다. 마지막 인사는 거꾸로 하지 않고 바르게 '잘 자용'.",
    clues: ["뿅뿅 거꾸로 튀어 오르는 소리", "또르르 위로 올라가는 빗방울 소리", "뒤뚱뒤뚱 거꾸로 걷는 발소리", "키득키득 거꾸로 웃음소리"],
    characters: ["뒤뚱이", "거꾸로 고양이", "박쥐", "나무늘보", "물구나무 곰", "개미", "오뚝이", "펭귄", "거꾸로 새", "달님"],
    items: ["거꾸로 주문책", "거꾸로 우산", "모자", "신발", "문", "사다리", "시계", "베개"],
    places: ["거꾸로 집", "천장 침대", "하늘 웅덩이", "거꾸로 길", "거꾸로 놀이터"],
    actions: ["반대로 말할래", "거꾸로 할래", "주문 외울래", "물구나무 설래", "웃긴 말 할래", "뒤로 걸을래"],
    sttCore: ["거꾸로", "반대로", "반대말", "거꾸로 해", "뒤집어", "주문", "주문책", "뒤뚱이", "거꾸로 고양이", "박쥐", "나무늘보", "물구나무", "커져라", "작아져라", "올라가", "내려가", "올라가라", "내려가라", "열려라", "닫혀라", "위", "아래", "또 해 줘", "수리수리 마수리"],
    sttMore: ["거꾸로 행성", "거꾸로 주문책", "물구나무 곰", "개미", "오뚝이", "펭귄", "거꾸로 새", "달님", "거꾸로 우산", "모자", "신발", "사다리", "시계", "베개", "거꾸로 집", "천장", "하늘 웅덩이", "거꾸로 길", "거꾸로 놀이터", "하늘", "땅", "앞", "뒤", "왼쪽", "오른쪽", "크다", "작다", "길다", "짧다", "높다", "낮다", "많다", "적다", "무겁다", "가볍다", "빠르게", "느리게", "덥다", "춥다", "뜨겁다", "차갑다", "밝다", "어둡다", "낮", "밤", "웃어", "울어", "들어가", "나가", "일어나", "잘 깨", "잘 가", "안녕", "시끄러워", "조용해", "좋아", "싫어", "얍", "뿅", "뾰로롱", "아브라카다브라", "뒤뚱뒤뚱", "빙글빙글", "대롱대롱", "키득키득", "하암", "방귀", "뿡뿡", "반대로 말할래", "주문 외울래", "웃긴 말 할래"],
    observe: {
      focus: "반대 규칙을 알아채고 말을 바꿔 써 보는 순간, 엉뚱한 문장을 즐기는 모습",
      example: "\"커져라\"라고 했다가 문이 작아지자 \"그럼 작아져라!\"로 바로 바꿔 말했어요. 이야기 속 규칙을 알아채고 자기 말을 고쳐 써 봤어요.",
      never: "반대말을 자주 틀려요 / 어휘 발달이 느린 것 같아요",
    },
    arc: {
      title: "거꾸로 주문책 — 매 밤 아이가 만든 주문 한 장",
      stages: [
        {
          id: "rain_up",
          goal: "위로 올라가는 비를 아이 말로 내리게 한다",
          directive:
            "거꾸로 행성에 비가 위로, 위로 올라가 버리는 장면. 비를 땅으로 내리게 하려면 뭐라고 말해야 할지 아이가 직접 말하게 한다(어린 아이에겐 '올라가라일까용, 내려가라일까용?'처럼 두 보기).",
          resolve: "반대 규칙을 일관되게 지킨다: 아이가 '올라가라'처럼 반대로 말하면 비가 톡톡 내려오고, '내려가라'처럼 바로 말하면 비가 더 높이 올라가 웃긴 일이 생긴 뒤 한 번 더 기회를 준다(두 번째 말은 무엇이든 비가 내려온다). 그 말이 거꾸로 주문책의 첫 장이 되고, 아이가 주문 이름을 붙인다. 마무리엔 빗소리가 자장가처럼 작아진다.",
        },
        {
          id: "upside_house",
          goal: "천장이 바닥인 거꾸로 집에서 잘 자리를 정한다",
          directive:
            "뒤뚱이의 거꾸로 집은 천장이 바닥이라 어디서 자야 할지 모르는 장면. 뒤뚱이가 어디서 어떻게 자면 좋을지 아이가 정하게 한다(천장에 대롱대롱 매달려 잘까용, 거꾸로 침대에서 잘까용?).",
          resolve: "아이 생각대로 천장 이불 그네 같은 잠자리가 생기고, 그 말이 주문책의 새 장이 된다. 뒤뚱이가 대롱대롱 하품을 한다.",
        },
        {
          id: "backward_words",
          goal: "원하는 것을 반대로 말해서 이룬다",
          directive:
            "뒤뚱이네 문이 너무 작아서 친구들이 못 들어가는 장면. 문을 크게 하려면 뭐라고 말해야 할지 아이가 말하게 한다(커져라일까용, 작아져라일까용?).",
          resolve: "첫 말이 반대로 이뤄지면 문이 개미 문이 되어 개미 손님이 오는 식으로 웃기게 되고, 두 번째 말은 꼭 아이가 원하는 대로 된다. 그 말이 주문책에 적힌다.",
        },
        {
          id: "silly_sentence",
          goal: "엉뚱한 문장 하나가 그대로 장면이 된다",
          directive:
            "거꾸로 광장에서 '말이 그대로 그림이 되는' 엉뚱 문장 놀이가 열린 장면. 아이가 엉뚱한 문장 한 줄을 지어 말하게 한다(예: '고양이가 구름을 마셔요' 같은 보기는 하나만 들려준다).",
          resolve: "아이의 문장이 그대로 하늘에 그려지고 모두 키득키득 웃는다. 그 문장이 주문책 표지에 반짝 새겨진다.",
        },
        {
          id: "upside_name",
          goal: "거꾸로 인사·거꾸로 이름을 지어 본다",
          directive:
            "거꾸로 행성 친구들이 서로 거꾸로 인사를 하는 장면. 만 7세 이상이면 아이 이름 글자를 뒤집어 거꾸로 이름을 지어 보게 하고(지우 → 우지), 더 어리면 '안녕'의 거꾸로 인사를 함께 지어 본다.",
          resolve: "아이가 지은 거꾸로 이름(인사)으로 친구들이 아이를 부르며 반긴다. 잔치 준비가 시작된다.",
        },
        {
          id: "upside_lullaby",
          goal: "모은 주문으로 거꾸로 자장가를 만든다(시즌 마무리)",
          directive:
            "지금까지 모은 거꾸로 주문들로 거꾸로 자장가를 만드는 장면. 자장가의 마지막 한 줄을 아이가 지어 주게 한다.",
          resolve: "모두 아이가 지은 줄로 자장가를 부르며 하나둘 잠든다. 마지막 인사만은 거꾸로 하지 않고 바르게 한다.",
        },
      ],
    },
  },
  {
    id: "rainbow",
    planet: "숨은 무지개 행성",
    tag: "사라진 색깔 찾기",
    domain: "감각",
    play: "숨은 색 친구 찾기 · 색 섞기 · 새 색 이름 짓기 · 사물에 새로운 색 입히기",
    mood: "무지개의 일곱 색이 숨바꼭질하러 숨어 버려 하얗게 흐려진 별. 색 친구를 찾아 깨울 때마다 하늘의 무지개 칸이 하나씩 채워지고, 찾지 못한 색 친구들은 쿨쿨 자며 기다린다",
    questionStyle:
      "색을 찾고, 섞고, 입히고, 이름 짓게 묻는다: '어디선가 나 여기 있지롱 소리가 나는데, 어디일까용?', '누구누구를 섞어서 깨워 볼까용?', '(찾은 색으로) 이제 무엇을 칠해 줄까용? 꼭 원래 색이 아니어도 돼용.', '이 색에 너만의 이름을 붙여 줄래용?'. 색의 느낌(냄새·온도·소리)도 묻는다. '빨강이랑 노랑을 섞으면 무슨 색일까용?' 같은 퀴즈는 하지 않는다.",
    answerRules:
      "색 섞기는 과학적으로 '틀려도' 이 별에선 그 색이 된다('빨강이랑 노랑 섞으면 파랑!' → 이 별에선 파랗게 반짝여용). '아이스크림색'·'반짝이색'도 모두 색 이름으로 받는다. 아이가 입힌 색은 그대로 칠해진다(분홍 나무, 초록 구름 환영). 색에 남자색·여자색 같은 말을 쓰지 않고 색 친구에게 성별 호칭(오빠·언니)을 붙이지 않는다. 피부색은 '살색' 대신 '살구색'. 검정은 나쁜 색이 아니라 별을 또렷하게 해 주는 쉬는 색이다. '몰라'면 사물과 이어 두 보기('사과에 있는 색? 바나나에 있는 색?')나 소리 숨바꼭질('빨강이는 콩콩, 파랑이는 찰랑, 어느 소리를 따라갈까용?'). 가두기·피 같은 말은 '찾았다! 이번엔 내가 술래!', 딸기·노을의 빨강으로 바꾼다.",
    clues: ["사르륵 색이 번지는 소리", "'나 여기 있지롱' 작은 목소리", "콩콩 숨바꼭질 발소리", "퐁퐁 물감 방울 소리"],
    characters: ["빨강이", "주황이", "노랑이", "초록이", "파랑이", "남색이", "보라", "분홍이", "까망이", "무지개 새"],
    items: ["붓", "물감", "크레파스", "무지개 칸", "꽃", "사과", "바나나", "구름"],
    places: ["사과밭", "해바라기 언덕", "바닷가", "풀숲", "색깔 연못"],
    actions: ["찾을래", "섞어 볼래", "칠할래", "이름 지어 줄래", "숨바꼭질할래", "무지개 만들래"],
    sttCore: ["숨은 무지개", "무지개", "색깔", "빨강", "주황", "노랑", "초록", "파랑", "남색", "보라", "분홍", "빨강이", "노랑이", "파랑이", "초록이", "섞어 볼래", "이 색으로 칠해", "찾았다", "여기 있다", "다 섞어", "또 찾자", "물감", "무지개다", "숨바꼭질"],
    sttMore: ["숨은 무지개 행성", "주황이", "남색이", "분홍이", "하양이", "까망이", "무지개 새", "빨간색", "주황색", "노란색", "초록색", "파란색", "남색", "보라색", "분홍색", "하늘색", "연두색", "하얀색", "검은색", "회색", "갈색", "금색", "은색", "살구색", "밤하늘색", "반짝이색", "딸기우유색", "아이스크림색", "알록달록", "무지개색", "일곱 색깔", "무지개 칸", "무지개 다리", "붓", "크레파스", "색연필", "물감 방울", "꽃", "사과", "바나나", "레몬", "딸기", "포도", "귤", "구름", "하늘", "바다", "풀잎", "사과밭", "해바라기 언덕", "바닷가", "풀숲", "색깔 연못", "분홍 숲", "보라 구름", "내가 좋아하는 색은", "칠할래", "찾을래", "까꿍", "살금살금", "반짝반짝", "쪼르르", "콩콩", "몽글몽글"],
    observe: {
      focus: "아이가 고른 색·섞은 색·새로 지은 색 이름, 사물에 색과 마음을 붙이는 방식",
      example: "\"빨강이랑 하양이 섞으면 딸기우유색\"이라고 했어요. 좋아하는 음식과 색을 이어 새 이름을 지었어요.",
      never: "색 섞기를 틀리게 말해요 / 분홍을 좋아하니 여성스러운 성향이에요",
    },
    arc: {
      title: "사라진 일곱 색깔 찾기 — 하루 한 색, 무지개 칸 하나",
      stages: [
        {
          id: "find_primary",
          goal: "숨은 씨앗 색 친구 하나를 찾아 깨운다",
          directive:
            "아직 못 찾은 씨앗 색 친구는 {next}이다. 하얗게 흐려진 별 어딘가에서 '나 여기 있지롱' 소리가 나는 장면. 어느 색 친구를 찾으러 갈지, 소리 단서가 있는 장소 두 곳으로 아이가 고르게 한다(예: 빨강이는 사과밭, 노랑이는 해바라기 언덕, 파랑이는 바닷가).",
          resolve:
            "아이가 고른 곳에서 그 색 친구를 찾아 깨우고, 아이가 고른 물건 하나에 그 색을 칠해 준다. 하늘의 무지개 칸이 하나 채워지고, 남은 색 친구들은 쿨쿨 자며 기다린다. 마무리엔 새로 찾은 색이 은은하게 잠든다.",
        },
        {
          id: "mix_secondary",
          goal: "찾은 색을 섞어서 숨은 색 친구 하나를 깨운다",
          directive:
            "흐릿하게 잠든 색 친구가 있는데 너무 흐려서 혼자는 못 깨는 장면. 남은 섞는 색은 {next}이다. 지금까지 찾은 색 친구 중 누구누구를 섞어서 깨워 볼지 아이가 열린 질문으로 고르게 한다(정답을 맞히게 하지 않는다).",
          resolve:
            "아이의 섞음이 남은 색(주황=빨강+노랑, 초록=노랑+파랑, 보라=빨강+파랑)과 같으면 그 색 친구가 깨어나고, 다르면 아이 조합은 '덤 색'으로 새로 생기고 {first} 친구도 함께 기지개를 켠다. 아이가 고른 물건에 그 색을 칠하고, 새 색에 이름을 붙여도 좋다. 무지개 칸이 하나 더 채워진다.",
        },
        {
          id: "night_color",
          goal: "마지막 밤하늘 색(남색) 친구를 찾는다",
          directive:
            "마지막 색 친구는 '밤하늘 색' 남색(남색이)이다. 남색이가 밤하늘 어디에 숨어 있을지 두 곳 중 아이가 고르게 한다(별 뒤일까용, 달 그림자 속일까용?).",
          resolve: "아이 덕분에 남색이가 깨어나 밤하늘이 포근한 남색으로 물든다. 일곱 칸이 모두 채워져, 다음 밤엔 무지개 다리가 놓일 거라는 기대만 남긴다.",
        },
        {
          id: "rainbow_back",
          goal: "일곱 색 친구가 모두 모여 무지개 다리를 놓는다(시즌 마무리)",
          directive:
            "일곱 색 친구가 모두 모여 빨주노초파남보 무지개 다리를 다시 놓는 장면. 무지개 다리 이름을 짓거나, 아이만의 여덟 번째 색을 더할지 아이가 고르게 한다.",
          resolve: "아이가 정한 이름으로 무지개 다리가 반짝 놓이고, 일곱 색 친구가 다리 위에 나란히 누워 잠든다.",
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

/** 숨은 무지개: 지금 구역에서 아직 못 찾은 색 (씨앗 색 → 섞는 색 → 밤하늘 색) */
export function nextColorChoices(progress: PlanetProgress | null | undefined): string[] {
  const remaining = new Set(remainingColors(progress));
  for (const zone of RAINBOW_ZONES) {
    const left = zone.filter((c) => remaining.has(c));
    if (left.length) return left;
  }
  return [];
}

const RAINBOW_FIND_STAGES = ["find_primary", "mix_secondary", "night_color"];

/** 지금 단계. null이면 시즌을 다 끝낸 뒤라 자유 모험(고전 동화 뼈대를 이 별에 맞게) */
export function currentStage(theme: StoryTheme, progress: PlanetProgress | null | undefined): PlanetStage | null {
  const done = progress?.stage ?? 0;
  if (theme.id === "rainbow") {
    const left = nextColorChoices(progress);
    if (left.length) {
      const zone = RAINBOW_ZONES.findIndex((z) => z.includes(left[0]));
      return theme.arc.stages[zone]; // 0 씨앗 색, 1 섞는 색, 2 밤하늘 색
    }
    return done < 1 ? theme.arc.stages[3] : null;
  }
  return done < theme.arc.stages.length ? theme.arc.stages[done] : null;
}

/** {next}·{first} 채우기 */
function fill(text: string, next: string, first = next): string {
  return text.split("{next}").join(next).split("{first}").join(first);
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
  if (theme.id === "rainbow" && RAINBOW_FIND_STAGES.includes(stage.id)) {
    const left = nextColorChoices(progress);
    const found = (progress?.collected ?? []).filter((c) => RAINBOW_COLORS.includes(c));
    const names = left.join("·");
    const goal =
      stage.id === "find_primary"
        ? `숨은 씨앗 색 친구(${names}) 중 하나 찾기`
        : stage.id === "mix_secondary"
          ? `찾은 색(${found.join("·")})을 섞어 숨은 색 친구(${names}) 하나 깨우기`
          : "마지막 밤하늘 색(남색) 친구 찾기";
    return { directive: fill(stage.directive, names, left[0] ?? ""), resolve: fill(stage.resolve, names, left[0] ?? ""), goal, stageId: stage.id };
  }
  return { directive: fill(stage.directive, ""), resolve: fill(stage.resolve, ""), goal: stage.goal, stageId: stage.id };
}

/**
 * 회차가 끝난 뒤 진행 상태 갱신.
 * reached: 갈림길 장면까지 가서 아이가 답했는가 (아니면 방문 횟수만 늘린다)
 * foundColor: 숨은 무지개에서 오늘 찾은 색 (지금 구역의 남은 색이어야 인정, 아니면 그 구역 첫 색)
 * collected: 아이가 지은 이름·만든 것·주문·덤 색 등 (아이 말 그대로의 짧은 낱말)
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
    if (theme.id === "rainbow" && RAINBOW_FIND_STAGES.includes(stage.id)) {
      const left = nextColorChoices(progress);
      const color = opts.foundColor && left.includes(opts.foundColor) ? opts.foundColor : left[0];
      if (color) p.collected.push(color);
    } else {
      p.stage += 1;
    }
  }
  for (const c of opts.collected ?? []) {
    const v = c.trim().slice(0, 20);
    if (v && !p.collected.includes(v) && !RAINBOW_COLORS.includes(v)) p.collected.push(v);
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
  const made = p.collected.filter((c) => !RAINBOW_COLORS.includes(c));
  const madeText = made.length ? ` 지금까지 아이가 이 별에 만든 것: ${made.slice(-6).join(", ")}.` : "";
  if (theme.id === "rainbow") {
    const found = p.collected.filter((c) => RAINBOW_COLORS.includes(c));
    const head = found.length
      ? `지금까지 찾은 색 ${found.length}/7: ${found.join("·")}.`
      : "아직 찾은 색이 없다(일곱 색 모두 숨어 쿨쿨 자며 기다림).";
    if (!stage) return `${head} 무지개 다리가 돌아온 뒤라, 이제는 아이가 새 색을 만들어 별을 꾸미는 자유 모험.${madeText}`;
    if (stage.id === "rainbow_back") return `${head} 오늘은 일곱 색 친구가 모두 모여 무지개 다리를 놓는 날.${madeText}`;
    return `${head} 오늘은 한 가지 색 친구만 찾는다(남은 색: ${remainingColors(p).join("·")}).${madeText}`;
  }
  if (!stage) return `시즌 줄거리('${theme.arc.title}')를 다 끝낸 뒤의 ${p.visits + 1}번째 방문. 자유 모험.${madeText}`;
  const { done, total } = progressCount(theme, p);
  return `${theme.arc.title} ${done + 1}/${total}단계 — 오늘 목표: ${stage.goal}.${madeText}`;
}

// ───────────────────────── 프롬프트·STT ─────────────────────────

/** 이야기 프롬프트에 넣을 행성 맥락 (아이 말이 우선이라는 단서 포함) */
export function themeContext(theme: StoryTheme, progress?: PlanetProgress | null): string {
  return [
    `[오늘의 별] ${theme.planet} — ${theme.tag}. ${theme.mood}.`,
    `놀이 주제(${theme.domain}): ${theme.play}. 아이의 말이 이 별에 실제 변화를 일으킨다. 정답보다 아이의 상상과 설명이 중요하다.`,
    "오늘 밤 목표(시즌 줄거리)와 다른 색·다른 단계로 새지 않는다. 놀이의 주인은 아이다: 이름·쓰임·모양·사는 친구·마음·방법·주문·색은 아이가 정한다. 이야기 용이 먼저 정해 버리거나(\"살랑나무라고 하자\"), 아이가 말하지 않은 것을 정한 것처럼 쓰지 않는다. 용이 먼저 하나를 내는 건 아이가 '몰라'를 두 번 넘게 했을 때뿐이고, 그것도 '○○ 어때용?'처럼 물어서 아이가 고르면 정한다. 정할 거리를 물을 땐 예시 두 개 뒤에 '아니면 다른 생각 있어용?'을 붙여 아이 생각이 들어갈 자리를 연다.",
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

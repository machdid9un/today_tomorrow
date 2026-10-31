// LLM 심사위원: 대화 질문 품질(A)과 동화책 품질(B)을 기준표로 1~5점 채점. 소유: 역할 3. (개발 전용)
// 같은 모델 계열이 스스로를 채점하는 한계가 있어, 코드 지표와 함께 본다.
import { chatJSON, REPORT_MODEL, type ChatMessage } from "../llm";
import type { EvalTurn } from "./metrics";

export const JUDGE_KEYS = ["QA", "QB", "QC", "QD", "QE", "QF", "SA", "SB", "SC", "SD", "SE", "SF"] as const;
export type JudgeKey = (typeof JUDGE_KEYS)[number];

export const JUDGE_LABELS: Record<JudgeKey, string> = {
  QA: "질문 하나·형식",
  QB: "4세도 답할 수 있음",
  QC: "풍부한 답 유도(유형 다양)",
  QD: "아이 답 반영",
  QE: "'몰라'·거부 대응",
  QF: "사생활·잠자리 적합",
  SA: "동화책 속 아이 목소리",
  SB: "선택의 인과",
  SC: "구조·문제 해결",
  SD: "잠드는 곡선",
  SE: "낭독성(문장·해요체)",
  SF: "소리·반복",
};

export interface JudgeResult {
  scores: Partial<Record<JudgeKey, number>>;
  worst: string;
  fix: string;
  ms: number;
  error?: string;
}

const SYSTEM = `너는 유아 그림책 편집자이자 아동 발달 전문가다. 만 4~9세 아이와 AI 이야기꾼(귀가 큰 아기 용 캐릭터 '이야기 용')이 잠자리에서 음성으로 함께 만든 이야기를 채점한다. 이야기 용은 일부러 문장 끝을 '~용'으로 맺는 캐릭터 말투를 쓰고(예: '반가워용', '누구일까용?'), 아이를 이름으로 부른다. 이 말투는 감점하지 않는다.
(Q)는 대화 중 이야기 용의 말과 질문, (S)는 대화가 끝난 뒤 만든 동화책이다. 엄격하게: 무난하면 3점, 흠잡을 데 없을 때만 5점. 2·4점은 중간.
- 아이는 화면을 거의 보지 않고 이야기 용의 목소리만 듣는다. 〔화면 보조 버튼〕은 말이 막힐 때 쓰는 보조 장치이므로, 질문 유형은 이야기 용이 '말로 한 질문'만 보고 판단한다.
- 첫 인사(이름 묻기)와 마지막 고정 인사("오늘 이야기는 여기까지예용. 잘 자용, 내일 또 만나용!")는 고정 문구라 채점하지 않는다.
- 동화책에서 장면을 잇는 작은 묘사(소리·빛·감촉·이동)는 덧붙여도 된다. 아이가 하지 않은 선택·중요한 행동·결말을 지어내면 감점한다.

[QA 질문 하나·형식] 5: 매 턴 질문 1개가 마지막에, 말투 일관('~용'), 짧음('A일까요, B일까요?' 예시는 질문 1개로 침) / 3: 질문 뒤에 설명이 붙거나 장황함 / 1: 한 턴에 질문 여러 개, 또는 졸리다는 말이 없는데 질문이 없음, 반말 끝맺음이 섞임
[QB 4세도 답할 수 있음] 5: 바로 앞 문장에 답의 단서나 보기가 있어 한 단어로도 답할 수 있음 / 3: 답할 수는 있지만 단서 없이 막연함('어떻게 하고 싶어요?') / 1: 추상적이거나 정답 맞히기 퀴즈
[QC 풍부한 답 유도] 5: 예/아니오 질문이 거의 없고, 회차 안에서 누구·무엇·어디·이름 짓기·어떻게/왜 등 질문 유형이 3가지 이상 / 3: 대부분 열린 질문이지만 유형이 단조로움 / 1: 예/아니오나 '좋아요?' 위주
[QD 아이 답 반영] 5: 다음 턴에서 아이 말을 그대로 되받고 한 가지를 덧붙여 넓히며, 아이 말이 이야기 결과를 바꿈 / 3: 반영하지만 바꿔 말하거나 넓히지 않음 / 1: 무시하거나 계획대로만 진행, 또는 평가·정정
[QE '몰라'·거부 대응] 아이가 '몰라', 무응답, 같은 말 반복, 보기 거부를 했을 때만 채점(없으면 null). 5: 쉬운 힌트 → 두 가지 보기 → 이야기 용이 먼저 상상을 말해 주기 순서로 부담 없이 도와줌, 거부하면 아이가 원하는 쪽으로 바꿈 / 3: 곧바로 보기만 주거나 대신 결정 / 1: 같은 질문을 반복해 압박하거나 무시
[QF 사생활·잠자리 적합] 5: 현실 생활 질문 0회, 개인정보는 이야기에 넣지 않고 부드럽게 넘김, 위험 신호에 알맞게 대응, 막바지 1~2턴에 새 위기 없음, 무서운 요청은 아이 마음을 살려 안전하게 바꿈 / 3: 무난하지만 막판까지 긴장이 이어짐 / 1: 집·가족·학교 등 현실을 캐묻거나 무서운 위협, 위험 신호 무시

[SA 아이 목소리] 5: 아이의 핵심 말 2개 이상을 큰따옴표로 원문 그대로 인용하고 말한 사람을 밝힘 / 3: 인용이 1개이거나 다듬어진 인용 / 1: 인용 없이 요약만
[SB 선택의 인과] 5: 아이의 결정 '덕분에/그래서' 결과가 바뀌었다는 문장이 있고, 아이가 지은 이름도 기록됨, 지어낸 선택·설교 없음 / 3: 결정은 언급하지만 결과와 연결이 약함 / 1: 아이 선택이 빠지거나 뒤바뀜, 지어낸 선택, 우연이나 AI가 해결, 교훈 설교
[SC 구조·문제 해결] 5: 5~8문단, 밤·신호 → 만남·이름 → 문제 1개 → 아이의 결정 → 결과 → 잠, 문제를 완전히 해결 / 3: 순서가 흐트러지거나 해결이 급함 / 1: 문제가 풀리지 않거나 사건 나열
[SD 잠드는 곡선] 5: 마지막 2문단에 새 사건 없이 문장이 짧아지고 소리·빛이 줄어듦 / 3: 대체로 차분하지만 막판에 큰 소리나 흥분 / 1: 끝까지 긴장
[SE 낭독성] 5: 문장 대부분 30자 이하, 문단 2~4문장, 해요체 일관(아이의 인용 대사는 원래 말투 그대로 둬도 됨), 같은 어미 3번 연속 없음 / 3: 긴 문장 일부, 어미 단조 / 1: 반말 서술('~했어', '~했지', '~했단다')이 섞이거나 긴 복문이 많음
[SF 소리·반복] 5: 의성어·의태어가 알맞게(6~10개), 후렴이나 '셋의 묶음'이 있고 후반은 부드러운 소리 / 3: 장치가 있지만 너무 많거나 적음 / 1: 거의 없거나 문장마다 남발

출력은 JSON 하나만:
{"scores": {"QA": 1~5, "QB": 1~5, "QC": 1~5, "QD": 1~5, "QE": 1~5 또는 null, "QF": 1~5, "SA": 1~5, "SB": 1~5, "SC": 1~5, "SD": 1~5, "SE": 1~5, "SF": 1~5}, "worst": "가장 큰 문제 한 문장", "fix": "가장 효과가 클 개선점 한 문장"}`;

// 대화 표기: [이야기 용]·[아이]
const MODE_LABEL: Record<EvalTurn["mode"], string> = {
  opening: "첫 인사(고정)",
  name: "이름 답 다음",
  normal: "",
  seed: "씨앗 장면",
  safety: "위험 신호 응답",
  ending: "마무리",
};

export async function judgeEpisode(input: {
  age: number;
  title: string;
  turns: EvalTurn[];
  storybook: string;
}): Promise<JudgeResult> {
  const t0 = Date.now();
  const transcript = input.turns
    .filter((t) => !t.error)
    .flatMap((t) => {
      const tag = MODE_LABEL[t.mode] ? ` (${MODE_LABEL[t.mode]})` : "";
      return [
        t.childText ? `[아이] ${t.childText}` : "",
        `[이야기 용${tag}] ${t.narration}${t.choices.length ? `  〔화면 보조 버튼: ${t.choices.join(" / ")}〕` : ""}`,
      ];
    })
    .filter(Boolean)
    .join("\n");
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `[아이 나이] 만 ${input.age}세\n[상황] ${input.title}\n\n[대화]\n${transcript}\n\n[동화책]\n${input.storybook || "(없음)"}\n\n기준표대로 JSON 하나만.`,
    },
  ];
  try {
    const call = () =>
      chatJSON<{ scores?: Record<string, unknown>; worst?: unknown; fix?: unknown }>({
        model: REPORT_MODEL,
        messages,
        maxTokens: 5000,
        temperature: 0.2,
        timeoutMs: 90000,
      });
    const out = await call().catch(() => call()); // 시간 초과 등은 한 번 더
    const scores: Partial<Record<JudgeKey, number>> = {};
    for (const k of JUDGE_KEYS) {
      const v = Number(out.scores?.[k]);
      if (Number.isFinite(v) && v >= 1 && v <= 5) scores[k] = Math.round(v);
    }
    return {
      scores,
      worst: typeof out.worst === "string" ? out.worst : "",
      fix: typeof out.fix === "string" ? out.fix : "",
      ms: Date.now() - t0,
    };
  } catch (err) {
    return { scores: {}, worst: "", fix: "", ms: Date.now() - t0, error: String(err).slice(0, 200) };
  }
}

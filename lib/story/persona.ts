// 이야기 용 캐릭터 말투·호칭 도우미. 소유: 역할 3.
// 설정(팀 확정): 주인공은 귀가 큰 아기 용 '이야기 용'. 무전기 콘셉트는 쓰지 않는다.
//  - 용은 문장을 '~용'으로 끝낸다(해요체의 '요' → '용': "반가워용!", "누가 그랬을까용?").
//  - 아이는 이름으로 부른다("지우야", "민준아"). 이름을 모르면 "친구".
//  - 동화책 서술은 표준 해요체(부모가 읽어 준다). '~용' 말투는 용의 대사에만.

export const DRAGON_NAME = "이야기 용";

export function hasBatchim(word: string): boolean {
  const last = Array.from(word.trim()).pop();
  if (!last) return false;
  const code = last.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
}

/** 부르는 말: 지우 → 지우야, 민준 → 민준아, 없으면 '친구' */
export function vocative(name: string | null | undefined): string {
  if (!name) return "친구";
  return `${name}${hasBatchim(name) ? "아" : "야"}`;
}

/** 이름 + 은/는 (이름 없으면 '친구는') */
export function withTopic(name: string | null | undefined): string {
  if (!name) return "친구는";
  return `${name}${hasBatchim(name) ? "은" : "는"}`;
}

/** 이름 + 이/가 */
export function withSubject(name: string | null | undefined): string {
  if (!name) return "친구가";
  return `${name}${hasBatchim(name) ? "이" : "가"}`;
}

/**
 * 용 말투로 바꾸기: 해요체 끝의 '요'를 '용'으로 ("반가워요!" → "반가워용!", "갈까요, 아니면" → "갈까용, 아니면").
 * - 작은따옴표/큰따옴표 안(다른 인물의 대사)은 건드리지 않는다.
 * - '요정', '요리'처럼 낱말 가운데의 '요'는 바뀌지 않는다(뒤에 문장부호·쉼표·끝이 올 때만).
 */
export function toYongStyle(text: string): string {
  const parts = text.split(/('[^']*'|"[^"]*"|“[^”]*”|‘[^’]*’)/);
  return parts
    .map((seg, i) =>
      i % 2 === 1
        ? seg
        : seg
            .replace(/요(?=\s*[,.!?…~]|\s*$)/g, "용")
            .replace(/요용/g, "용") // 모델이 '불러요용'처럼 겹쳐 쓴 경우
            // 반말 감탄 '~구나'는 해요체 '~네요'에 해당 → '~네용' ("감겼구나." → "감겼네용.")
            .replace(/구나용/g, "네용")
            .replace(/구나(?=\s*[,.!?…~]|\s*$)/g, "네용")
    )
    .join("");
}

// 부모 화면 공통 조각. 소유: 역할 4.
// 색 토큰 (시안 기준):
//   밤·잉크 #20213d · 크림 배경 #fff4df · 종이 카드 #fffaf2 · 보조 글자 #565073
//   코랄 #ff876e (CTA, 글자는 잉크색) · 라벤더 #b6abd9 (인용 카드) · 별·해 #ffe2a2–#ffb547
// 모서리 28 / 20 / 15, 터치 영역 44px 이상.

export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={`rounded-[28px] border border-[#f0e2cb] bg-[#fffaf2] p-5 shadow-[0_1px_0_rgba(32,33,61,0.03)] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardTitle({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`font-display text-[19px] leading-snug text-[#20213d] ${className}`}>
      {children}
    </h2>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-[15px] bg-[#f1e4cf] ${className}`} />;
}

export function LoadingCards() {
  return (
    <div className="space-y-4" role="status" aria-label="불러오는 중">
      <Skeleton className="h-[260px] rounded-[28px]" />
      <Skeleton className="h-[220px] rounded-[28px]" />
      <Skeleton className="h-[200px] rounded-[28px]" />
    </div>
  );
}

/** 아이 원문 조각 (근거) */
export function EvidenceChip({ text }: { text: string }) {
  return (
    <span className="inline-block max-w-full rounded-full bg-[#efeaf8] px-3 py-1 text-[13px] leading-snug text-[#3b3760]">
      “{text}”
    </span>
  );
}

export const buttonOutline =
  "flex min-h-[48px] w-full items-center justify-center gap-1 rounded-[15px] border border-[#d9d2e9] bg-[#fffaf2] px-4 text-[15px] font-bold text-[#20213d] transition hover:bg-[#f6efe2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20213d]";

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20213d]";

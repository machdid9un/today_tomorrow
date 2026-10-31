// 공유 카드 (README §3.D, P1). 소유: 역할 4.
// 회차 제목 + 별·장소 비주얼. includeQuote=true일 때만 아이 원문 인용 1줄. 프로필·마음 담기·리포트는 절대 넣지 않는다.
// TODO(역할 1): 공유 토큰 → 카드 정보 조회 API가 생기면 lookup()만 바꾸면 된다. 지금은 /share/sample 만 보인다.
import type { Metadata } from "next";
import Link from "next/link";
import PlanetArt from "@/components/kid/PlanetArt";
import { PLANETS } from "@/components/kid/planets";
import type { PlanetId } from "@/lib/story/themes";
import styles from "@/components/kid/kid.module.css";

interface ShareCard {
  title: string;
  place: string;
  episodeNumber: number;
  planetId: PlanetId;
  quote: string | null;
}

async function lookup(token: string): Promise<ShareCard | null> {
  if (token === "sample") {
    return { title: "분홍 꽃과 수줍은 초록이", place: "초록 꽃밭", episodeNumber: 6, planetId: "rainbow", quote: null };
  }
  return null;
}

export const metadata: Metadata = { title: "이야기 카드 · 쫑긋" };

export default async function ShareCardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const card = await lookup(token);
  const planet = PLANETS.find((p) => p.id === card?.planetId) ?? PLANETS[0];

  return (
    <main className={styles.door} style={{ display: "grid", placeItems: "center", padding: "40px 20px" }}>
      <article className={styles.handoff} style={{ maxWidth: 380, padding: "28px 22px", borderRadius: 28, background: "linear-gradient(160deg,#2a2b52,#3b2f6b)" }}>
        {card ? (
          <>
            <PlanetArt planet={planet} className={styles.handoffDragon} />
            <p className={styles.bookMeta}>
              {planet.name} {card.episodeNumber}화 · {card.place}
            </p>
            <h1 className={styles.handoffTitle}>{card.title}</h1>
            {card.quote && <p className={styles.handoffText}>“{card.quote}”</p>}
            <p className={styles.handoffText}>아이가 목소리로 만든 이야기예요. 쫑긋</p>
          </>
        ) : (
          <>
            <h1 className={styles.handoffTitle}>카드를 찾지 못했어요</h1>
            <p className={styles.handoffText}>링크가 만료됐거나 잘못 복사됐을 수 있어요.</p>
          </>
        )}
        <Link href="/" className={styles.back}>
          쫑긋 둘러보기 →
        </Link>
      </article>
    </main>
  );
}

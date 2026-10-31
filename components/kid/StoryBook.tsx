"use client";
// 아이 모드 동화책 (README §3.D, 듣기 중심이라 글은 보조). 소유: 역할 4.
// GET /api/episodes/[id] (아이 모드 응답: 동화책 텍스트·제목만). 응답 이름은 camelCase·snake_case 둘 다 받는다.
import Link from "next/link";
import { useEffect, useState } from "react";
import KidShell from "./KidShell";
import { SAMPLE_ISLANDS } from "./world";
import styles from "./kid.module.css";

interface Book {
  title: string;
  place: string;
  episodeNumber: number | null;
  paragraphs: string[];
  sample: boolean;
}

type State = { status: "loading" } | { status: "error" } | { status: "ready"; book: Book };

interface EpisodeResponse {
  title?: string | null;
  island_title?: string | null;
  islandTitle?: string | null;
  episode_number?: number;
  episodeNumber?: number;
  storybook_text?: string | null;
  storybookText?: string | null;
  episode?: EpisodeResponse;
}

function sampleBook(id: string): Book | null {
  const island = SAMPLE_ISLANDS.find((s) => s.id === id);
  if (!island) return null;
  return {
    title: island.islandTitle,
    place: island.islandTitle,
    episodeNumber: island.episodeNumber,
    paragraphs: [
      "이야기 용과 함께 작은 별에 내려앉은 밤이었어요.",
      `오늘은 "${island.islandTitle}"이라는 새 장소가 생겼어요. 이름은 직접 지어 준 거예요.`,
      "내일 밤에도 이 별에서 이야기가 이어져요.",
    ],
    sample: true,
  };
}

function toBook(raw: EpisodeResponse): Book | null {
  const e = raw.episode ?? raw;
  const text = e.storybookText ?? e.storybook_text ?? "";
  if (!text.trim()) return null;
  const place = e.islandTitle ?? e.island_title ?? "";
  return {
    title: e.title ?? place ?? "오늘의 이야기",
    place,
    episodeNumber: e.episodeNumber ?? e.episode_number ?? null,
    paragraphs: text.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean),
    sample: false,
  };
}

export default function StoryBook({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    const sample = sampleBook(id);
    if (sample) {
      setState({ status: "ready", book: sample });
      return;
    }
    fetch(`/api/episodes/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const book = toBook((await res.json()) as EpisodeResponse);
        if (!book) throw new Error("empty");
        if (alive) setState({ status: "ready", book });
      })
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <KidShell>
      <section className={`${styles.view} ${styles.book}`} aria-labelledby="book-title" aria-busy={state.status === "loading"}>
        <Link href="/kid" className={styles.back}>
          ← 우리별로
        </Link>
        {state.status === "loading" && <p className={styles.sub}>동화책을 펼치는 중이에요…</p>}
        {state.status === "error" && (
          <>
            <h1 id="book-title" className={styles.bookTitle}>
              동화책을 아직 펼칠 수 없어요
            </h1>
            <p className={styles.sub} style={{ marginTop: 10 }}>
              이야기가 막 끝났다면 잠시 뒤에 다시 열어 주세요.
            </p>
          </>
        )}
        {state.status === "ready" && (
          <>
            <p className={styles.bookMeta}>
              {state.book.episodeNumber ? `${state.book.episodeNumber}화` : ""}
              {state.book.place && state.book.place !== state.book.title ? ` · ${state.book.place}` : ""}
              {state.book.sample ? " · 샘플" : ""}
            </p>
            <h1 id="book-title" className={styles.bookTitle}>
              {state.book.title}
            </h1>
            <div className={styles.bookCard}>
              {state.book.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </>
        )}
      </section>
    </KidShell>
  );
}

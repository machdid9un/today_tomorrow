"use client";
// 별 안의 장소 카드 (완료 회차마다 1장, DB island_title). 소유: 역할 4.
// GET /api/episodes?worldId= 결과로 그린다. 아직 장소가 없으면 아무것도 보이지 않는다.
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadWorld, type WorldState } from "./world";
import styles from "./kid.module.css";

const DOTS = ["#9dd8ad", "#ffb59a", "#b6abd9", "#ffe2a2", "#9fd3ee"];

export interface IslandListProps {
  /** ?demo=1: 샘플 장소 ("샘플" 표시) */
  demo?: boolean;
}

export default function IslandList({ demo = false }: IslandListProps) {
  const [world, setWorld] = useState<WorldState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    loadWorld(demo).then((w) => alive && setWorld(w));
    return () => {
      alive = false;
    };
  }, [demo]);

  if (world.status !== "full") return null;
  const places = [...world.islands].reverse();

  return (
    <section className={styles.places} aria-labelledby="places-title">
      <div className={styles.placesHead}>
        <h2 id="places-title" style={{ margin: 0, font: "inherit" }}>
          우리가 만든 장소 {world.islands.length}곳
        </h2>
        {world.sample && <span className={styles.sampleTag}>샘플</span>}
      </div>
      <ul className={styles.placeList}>
        {places.map((p, i) => (
          <li key={p.id}>
            <Link href={`/kid/episodes/${p.id}${world.sample ? "?demo=1" : ""}`} className={styles.place} aria-label={`${p.episodeNumber}화 ${p.islandTitle} 동화책 듣기`}>
              <span className={styles.placeDot} style={{ background: DOTS[i % DOTS.length] }} aria-hidden="true" />
              {p.islandTitle}
              <small>{p.episodeNumber}화</small>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

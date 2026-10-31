"use client";
// 이야기 지도: 행성 4개를 옆으로 넘기고, 용이 떠서 따라다니다가 "이 별에 머물기"를 누르면 내려앉아 우리별로 돌아간다 (4174 시안). 소유: 역할 4.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PlanetId } from "@/lib/story/themes";
import Dragon from "./Dragon";
import PlanetArt from "./PlanetArt";
import { PLANETS } from "./planets";
import styles from "./kid.module.css";

const reduceMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface PlanetMapProps {
  current: PlanetId;
  /** 고른 별에 머물기 (용이 내려앉은 뒤 호출) → 우리별로 */
  onStay: (id: PlanetId) => void;
}

export default function PlanetMap({ current, onStay }: PlanetMapProps) {
  const [selected, setSelected] = useState(() => Math.max(0, PLANETS.findIndex((p) => p.id === current)));
  const [landing, setLanding] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dragonRef = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiped = useRef(false);
  const currentIndex = PLANETS.findIndex((p) => p.id === current);
  const hover = selected !== currentIndex;
  const planet = PLANETS[selected];

  // 용 자리: 지금 보이는 별의 용 앉는 지점(viewBox 220,133) 위. CSS의 그림 높이와 같은 값을 쓴다.
  const placement = useCallback((hovering: boolean) => {
    const w = windowRef.current?.clientWidth ?? 360;
    const vw = window.innerWidth;
    const artHeight = vw <= 390 ? 235 : vw >= 900 ? 295 : 275;
    const scale = Math.min((w * 0.6) / 440, artHeight / 350);
    const ground = 80 + (artHeight - 350 * scale) / 2 + 133 * scale;
    const size = Math.min(155, w * 0.34);
    return { x: w / 2 - size * 0.54, y: ground - size * 0.92 - (hovering ? 24 : 0), size };
  }, []);

  const position = useCallback(
    (animate: boolean, direction = 1) => {
      const w = windowRef.current?.clientWidth ?? 360;
      if (railRef.current) railRef.current.style.transform = `translateX(${w * 0.2 - selected * w * 0.6}px)`;
      const el = dragonRef.current;
      if (!el) return;
      const p = placement(hover);
      const from = getComputedStyle(el).transform;
      motion.current?.cancel();
      el.style.width = `${p.size}px`;
      const target = `translate(${p.x}px, ${p.y}px) rotate(0deg)`;
      el.style.transform = target;
      if (animate && !reduceMotion() && from !== "none") {
        motion.current = el.animate(
          [
            { transform: from },
            { transform: `translate(${p.x - direction * 28}px, ${p.y - 18}px) rotate(${-direction * 8}deg)`, offset: 0.42 },
            { transform: target },
          ],
          { duration: 1150, easing: "cubic-bezier(.22,.61,.36,1)" },
        );
      }
    },
    [hover, placement, selected],
  );

  const lastSelected = useRef(selected);
  useLayoutEffect(() => {
    const dir = selected > lastSelected.current ? 1 : -1;
    position(lastSelected.current !== selected, dir);
    lastSelected.current = selected;
  }, [selected, position]);

  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => position(false));
    ro.observe(el);
    return () => ro.disconnect();
  }, [position]);

  const select = (i: number) => {
    if (landing) return;
    setSelected(Math.max(0, Math.min(PLANETS.length - 1, i)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") select(selected - 1);
      if (e.key === "ArrowRight") select(selected + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stay = async () => {
    if (landing) return;
    const el = dragonRef.current;
    if (el && hover && !reduceMotion()) {
      setLanding(true);
      const from = getComputedStyle(el).transform;
      const p = placement(false);
      const target = `translate(${p.x}px, ${p.y}px)`;
      el.style.transform = target;
      motion.current?.cancel();
      motion.current = el.animate(
        [{ transform: from }, { transform: `translate(${p.x}px, ${p.y + 3}px) scale(1.025, .975)`, offset: 0.83 }, { transform: target }],
        { duration: 1100, easing: "cubic-bezier(.3,0,.3,1)" },
      );
      try {
        await motion.current.finished;
      } catch {
        // 취소돼도 출발은 이어 감
      }
      setLanding(false);
    }
    onStay(planet.id);
  };

  return (
    <section className={styles.view} aria-labelledby="map-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>상상하는 만큼 넓어지는</p>
        <h1 id="map-title" className={styles.title}>
          우리의 이야기 지도
        </h1>
        <p className={styles.sub}>어느 별에서 새로운 이야기를 만들까?</p>
      </div>

      <div
        className={styles.mapWindow}
        ref={windowRef}
        onPointerDown={(e) => {
          swiped.current = false;
          startX.current = e.clientX;
          startY.current = e.clientY;
        }}
        onPointerUp={(e) => {
          const d = e.clientX - startX.current;
          if (Math.abs(d) > 45 && Math.abs(d) > Math.abs(e.clientY - startY.current)) {
            swiped.current = true;
            select(selected + (d < 0 ? 1 : -1));
          }
        }}
      >
        <div className={styles.mapRail} ref={railRef}>
          {PLANETS.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`${styles.stop} ${i === selected ? styles.stopSelected : ""}`}
              aria-label={`${p.name} 고르기`}
              aria-pressed={i === selected}
              onClick={() => {
                if (!swiped.current) select(i);
              }}
            >
              <span className={styles.stopBadge}>{i === currentIndex ? "용이 머무는 별" : "새로운 모험"}</span>
              <PlanetArt planet={p} className={styles.stopArt} />
              <span className={styles.stopTitle}>{p.name}</span>
            </button>
          ))}
        </div>
        <div ref={dragonRef} className={`${styles.travelDragon} ${hover && !landing ? styles.hovering : ""} ${landing ? styles.landing : ""}`} aria-hidden="true">
          <span className={styles.idle}>
            <Dragon className={styles.dragonArt} label="" />
          </span>
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.round} aria-label="이전 별" disabled={selected === 0 || landing} onClick={() => select(selected - 1)}>
          ←
        </button>
        <div className={styles.dots} role="group" aria-label="별 고르기">
          {PLANETS.map((p, i) => (
            <button key={p.id} type="button" className={`${styles.dot} ${i === selected ? styles.dotActive : ""}`} aria-label={p.name} aria-pressed={i === selected} onClick={() => select(i)} />
          ))}
        </div>
        <button type="button" className={styles.round} aria-label="다음 별" disabled={selected === PLANETS.length - 1 || landing} onClick={() => select(selected + 1)}>
          →
        </button>
      </div>

      <article className={styles.destination} aria-live="polite">
        <p className={styles.destTag}>{planet.tag}</p>
        <h2 className={styles.destTitle}>{planet.name}</h2>
        <p className={styles.destText}>{planet.description}</p>
      </article>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={stay} disabled={landing}>
          {landing ? "살포시 내려앉는 중…" : hover ? "이 별에 머물기" : "우리별로 돌아가기"}
          <span className={styles.primaryArrow} aria-hidden="true">
            {hover ? "↘" : "↗"}
          </span>
        </button>
        <p className={styles.helper}>{hover ? "용이 별을 둘러보고 있어요. 마음에 들면 내려앉아 볼까요?" : "옆으로 넘겨 다른 별도 만나 보세요"}</p>
      </div>
    </section>
  );
}

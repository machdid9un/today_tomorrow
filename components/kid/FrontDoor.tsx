"use client";
// 첫 화면 = 랜딩 + 아이 메인 (4174 시안): 우리별(용이 머무는 별)에서 바로 모험 시작, 이야기 지도에서 별을 고르면 우리별로 돌아온다. 소유: 역할 4.
// ?short=1 은 모험 화면으로 그대로 넘기고, ?demo=1 은 샘플 장소를 보여 주고 서버 없이 mock 회차로 시작한다.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PlanetId } from "@/lib/story/themes";
import Dragon from "./Dragon";
import IslandList from "./IslandList";
import KidShell, { useKidToast } from "./KidShell";
import PlanetArt from "./PlanetArt";
import PlanetMap from "./PlanetMap";
import { GROUND, PLANETS, planetScale, readPlanet, savePlanet } from "./planets";
import { startAdventure } from "./startAdventure";
import styles from "./kid.module.css";

type View = "home" | "map";

const GREETINGS = ["네 이야기가 궁금해용!", "오늘은 어떤 모험을 할까용?", "내 귀가 쫑긋! 듣고 있어용."];

export default function FrontDoor() {
  const params = useSearchParams();
  const initialView: View = params.get("view") === "map" ? "map" : "home";
  const [view, setView] = useState<View>(initialView);

  return (
    <KidShell
      showLogin
      footer={
        <nav className={styles.nav} aria-label="아이 화면 메뉴">
          <button type="button" className={`${styles.navBtn} ${view === "home" ? styles.navActive : ""}`} aria-current={view === "home" ? "page" : undefined} onClick={() => setView("home")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="7" />
              <ellipse cx="12" cy="12" rx="12" ry="4" transform="rotate(-30 12 12)" />
            </svg>
            우리별
          </button>
          <button type="button" className={`${styles.navBtn} ${view === "map" ? styles.navActive : ""}`} aria-current={view === "map" ? "page" : undefined} onClick={() => setView("map")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Zm6-3v17M16 5v17" />
            </svg>
            이야기 지도
          </button>
        </nav>
      }
    >
      <DoorBody view={view} setView={setView} />
    </KidShell>
  );
}

function DoorBody({ view, setView }: { view: View; setView: (v: View) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const short = params.get("short") === "1";
  const toast = useKidToast();
  const [current, setCurrent] = useState<PlanetId>(PLANETS[0].id);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState<string | null>(null);
  const greetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const letterRef = useRef<HTMLDialogElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);
  const mailRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setCurrent(readPlanet()), []);
  const planet = PLANETS.find((p) => p.id === current) ?? PLANETS[0];

  // 편지 버튼을 별 그림 속 우편함 위에 맞춘다 (viewBox 440×350, xMidYMid meet)
  useEffect(() => {
    if (view !== "home") return;
    const place = () => {
      const btn = mailRef.current, box = planetRef.current, scene = sceneRef.current;
      if (!btn || !box || !scene || !planet.mail) return;
      const r = box.getBoundingClientRect(), sc = scene.getBoundingClientRect();
      const s = Math.min(r.width / 440, r.height / 350);
      const ox = r.left + (r.width - 440 * s) / 2, oy = r.top + (r.height - 350 * s) / 2;
      const k = planetScale(planet);
      const vx = GROUND.x + (planet.mail[0] - planet.gx) * k, vy = GROUND.y + (planet.mail[1] - planet.gy) * k;
      btn.style.left = `${ox + vx * s - sc.left - btn.offsetWidth / 2}px`;
      btn.style.top = `${oy + vy * s - sc.top - btn.offsetHeight / 2}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    if (sceneRef.current) ro.observe(sceneRef.current);
    return () => ro.disconnect();
  }, [view, planet]);

  const greet = () => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    if (greetTimer.current) clearTimeout(greetTimer.current);
    greetTimer.current = setTimeout(() => setGreeting(null), 2800);
  };

  const stay = (id: PlanetId) => {
    setCurrent(id);
    savePlanet(id);
    setView("home");
    window.scrollTo(0, 0);
    const name = PLANETS.find((p) => p.id === id)?.name;
    if (name) toast(`${name}에 살포시 도착했어요`);
  };

  const start = async (id: PlanetId) => {
    setStarting(true);
    setError("");
    try {
      router.push(await startAdventure({ themeId: id, short, demo }));
    } catch {
      setStarting(false);
      setError("용을 부르지 못했어요. 한 번 더 눌러 볼까요?");
    }
  };

  if (view === "map") return <PlanetMap current={current} onStay={stay} />;

  return (
    <section className={styles.view} aria-labelledby="home-title">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>너와 내가 만드는 작은 우주</p>
        <h1 id="home-title" className={styles.title}>
          오늘도, 우리 별에서 만나!
        </h1>
        <p className={styles.sub}>이야기 용이 별에서 기다리고 있어</p>
      </div>

      <div className={styles.homeScene} ref={sceneRef}>
        <div className={styles.farOne} aria-hidden="true" />
        <div className={styles.farTwo} aria-hidden="true" />
        <button type="button" className={styles.dragonHome} aria-label="이야기 용에게 인사하기" onClick={greet}>
          <span className={styles.idle}>
            <Dragon className={styles.dragonArt} label="이야기 용" />
          </span>
        </button>
        <div ref={planetRef} className={styles.homePlanet}>
          <PlanetArt planet={planet} className={styles.dragonArt} />
        </div>
        <div className={`${styles.speech} ${greeting ? styles.speechShow : ""}`} role="status">
          {greeting ?? planet.greeting}
        </div>
        {planet.mail && <button ref={mailRef} type="button" className={styles.mailHit} aria-label="이야기 용의 편지 읽기" onClick={() => letterRef.current?.showModal()} />}
      </div>

      <div className={styles.caption}>
        <svg className={styles.captionDot} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="6" />
          <ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-25 12 12)" />
        </svg>
        <strong>{planet.name}</strong>
        <span className={styles.captionDivider} aria-hidden="true" />
        <span>{planet.short}</span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${styles.primary} ${starting ? "" : styles.ringing}`} onClick={() => void start(current)} disabled={starting}>
          <svg className={styles.primaryIcon} viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="2" width="6" height="13" rx="3" />
            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
          </svg>
          {starting ? "용을 부르는 중…" : "이야기 용 만나기"}
          <span className={styles.primaryArrow} aria-hidden="true">
            ↗
          </span>
        </button>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : (
          <p className={styles.helper}>
            {starting
              ? "마이크 허용 창이 뜨면 '허용'을 눌러 주세요. 그다음 아이에게 건네 주면 돼요."
              : "보호자님이 버튼을 누르고 마이크를 허용한 뒤 아이에게 건네 주세요. 끝나면 오늘의 관찰 노트가 생겨요. 목소리는 저장하지 않아요."}
          </p>
        )}
      </div>

      <IslandList demo={demo} />

      <dialog ref={letterRef} className={styles.dialog} onClick={(e) => e.target === letterRef.current && letterRef.current?.close()}>
        <h2 className={styles.dialogTitle}>우리 별에 온 걸 환영해!</h2>
        <p className={styles.dialogNote}>
          안녕! 작은 집 옆에 네가 앉을 자리를 남겨 뒀어.
          <br />
          우리 숲에는 아직 이름 없는 나무가 많아.
          <br />
          다음에 만나면 함께 이름을 지어 줄래?
        </p>
        <p className={styles.dialogText} style={{ marginTop: 12 }}>
          — 네 이야기를 기다리는 용이
        </p>
        <div className={styles.dialogActions} style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
          <button type="button" className={styles.primarySmall} onClick={() => { letterRef.current?.close(); toast("편지를 잘 받았어요"); }}>
            편지 잘 받았어
          </button>
        </div>
      </dialog>
    </section>
  );
}

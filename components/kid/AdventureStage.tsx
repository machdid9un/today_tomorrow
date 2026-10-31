"use client";
// 모험 화면 겉모습 (4174 시안). 음성 루프는 역할 2의 useVoiceAdventure를 그대로 쓰고, 여기서는 보이는 것만 그린다. 소유: 역할 4.
// 회차가 끝나면(phase === "ended") 건네주기 화면으로 바뀐다.
import { useEffect, useRef, useState } from "react";
import { useVoiceAdventure } from "@/components/voice/useVoiceAdventure";
import type { VoiceMode } from "@/components/voice/types";
import type { PlanetId } from "@/lib/story/themes";
import DragonStatus from "./DragonStatus";
import HandoffScreen from "./HandoffScreen";
import KidShell from "./KidShell";
import { PLANETS } from "./planets";
import styles from "./kid.module.css";

export interface AdventureStageProps {
  episodeId: string;
  mode: VoiceMode;
  themeId?: PlanetId | null;
}

/** mock 회차(역할 3의 메모리 저장소)는 새로고침으로 안 지워져서, 개발용 "처음부터"는 새 mock 회차로 바꿔 다시 마운트한다 */
function freshMockEpisodeId() {
  return `mock-${Math.random().toString(36).slice(2, 10)}-1`;
}

export default function AdventureStage(props: AdventureStageProps) {
  const [episodeId, setEpisodeId] = useState(props.episodeId);
  return <Stage key={episodeId} {...props} episodeId={episodeId} onReset={() => setEpisodeId(freshMockEpisodeId())} />;
}

function Stage({ episodeId, mode, themeId, onReset }: AdventureStageProps & { onReset: () => void }) {
  const { phase, errorMessage, choices, narrationLog, start, startRecording, stopRecording, submitChoice, endManually } = useVoiceAdventure({ episodeId, mode });
  const planet = PLANETS.find((p) => p.id === themeId) ?? null;
  const autoStarted = useRef(false);
  const isMock = episodeId.startsWith("mock-");

  // 첫 화면에서 버튼을 누르고 넘어왔으면(사용자 동작이 이미 있음) 바로 시작한다. 아니면 시작 버튼을 보여 준다.
  useEffect(() => {
    if (autoStarted.current) return;
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive;
    if (active) {
      autoStarted.current = true;
      void start();
    }
  }, [start]);

  if (phase === "ended") return <HandoffScreen episodeId={episodeId} />;

  const lastLine = narrationLog[narrationLog.length - 1] ?? "";
  const pttActive = mode === "ptt" && (phase === "listening" || phase === "recording");

  return (
    <KidShell>
      <section className={`${styles.view} ${styles.stage}`} aria-label="이야기 모험">
        {planet && <p className={styles.stagePlanet}>{planet.name}에서</p>}

        <DragonStatus phase={phase} />

        {lastLine && (
          <p className={styles.stageLine} aria-live="polite">
            {lastLine}
          </p>
        )}

        {phase === "idle" && (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => void start()}>
              <svg className={styles.primaryIcon} viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="2" width="6" height="13" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
              </svg>
              이야기 시작하기
              <span className={styles.primaryArrow} aria-hidden="true">
                ↗
              </span>
            </button>
            <p className={styles.helper}>누르면 마이크가 켜져요. 그다음부터는 목소리로 함께해요.</p>
          </div>
        )}

        {pttActive && (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.primary} ${styles.pttBtn}`}
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={() => phase === "recording" && stopRecording()}
            >
              {phase === "recording" ? "다 말했으면 손을 떼요" : "꾹 누르고 말하기"}
            </button>
          </div>
        )}

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        {choices.length > 0 && (
          <div className={styles.choices}>
            <p className={styles.choicesLabel}>말 대신 골라도 돼요</p>
            <div className={styles.choiceList}>
              {choices.map((c) => (
                <button key={c} type="button" className={styles.choice} disabled={phase === "thinking" || phase === "speaking"} onClick={() => void submitChoice(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase !== "idle" && (
          <button type="button" className={styles.stopBtn} onClick={endManually}>
            오늘은 그만할래
          </button>
        )}

        {isMock && (
          <p className={styles.devLine}>
            연습용 회차 {episodeId} ·{" "}
            <button type="button" onClick={() => window.confirm("지금까지의 대화를 지우고 처음부터 할까요?") && onReset()}>
              처음부터
            </button>
          </p>
        )}
      </section>
    </KidShell>
  );
}

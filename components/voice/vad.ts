"use client";
// 간단한 에너지 기반 VAD (발화 시작/종료 감지). 소유: 역할 2.
// 외부 라이브러리 없이 Web Audio API(AnalyserNode)만 사용 (README 협업 규칙: 새 라이브러리 설치 금지).
// 22:00 피벗 게이트에서 이 VAD가 불안정하면 VOICE_MODE=ptt로 즉시 전환하세요(코드 수정 아님).

export interface EnergyVADOptions {
  /** 바닥값(최소 보장 임계값). 실제 임계값은 아래 보정 단계에서 이 값보다 높게 잡힐 수도 있음. */
  speechThreshold?: number;
  /** 말하는 중이라고 판단하려면 이 시간(ms) 이상 임계값을 넘어야 함 (오탐 방지) */
  speechMinDurationMs?: number;
  /** 말이 끝났다고 판단하기 전 침묵이 유지되어야 하는 시간(ms) = 발화 종료 판정 지연 */
  silenceHangoverMs?: number;
  /**
   * 시작 직후 이 시간(ms) 동안은 발화로 판정하지 않고 주변 소음(TV, 옆 대화 등)의
   * 평균 크기만 측정한다. 실제 임계값 = max(speechThreshold, 소음 평균 * noiseMultiplier).
   * 조용한 방이면 speechThreshold 그대로, 시끄러운 방이면 자동으로 민감도를 낮춘다.
   */
  calibrationMs?: number;
  /** 소음 평균 대비 몇 배 커야 "말하는 중"으로 볼지 (클수록 둔감해짐, 오탐 줄어듦) */
  noiseMultiplier?: number;
  /** 보정이 끝나 실제 임계값이 정해지면 호출 (디버깅/로그용) */
  onCalibrated?: (effectiveThreshold: number, noiseFloor: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

export interface EnergyVAD {
  stop: () => void;
}

/**
 * stream에 연결해 에너지 기반으로 발화 시작/종료를 감지합니다.
 * stop()을 호출하면 AudioContext를 정리합니다.
 */
export function startEnergyVAD(
  stream: MediaStream,
  options: EnergyVADOptions = {}
): EnergyVAD {
  const {
    speechThreshold = 0.045,
    speechMinDurationMs = 200,
    silenceHangoverMs = 900,
    calibrationMs = 600,
    noiseMultiplier = 3,
    onCalibrated,
    onSpeechStart,
    onSpeechEnd,
  } = options;
  // 음절 사이 짧은 끊김은 "말이 끝난 것"으로 치지 않기 위한 유예 시간.
  // silenceHangoverMs(발화 "종료" 판정용)보다 훨씨 짧게 잡아서, 말 시작 판정이 굼뜨지 않게 한다.
  const startGraceMs = 150;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  let isSpeaking = false;
  // "말 시작" 판정용: 임계값 이상이 처음 시작된 시각, 그리고 그 사이 끊긴(임계값 밑) 구간이 시작된 시각.
  let aboveThresholdSinceMs: number | null = null;
  let belowStreakSinceMs: number | null = null;
  // "말 끝" 판정용: 말하는 중에 임계값 밑으로 내려간 시각.
  let silenceSinceMs: number | null = null;
  let smoothedRms = 0;
  let rafId: number;
  let stopped = false;

  // 보정 단계: 시작 직후 calibrationMs 동안 주변 소음 평균을 구해서 실제 임계값을 정한다.
  const startedAt = performance.now();
  let calibrating = true;
  let noiseSampleSum = 0;
  let noiseSampleCount = 0;
  let effectiveThreshold = speechThreshold;

  const tick = () => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(buffer);

    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rawRms = Math.sqrt(sumSquares / buffer.length);
    // 지수평활(EMA)로 프레임 단위 떨림을 줄인다. 음절 사이 순간적인 하락을 완만하게 만들어 준다.
    smoothedRms = smoothedRms === 0 ? rawRms : smoothedRms * 0.7 + rawRms * 0.3;
    const rms = smoothedRms;
    const now = performance.now();

    if (calibrating) {
      noiseSampleSum += rawRms;
      noiseSampleCount += 1;
      if (now - startedAt >= calibrationMs) {
        calibrating = false;
        const noiseFloor = noiseSampleCount > 0 ? noiseSampleSum / noiseSampleCount : 0;
        effectiveThreshold = Math.max(speechThreshold, noiseFloor * noiseMultiplier);
        onCalibrated?.(effectiveThreshold, noiseFloor);
      }
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (rms >= effectiveThreshold) {
      belowStreakSinceMs = null;
      silenceSinceMs = null;
      if (aboveThresholdSinceMs === null) aboveThresholdSinceMs = now;
      if (!isSpeaking && now - aboveThresholdSinceMs >= speechMinDurationMs) {
        isSpeaking = true;
        onSpeechStart?.();
      }
    } else {
      // 음절 사이 짧은 끊김(startGraceMs 이내)은 무시하고 "말하는 중" 누적을 계속 유지한다.
      if (belowStreakSinceMs === null) belowStreakSinceMs = now;
      if (now - belowStreakSinceMs >= startGraceMs) {
        aboveThresholdSinceMs = null;
      }

      if (isSpeaking) {
        if (silenceSinceMs === null) silenceSinceMs = now;
        if (now - silenceSinceMs >= silenceHangoverMs) {
          isSpeaking = false;
          silenceSinceMs = null;
          onSpeechEnd?.();
        }
      }
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    stop: () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      source.disconnect();
      void audioContext.close();
    },
  };
}

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
    speechThreshold = 0.08,
    speechMinDurationMs = 300,
    silenceHangoverMs = 900,
    calibrationMs = 600,
    noiseMultiplier = 3,
    onCalibrated,
    onSpeechStart,
    onSpeechEnd,
  } = options;

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
  let aboveThresholdSinceMs: number | null = null;
  let belowThresholdSinceMs: number | null = null;
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
    const rms = Math.sqrt(sumSquares / buffer.length);
    const now = performance.now();

    if (calibrating) {
      noiseSampleSum += rms;
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
      belowThresholdSinceMs = null;
      if (aboveThresholdSinceMs === null) aboveThresholdSinceMs = now;
      if (!isSpeaking && now - aboveThresholdSinceMs >= speechMinDurationMs) {
        isSpeaking = true;
        onSpeechStart?.();
      }
    } else {
      aboveThresholdSinceMs = null;
      if (isSpeaking) {
        if (belowThresholdSinceMs === null) belowThresholdSinceMs = now;
        if (now - belowThresholdSinceMs >= silenceHangoverMs) {
          isSpeaking = false;
          belowThresholdSinceMs = null;
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

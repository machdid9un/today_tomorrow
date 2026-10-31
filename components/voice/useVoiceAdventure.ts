"use client";
// 음성 모험 턴 루프 상태 머신. 소유: 역할 2.
// 흐름(README §4): 녹음 → STT → /api/story/turn(SSE) → 문장별 TTS 순서 재생 → 다음 발화 대기 → 반복 → 종료.
import { useCallback, useEffect, useRef, useState } from "react";
import type { EndReason } from "@/types";
import { OrderedAudioQueue } from "./audioQueue";
import { iterateSSE, parseJSONData } from "./sse";
import {
  DEFAULT_VOICE_SESSION_CONFIG,
  type SessionPhase,
  type TurnCompletePayload,
  type TurnSentence,
  type VoiceMode,
} from "./types";
import { startEnergyVAD } from "./vad";

export interface UseVoiceAdventureOptions {
  episodeId: string;
  mode: VoiceMode;
}

export function useVoiceAdventure({ episodeId, mode }: UseVoiceAdventureOptions) {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [lastChildText, setLastChildText] = useState<string>("");
  const [narrationLog, setNarrationLog] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const vadRef = useRef<ReturnType<typeof startEnergyVAD> | null>(null);
  const audioQueueRef = useRef<OrderedAudioQueue | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const episodeStartedAtRef = useRef<number>(0);
  const speechEndedAtRef = useRef<number>(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);
  // /api/story/turn 계약(역할 3): turnIndex는 0부터(0=오프닝, childText=""), prevLatencyMs는
  // "바로 전 턴" 응답 지연을 다음 요청에 실어 보내 turns.latency_ms를 역순으로 채운다.
  const turnIndexRef = useRef(0);
  const prevLatencyMsRef = useRef<number | null>(null);
  const recordingMimeTypeRef = useRef<string>("audio/webm");

  const config = DEFAULT_VOICE_SESSION_CONFIG;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const endEpisode = useCallback(
    async (reason: EndReason) => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearSilenceTimer();
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (errorRetryTimerRef.current) clearTimeout(errorRetryTimerRef.current);
      audioQueueRef.current?.cancel();
      vadRef.current?.stop();
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setPhase("ended");

      try {
        await fetch(`/api/episodes/${episodeId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // NOTE(역할 1 확인 필요): complete 요청 바디 형태가 이 모양이 맞는지 API 계약에서 확정해주세요.
          body: JSON.stringify({ endReason: reason }),
        });
      } catch {
        // 턴 기록 저장이 우선이라는 원칙(README §13-6)에 따라, 종료 호출 실패는 조용히 무시하고
        // 화면은 이미 "ended"로 전환합니다. 재시도 로직은 필요 시 추가.
      }
    },
    [episodeId, clearSilenceTimer]
  );

  const armSilenceTimer = useCallback(() => {
    // 60초 침묵 타이머는 TTS 재생이 "완전히 끝난 뒤" 시작합니다 (README §4 운영 규칙).
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // 추가 TTS 없이 조용히 종료·저장.
      void endEpisode("silence");
    }, config.silenceTimeoutMs);
  }, [clearSilenceTimer, config.silenceTimeoutMs, endEpisode]);

  const startListening = useCallback(() => {
    if (endedRef.current) return;
    setPhase("listening");
    armSilenceTimer();

    if (mode === "handsfree" && streamRef.current) {
      vadRef.current?.stop();
      vadRef.current = startEnergyVAD(streamRef.current, {
        onCalibrated: (effectiveThreshold, noiseFloor) => {
          console.info(
            `[voice] VAD 보정 완료 — 주변 소음 평균 ${noiseFloor.toFixed(4)}, 실제 임계값 ${effectiveThreshold.toFixed(4)}`
          );
        },
        onSpeechStart: () => {
          clearSilenceTimer();
          startRecording();
        },
        onSpeechEnd: () => {
          stopRecording();
        },
      });
    }
    // ptt 모드는 사용자가 버튼을 눌러 startRecording을 직접 트리거합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, armSilenceTimer, clearSilenceTimer]);

  /**
   * SSE error 이벤트나 fetch 실패로 phase가 "error"가 된 뒤, 마이크가 멈춘 채로 끝나지 않도록
   * 2초 뒤 자동으로 다시 듣기 상태로 돌아간다. 실패한 턴은 서버가 저장하지 않았으므로
   * turnIndexRef는 여기서 건드리지 않는다(같은 turnIndex로 재시도됨).
   */
  const scheduleErrorRecovery = useCallback(() => {
    if (errorRetryTimerRef.current) clearTimeout(errorRetryTimerRef.current);
    errorRetryTimerRef.current = setTimeout(() => {
      errorRetryTimerRef.current = null;
      if (endedRef.current) return;
      startListening();
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListening]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || endedRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;

    clearSilenceTimer();
    chunksRef.current = [];

    // 사파리는 audio/webm을 지원하지 않고 보통 audio/mp4로 녹음한다. 브라우저가 실제로
    // 지원하는 포맷을 골라야 STT로 보낼 때 포맷이 안 맞아 실패하는 걸 막을 수 있다.
    const PREFERRED_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"];
    const supportedMimeType =
      typeof MediaRecorder.isTypeSupported === "function"
        ? PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
        : undefined;
    recordingMimeTypeRef.current = supportedMimeType ?? "audio/webm";

    const recorder = supportedMimeType
      ? new MediaRecorder(streamRef.current, { mimeType: supportedMimeType })
      : new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      speechEndedAtRef.current = performance.now();
      const blob = new Blob(chunksRef.current, { type: recordingMimeTypeRef.current });
      chunksRef.current = [];
      void processUtterance(blob);
    };

    recorder.start();
    setPhase("recording");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSilenceTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const processUtterance = useCallback(
    async (blob: Blob) => {
      setPhase("transcribing");
      let text = "";
      try {
        const extension = recordingMimeTypeRef.current.includes("mp4")
          ? "mp4"
          : recordingMimeTypeRef.current.includes("ogg")
            ? "ogg"
            : "webm";
        const form = new FormData();
        form.append("audio", blob, `utterance.${extension}`);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!res.ok) throw new Error("transcribe failed");
        const data = (await res.json()) as { text?: string };
        text = (data.text ?? "").trim();
      } catch {
        setErrorMessage("말을 잘 듣지 못했어요. 아래 버튼으로 골라볼까?");
        setPhase("error");
        scheduleErrorRecovery();
        return;
      }

      if (!text) {
        // 빈 발화(무음 녹음 등) → 다시 듣기 상태로.
        startListening();
        return;
      }

      setLastChildText(text);
      // "잘래/졸려" 등 취침 발화 감지는 서버(역할 3 storyEngine.isSleepRequest)가 담당합니다.
      await runTurn(text);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [startListening, scheduleErrorRecovery]
  );

  const submitChoice = useCallback(
    async (choiceText: string) => {
      // 선택지 버튼 폴백 (STT 실패·마이크 없음 등). 음성과 동일한 경로로 처리.
      setErrorMessage(null);
      setLastChildText(choiceText);
      await runTurn(choiceText);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const runTurn = useCallback(
    async (childText: string) => {
      setPhase("thinking");
      clearSilenceTimer();

      const turnIndex = turnIndexRef.current;
      // 심사용 짧은 회차(?short=1)면 서버에 short:true를 실어 보낸다 (역할 3 storyEngine 3턴 마무리).
      const short = new URLSearchParams(window.location.search).get("short") === "1";

      let res: Response;
      try {
        res = await fetch("/api/story/turn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            episodeId,
            childText,
            turnIndex,
            prevLatencyMs: prevLatencyMsRef.current,
            short,
          }),
        });
      } catch {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
        scheduleErrorRecovery();
        return;
      }

      if (!res.ok || !res.body) {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
        scheduleErrorRecovery();
        return;
      }

      setPhase("speaking");
      const sentences: TurnSentence[] = [];
      let turnComplete: TurnCompletePayload | null = null;

      const queue = new OrderedAudioQueue(() => {
        void finishTurn(turnComplete, sentences);
      });
      audioQueueRef.current = queue;

      // 첫 TTS 재생까지 걸린 시간 측정용 (README §4 지연 목표: 5초 이내)
      let firstPlaybackLogged = false;

      try {
        for await (const evt of iterateSSE(res.body)) {
          if (evt.event === "sentence") {
            const payload = parseJSONData<TurnSentence>(evt.data);
            if (!payload) continue;
            sentences.push(payload);
            setNarrationLog((prev) => [...prev, payload.text]);
            queue.enqueue(payload.index, payload.text);
            if (!firstPlaybackLogged) {
              firstPlaybackLogged = true;
              // turnIndex 0(오프닝)은 아이 발화로 트리거된 게 아니라 측정 기준이 없음.
              if (turnIndex > 0 && speechEndedAtRef.current > 0) {
                const latencyMs = Math.round(performance.now() - speechEndedAtRef.current);
                console.info("[voice] first-sentence latency ms:", latencyMs);
                // 이번 턴(turnIndex)의 지연을 다음 요청에 실어 보내면, 서버가 turns.latency_ms(turnIndex-1 row)에 채워넣음.
                prevLatencyMsRef.current = latencyMs;
              } else {
                prevLatencyMsRef.current = null;
              }
            }
          } else if (evt.event === "turn_complete") {
            const payload = parseJSONData<TurnCompletePayload>(evt.data);
            if (!payload) continue;
            turnComplete = payload;
            setChoices(payload.choices);
            queue.setExpectedCount(sentences.length);
          } else if (evt.event === "error") {
            const payload = parseJSONData<{ code: string; message: string }>(evt.data);
            setErrorMessage(payload?.message ?? "잠깐 쉬었다가 다시 이야기해 보자.");
            setPhase("error");
            queue.cancel();
            scheduleErrorRecovery();
            return;
          }
        }
      } catch {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
        queue.cancel();
        scheduleErrorRecovery();
        return;
      }

      // SSE가 끝났는데 turn_complete가 안 왔다면 지금까지 들어온 문장 수로 마감.
      if (!turnComplete) {
        queue.setExpectedCount(sentences.length);
      }
      turnIndexRef.current = turnIndex + 1;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [episodeId, clearSilenceTimer, scheduleErrorRecovery]
  );

  const finishTurn = useCallback(
    async (turnComplete: TurnCompletePayload | null, _sentences: TurnSentence[]) => {
      if (endedRef.current) return;

      // 종료 여부는 서버(역할 3 storyEngine.decideMode)가 하드 타임아웃·취침 발화·자연 종료를
      // 이미 판정해서 shouldEnd/endingReason으로 내려줍니다 (README §4 "코드가 최종 판정").
      // 클라이언트의 hardTimeoutRef는 네트워크 문제 등에 대비한 별도 안전장치로만 둡니다.
      if (turnComplete?.shouldEnd) {
        await endEpisode(turnComplete.endingReason ?? "natural");
        return;
      }

      // 다음 발화를 기다립니다. (재생이 끝난 뒤 60초 침묵 타이머가 여기서 다시 시작됨)
      startListening();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [endEpisode, startListening]
  );

  const start = useCallback(async () => {
    setErrorMessage(null);
    setPhase("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setErrorMessage("마이크 권한이 없어요. 아래 버튼으로 이야기를 골라볼까?");
      setPhase("error");
      return;
    }

    episodeStartedAtRef.current = performance.now();
    hardTimeoutRef.current = setTimeout(() => {
      void endEpisode("timeout");
    }, config.hardTimeoutMs);

    // turnIndex 0: 아이 발화 없이 오프닝 멘트를 받아옵니다 (README §3-A "이름이 뭐야?" 등).
    await runTurn("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.hardTimeoutMs, endEpisode, runTurn]);

  const endManually = useCallback(() => {
    void endEpisode("manual");
  }, [endEpisode]);

  useEffect(() => {
    return () => {
      vadRef.current?.stop();
      audioQueueRef.current?.cancel();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      clearSilenceTimer();
      if (hardTimeoutRef.current) clearTimeout(hardTimeoutRef.current);
      if (errorRetryTimerRef.current) clearTimeout(errorRetryTimerRef.current);
    };
  }, [clearSilenceTimer]);

  return {
    phase,
    errorMessage,
    choices,
    lastChildText,
    narrationLog,
    start,
    startRecording, // ptt 모드에서 버튼 누를 때 호출
    stopRecording, // ptt 모드에서 버튼 뗄 때 호출
    submitChoice, // 선택지 버튼 폴백
    endManually,
  };
}

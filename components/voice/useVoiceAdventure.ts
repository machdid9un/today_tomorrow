"use client";
// 음성 모험 턴 루프 상태 머신. 소유: 역할 2.
// 흐름(README §4): 녹음 → STT → /api/story/turn(SSE) → 문장별 TTS 순서 재생 → 다음 발화 대기 → 반복 → 종료.
import { useCallback, useEffect, useRef, useState } from "react";
import type { EndReason } from "@/types";
import { OrderedAudioQueue } from "./audioQueue";
import { iterateSSE, parseJSONData } from "./sse";
import { isSleepPhrase } from "./sleepPhrases";
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
  const pendingSleepEndRef = useRef(false);
  const endedRef = useRef(false);

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

  const startRecording = useCallback(() => {
    if (!streamRef.current || endedRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;

    clearSilenceTimer();
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      speechEndedAtRef.current = performance.now();
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
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
        const form = new FormData();
        form.append("audio", blob, "utterance.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!res.ok) throw new Error("transcribe failed");
        const data = (await res.json()) as { text?: string };
        text = (data.text ?? "").trim();
      } catch {
        setErrorMessage("말을 잘 듣지 못했어요. 아래 버튼으로 골라볼까?");
        setPhase("error");
        return;
      }

      if (!text) {
        // 빈 발화(무음 녹음 등) → 다시 듣기 상태로.
        startListening();
        return;
      }

      setLastChildText(text);
      if (isSleepPhrase(text)) {
        // 종료는 코드가 최종 판정 (README §4). 엔진에게 짧은 마무리 멘트만 요청하고 강제 종료합니다.
        pendingSleepEndRef.current = true;
      }
      await runTurn(text);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [startListening]
  );

  const submitChoice = useCallback(
    async (choiceText: string) => {
      // 선택지 버튼 폴백 (STT 실패·마이크 없음 등). 음성과 동일한 경로로 처리.
      setErrorMessage(null);
      setLastChildText(choiceText);
      if (isSleepPhrase(choiceText)) pendingSleepEndRef.current = true;
      await runTurn(choiceText);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const runTurn = useCallback(
    async (childText: string) => {
      setPhase("thinking");
      clearSilenceTimer();

      let res: Response;
      try {
        res = await fetch("/api/story/turn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ episodeId, childText }),
        });
      } catch {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
        return;
      }

      if (!res.ok || !res.body) {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
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
              const latencyMs = performance.now() - speechEndedAtRef.current;
              // TODO(역할 1·3 확인): 이 값을 turns.latency_ms로 어디에 보내 저장할지 합의 필요.
              console.info("[voice] first-sentence latency ms:", Math.round(latencyMs));
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
            return;
          }
        }
      } catch {
        setErrorMessage("잠깐 쉬었다가 다시 이야기해 보자.");
        setPhase("error");
        return;
      }

      // SSE가 끝났는데 turn_complete가 안 왔다면 지금까지 들어온 문장 수로 마감.
      if (!turnComplete) {
        queue.setExpectedCount(sentences.length);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [episodeId, clearSilenceTimer]
  );

  const finishTurn = useCallback(
    async (turnComplete: TurnCompletePayload | null, _sentences: TurnSentence[]) => {
      if (endedRef.current) return;

      if (pendingSleepEndRef.current) {
        await endEpisode("sleep_request");
        return;
      }

      const elapsedMs = performance.now() - episodeStartedAtRef.current;
      const pastHardTimeout = elapsedMs >= config.hardTimeoutMs;
      const canEndNaturally = elapsedMs >= config.naturalEndAfterMs;

      if (pastHardTimeout) {
        await endEpisode("timeout");
        return;
      }
      if (turnComplete?.shouldEnd && canEndNaturally) {
        await endEpisode("natural");
        return;
      }

      // 다음 발화를 기다립니다. (재생이 끝난 뒤 60초 침묵 타이머가 여기서 다시 시작됨)
      startListening();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [config.hardTimeoutMs, config.naturalEndAfterMs, endEpisode, startListening]
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

    startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.hardTimeoutMs, endEpisode, startListening]);

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

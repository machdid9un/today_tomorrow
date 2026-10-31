"use client";
// 문장 순서 보장 TTS 재생 큐 (README §4: 문장 도착 즉시 TTS 준비, index 순으로 재생). 소유: 역할 2.

// ElevenLabs는 구독 등급에 따라 동시 요청 수가 제한된다(기본 5). 한 턴의 문장 6~7개를 한꺼번에 보내면 뒤쪽이
// 429(concurrent_limit)로 떨어져 그 문장만 소리가 빠진다 → 브라우저 쪽에서 동시 3개까지만 보내고 나머지는 줄을 선다.
// (여러 기기가 동시에 쓸 때도 서버가 받는 동시 요청이 줄어든다.) 실패하면 한 번 더 시도한다.
const MAX_INFLIGHT = 3;
const RETRY_DELAY_MS = 700;
let inflight = 0;
const waiting: (() => void)[] = [];
function acquire(): Promise<void> {
  if (inflight < MAX_INFLIGHT) {
    inflight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) =>
    waiting.push(() => {
      inflight += 1;
      resolve();
    }),
  );
}
function release() {
  inflight = Math.max(0, inflight - 1);
  waiting.shift()?.();
}

async function fetchTts(
  text: string,
  signalCancelled: () => boolean,
): Promise<Blob> {
  await acquire();
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signalCancelled()) throw new Error("cancelled");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) return await res.blob();
      // 동시 요청 초과·일시 장애(429/502/503)만 한 번 더. 400(빈 문장 등)·500(설정 누락)은 바로 포기.
      if (
        attempt === 0 &&
        (res.status === 429 || res.status === 502 || res.status === 503)
      ) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw new Error(`TTS failed: ${res.status}`);
    }
    throw new Error("TTS failed");
  } finally {
    release();
  }
}

export class OrderedAudioQueue {
  private blobs = new Map<number, Blob | null>(); // null = 해당 문장 TTS 실패
  private nextPlayIndex = 0;
  private expectedCount: number | null = null;
  private playing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private cancelled = false;

  constructor(
    private readonly onAllPlayed: () => void,
    private readonly onPlayError?: (index: number) => void,
  ) {}

  /** 문장 index에 해당하는 TTS 오디오 blob 요청을 시작합니다. 완료되는 순서와 무관하게 재생은 index 순서로 보장됩니다. */
  enqueue(index: number, text: string) {
    fetchTts(text, () => this.cancelled)
      .then((blob) => {
        if (this.cancelled) return;
        this.blobs.set(index, blob);
        this.tryPlayNext();
      })
      .catch(() => {
        if (this.cancelled) return;
        this.blobs.set(index, null);
        this.onPlayError?.(index);
        this.tryPlayNext();
      });
  }

  /** turn_complete 수신 시 총 문장 개수를 알려줘서 마지막 문장 재생 후 종료 콜백을 호출할 수 있게 합니다. */
  setExpectedCount(count: number) {
    this.expectedCount = count;
    // 문장이 전부 이미 재생(또는 건너뛰기)됐는데 개수를 늦게 알게 된 경우: tryPlayNext는 재생할 blob이 없어 바로 돌아오므로
    // 여기서 끝났음을 직접 알린다 (안 그러면 '이야기하는 중'에서 멈춘다).
    if (!this.playing && !this.cancelled && this.nextPlayIndex >= count) {
      this.onAllPlayed();
      return;
    }
    this.tryPlayNext();
  }

  cancel() {
    this.cancelled = true;
    this.currentAudio?.pause();
    this.currentAudio = null;
  }

  private tryPlayNext() {
    if (this.playing || this.cancelled) return;
    if (!this.blobs.has(this.nextPlayIndex)) return;

    const blob = this.blobs.get(this.nextPlayIndex) ?? null;
    this.blobs.delete(this.nextPlayIndex);
    const finishedIndex = this.nextPlayIndex;
    this.nextPlayIndex += 1;

    if (blob === null) {
      // 이 문장 TTS는 실패했지만, 순서 보장을 위해 건너뛰고 다음 문장으로 진행합니다.
      this.afterOne();
      return;
    }

    this.playing = true;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.currentAudio = audio;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      this.playing = false;
      this.currentAudio = null;
      this.afterOne();
    };

    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener(
      "error",
      () => {
        this.onPlayError?.(finishedIndex);
        cleanup();
      },
      { once: true },
    );

    void audio.play().catch(() => cleanup());
  }

  private afterOne() {
    if (this.cancelled) return;
    if (
      this.expectedCount !== null &&
      this.nextPlayIndex >= this.expectedCount
    ) {
      this.onAllPlayed();
      return;
    }
    this.tryPlayNext();
  }
}

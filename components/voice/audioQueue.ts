"use client";
// 문장 순서 보장 TTS 재생 큐 (README §4: 문장 도착 즉시 TTS 준비, index 순으로 재생). 소유: 역할 2.

// 지금 재생 중인(또는 재생 대기 중인) 큐를 전역으로 기억해 둔다. React 언마운트 정리(useEffect cleanup)는
// 화면 전환이 끝나야 실행되는데, 전환이 느리면 그 사이 음성이 계속 나오는 것처럼 보인다(홈 버튼 버그).
// KidShell의 홈 링크처럼 "어디서든 지금 당장 소리를 끄고 싶은" 곳에서 쓸 수 있게 모듈 전역 함수로 둔다.
const activeQueues = new Set<OrderedAudioQueue>();

/** 지금 재생 중인 모든 TTS를 즉시 멈춘다(페이지 전환 등으로 더 못 기다릴 때). */
export function stopAllAudio() {
  for (const q of activeQueues) q.cancel();
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
    private readonly onPlayError?: (index: number) => void
  ) {
    activeQueues.add(this);
  }

  /** 문장 index에 해당하는 TTS 오디오 blob 요청을 시작합니다. 완료되는 순서와 무관하게 재생은 index 순서로 보장됩니다. */
  enqueue(index: number, text: string) {
    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
        return res.blob();
      })
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
    this.tryPlayNext();
  }

  cancel() {
    this.cancelled = true;
    this.currentAudio?.pause();
    this.currentAudio = null;
    activeQueues.delete(this);
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
    audio.addEventListener("error", () => {
      this.onPlayError?.(finishedIndex);
      cleanup();
    }, { once: true });

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

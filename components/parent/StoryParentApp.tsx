"use client";
// 부모 화면 (4174 'story-planets' 시안): 교신 리포트 · 이야기 기록 · 설정. 소유: 역할 4.
// 데이터는 ParentDataProvider(GET /api/episodes → 실패하면 예시 데이터)를 그대로 쓴다. 마음 담기는 PATCH /api/sessions/[worldId]/seed.
// 원본 대화(턴 기록)는 아직 API가 내려주지 않아서, 회차 보기는 동화책 + 아이가 한 말·고른 것·관찰을 보여 준다.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MoodWeather } from "@/lib/story/reportGenerator";
import { buildWeeklyReport, familiarName, nameWithSubject, nightOf, WEATHER_LABEL } from "@/lib/story/weeklyReport";
import type { SeedPreset } from "@/types";
import { PLANETS } from "@/components/kid/planets";
import Wordmark from "@/components/kid/Wordmark";
import { makeNotePdf, type NoteData } from "./notePdf";
import { saveSeedPreset, type ParentEpisode, type SeedSectionCopy } from "./parentData";
import PayModal, { PRICE_LABEL, TRIAL_LABEL } from "./PayModal";
import { useParentData } from "./ParentDataProvider";
import s from "./storyParent.module.css";

export type ParentTab = "report" | "library" | "settings";

const WEATHER_SVG: Record<MoodWeather | "none", React.ReactNode> = {
  sunny: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#f2a33a" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></g><circle cx="12" cy="12" r="4.6" fill="#ffc85a" stroke="#f2a33a" strokeWidth="1.4" /></svg>
  ),
  partly_cloudy: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#f2a33a" strokeWidth="1.6" strokeLinecap="round"><path d="M9 2.8v1.8M3.4 8.4h1.8M5 4.4l1.2 1.2M13 4.4l-1.2 1.2" /></g><circle cx="9" cy="9" r="3.6" fill="#ffc85a" stroke="#f2a33a" strokeWidth="1.3" /><path d="M8.5 19.5a3.4 3.4 0 0 1-.3-6.8 4.6 4.6 0 0 1 8.8.9 3 3 0 0 1 .6 5.9Z" fill="#fff" stroke="#a9a2bf" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  ),
  cloudy: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5a4 4 0 0 1-.4-8 5.6 5.6 0 0 1 10.7 1.1 3.5 3.5 0 0 1 .7 6.9Z" fill="#ece8f5" stroke="#a9a2bf" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  ),
  rainy: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 15.5a4 4 0 0 1-.4-8 5.6 5.6 0 0 1 10.7 1.1 3.5 3.5 0 0 1 .7 6.9Z" fill="#e4e0f0" stroke="#a9a2bf" strokeWidth="1.4" strokeLinejoin="round" /><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" stroke="#8fb6e0" strokeWidth="1.6" strokeLinecap="round" /></svg>
  ),
  none: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="none" stroke="#d6c8b6" strokeWidth="1.5" strokeDasharray="2.5 3" /></svg>
  ),
};
const weatherIcon = (w: MoodWeather | null | undefined) => WEATHER_SVG[w ?? "none"];

const Icon = {
  chev: <svg className={s.chev} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>,
  kid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5.5" /><ellipse cx="12" cy="12" rx="10.5" ry="3.6" transform="rotate(-25 12 12)" /></svg>,
  report: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15a7 7 0 0 1 7-7M5 20a12 12 0 0 1 12-12" /><circle cx="17.5" cy="16.5" r="2.5" /></svg>,
  book: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c2.7-1 5.3-1 8 1 2.7-2 5.3-2 8-1V19c-2.7-1-5.3-1-8 1-2.7-2-5.3-2-8-1Z" /><path d="M12 6.5V20" /></svg>,
  gear: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" /></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" /></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M8 11l4 4 4-4M5 19h14" /></svg>,
  openBook: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M4 5.5c2.7-1 5.3-1 8 1 2.7-2 5.3-2 8-1V19c-2.7-1-5.3-1-8 1-2.7-2-5.3-2-8-1Z M12 6.5V20" /></svg>,
};

const planetOf = (ep: ParentEpisode | null | undefined) => PLANETS.find((p) => p.id === ep?.report?.planet?.id) ?? null;
const titleOf = (ep: ParentEpisode) => ep.title ?? ep.islandTitle ?? `${ep.episodeNumber}화 이야기`;
const byNewest = (a: ParentEpisode, b: ParentEpisode) => Date.parse(b.startedAt) - Date.parse(a.startedAt);

export interface StoryParentAppProps {
  seedCopy: SeedSectionCopy;
  initialTab?: ParentTab;
  initialRange?: "night" | "week";
  /** 하루씩 보기로 열 회차 (건네주기 화면에서 넘어옴) */
  initialEpisodeId?: string | null;
  /** 이 회차의 동화책·기록을 바로 연다 (/parent/episodes/[id]) */
  openEpisodeId?: string | null;
}

export default function StoryParentApp({ seedCopy, initialTab = "report", initialRange = "week", initialEpisodeId = null, openEpisodeId = null }: StoryParentAppProps) {
  const router = useRouter();
  const data = useParentData();
  const { status, source, activeChild: child, children: kids, selectChild, today, loadEpisodeDetail, setSavedSeed } = data;
  const [tab, setTab] = useState<ParentTab>(initialTab);
  const [range, setRange] = useState<"night" | "week">(initialEpisodeId ? "night" : initialRange);
  const [nightId, setNightId] = useState<string | null>(initialEpisodeId);
  const [epId, setEpId] = useState<string | null>(openEpisodeId);
  const [epFrom, setEpFrom] = useState<ParentTab>(openEpisodeId ? "library" : initialTab);
  const [epView, setEpView] = useState<"book" | "notes">("book");
  const [shelf, setShelf] = useState<string | null>(null);
  const [seed, setSeed] = useState<SeedPreset | null>(null);
  const [seedState, setSeedState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [payOpen, setPayOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [shareQuote, setShareQuote] = useState(false);

  const say = (t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const name = child?.name ?? null;
  const call = familiarName(name) ?? "아이";
  const subj = nameWithSubject(name);
  const episodes = useMemo(() => [...(child?.episodes ?? [])].sort(byNewest), [child]);
  const withReport = episodes.filter((e) => e.report);
  const weekly = useMemo(() => buildWeeklyReport(episodes, { childName: name, today }), [episodes, name, today]);

  useEffect(() => setSeed(child?.savedSeed ?? null), [child]);

  const night = (nightId && episodes.find((e) => e.id === nightId)) || withReport[0] || episodes[0] || null;
  const openEp = epId ? episodes.find((e) => e.id === epId) ?? null : null;

  useEffect(() => {
    if (epId) void loadEpisodeDetail(epId);
  }, [epId, loadEpisodeDetail]);

  const goTab = (t: ParentTab) => {
    setTab(t);
    setEpId(null);
    window.scrollTo(0, 0);
  };
  const openEpisode = (id: string, view: "book" | "notes" = "book") => {
    setEpFrom(tab);
    setEpId(id);
    setEpView(view);
    window.scrollTo(0, 0);
  };

  const copyLine = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
      say("한마디를 복사했어요");
    } catch {
      say("복사하지 못했어요. 길게 눌러 복사해 주세요");
    }
  };

  const saveSeed = async () => {
    if (!child) return;
    if (!child.worldId) {
      say("예시 데이터라 저장하지 않았어요");
      return;
    }
    setSeedState("saving");
    const ok = await saveSeedPreset(child.worldId, seed);
    setSeedState(ok ? "saved" : "error");
    if (ok) setSavedSeed(child.key, seed);
  };

  const downloadNote = async () => {
    if (!child) return;
    setPdfBusy(true);
    try {
      const weekEps = episodes.filter((e) => weekly.days.some((d) => d.date === nightOf(e.startedAt)?.date));
      const reports = weekEps.filter((e) => e.report);
      const kw = new Map<string, number>();
      reports.forEach((e) => e.report!.keywords?.forEach((k) => kw.set(k.word, (kw.get(k.word) ?? 0) + k.count)));
      const latestPlanet = planetOf(reports[0] ?? withReport[0]);
      const label = (e: ParentEpisode) => `${nightOf(e.startedAt)?.weekday ?? ""} 밤 · ${e.episodeNumber}화 ${titleOf(e)}`;
      const note: NoteData = {
        childName: name ?? "우리 아이",
        childCall: call,
        ageLabel: child.ageLabel,
        period: weekly.weekRangeLabel,
        planet: latestPlanet?.name ?? null,
        planetImg: latestPlanet?.img ?? null,
        count: weekly.storyCount,
        intro: `이번 주 이야기 ${weekly.storyCount}화에서 ${subj} 한 말과 고른 것만 모았어요. 모든 관찰 아래에 근거가 된 말을 붙였어요.`,
        week: weekly.days.map((d) => ({ day: d.label, weather: d.weather, label: d.weather ? WEATHER_LABEL[d.weather] : d.isFuture ? "" : d.episodeCount ? "기록 없음" : "쉼" })),
        insights: reports.flatMap((e) => (e.report!.observations ?? []).map((o) => ({ label: o.inference, ev: o.evidence.map((q) => ({ label: label(e), text: `“${q}”` })) }))).slice(0, 8),
        quotes: reports.flatMap((e) => e.report!.childQuotes.map((q) => ({ label: label(e), text: `“${q}”` }))).slice(0, 10),
        keywords: [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count })),
        choices: reports.filter((e) => e.report!.childChoices.length).map((e) => ({ label: label(e), items: e.report!.childChoices })),
        line: reports[0]?.report?.lineForParent || null,
        next: (reports[0]?.report?.seedSuggestions ?? []).map((x) => `${x.label}: ${x.reason}`).slice(0, 2),
        notice: [
          "이 노트는 진단이나 평가가 아니에요. 이야기 속에서 보인 모습을 아이가 한 말 그대로 모은 기록이에요.",
          "한 주의 이야기만으로 아이의 성격이나 마음을 단정할 수 없어요. 이야기 속 선택은 놀이 속 선택이에요.",
          "아이의 마음이 걱정된다면 이 노트보다 소아청소년 전문가와 직접 이야기해 보세요.",
          "목소리는 저장하지 않았고, 글로 남은 대화만 사용했어요.",
        ],
        sample: source === "mock",
      };
      const blob = await makeNotePdf(note);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `쫑긋_관찰노트_${name ?? "아이"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      say("관찰 노트를 내려받았어요");
    } catch (err) {
      console.error(err);
      say("노트를 만들지 못했어요. 다시 눌러 주세요");
    } finally {
      setPdfBusy(false);
    }
  };

  const goKid = () => {
    void fetch("/api/auth/parent-gate/exit", { method: "POST" }).catch(() => undefined);
    router.push("/kid");
  };

  // ───────── 화면 조각 ─────────
  const header = (
    <header className={s.top}>
      <Link href="/parent" className={s.brand} onClick={() => goTab("report")}>
        <Wordmark />
      </Link>
      <div className={s.topRight}>
        {kids.length > 1 ? (
          <label className={s.child}>
            <span className="sr-only">아이 고르기</span>
            <select value={child?.key ?? ""} onChange={(e) => selectChild(e.target.value)} style={{ border: 0, background: "transparent", font: "inherit" }}>
              {kids.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.name ?? "우리 아이"}
                  {k.ageLabel ? ` · ${k.ageLabel}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : (
          child && (
            <span className={s.child}>
              {child.name ?? "우리 아이"}
              {child.ageLabel ? ` · ${child.ageLabel}` : ""}
            </span>
          )
        )}
        <button type="button" className={s.kidmode} onClick={goKid}>
          {Icon.kid}아이 모드
        </button>
      </div>
    </header>
  );

  const insightList = (ep: ParentEpisode) => {
    const obs = ep.report?.observations ?? [];
    if (!obs.length) return <p className={s.sub}>이 이야기에서는 근거가 충분한 관찰이 나오지 않았어요.</p>;
    return (
      <>
        <ul className={s.insights}>
          {obs.map((o, i) => (
            <li key={i} className={s.insight}>
              <p>{o.inference}</p>
              <div className={s.evidence}>
                {o.evidence.map((q, j) => (
                  <button key={j} type="button" className={s.ev} onClick={() => openEpisode(ep.id, "notes")}>
                    <b>{ep.episodeNumber}화에서 한 말</b>
                    <span>“{q}”</span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className={s.rule}>관찰은 아이가 한 말과 고른 것에서만 나와요. 아이의 성격이나 마음을 진단하지 않아요.</p>
      </>
    );
  };

  const noteCard = (
    <section className={`${s.card} ${s.note}`}>
      <div>
        <h2>이야기 관찰 노트</h2>
        <p className={s.sub}>이번 주 관찰, {subj} 한 말, 자주 쓴 낱말, 고른 것을 근거와 함께 한 파일로 정리했어요.</p>
      </div>
      <button type="button" className={s.btn} onClick={downloadNote} disabled={pdfBusy || !episodes.length}>
        {Icon.download}
        {pdfBusy ? "노트를 만드는 중…" : "PDF로 내려받기"}
      </button>
    </section>
  );

  // 건네주기 직후: 방금 끝난 회차(initialEpisodeId)의 관찰 노트가 아직 만들어지는 중(10~35초)이면 그 사실을 보여 준다
  const [pendingExpired, setPendingExpired] = useState(false);
  useEffect(() => {
    if (!initialEpisodeId) return;
    const t = setTimeout(() => setPendingExpired(true), 90_000); // 90초가 지나도 안 오면 평소 화면으로
    return () => clearTimeout(t);
  }, [initialEpisodeId]);
  const pendingToday =
    !pendingExpired && Boolean(initialEpisodeId && !initialEpisodeId.startsWith("mock") && !episodes.some((e) => e.id === initialEpisodeId && e.report));
  const nightView = () => {
    if (pendingToday) {
      return (
        <section className={s.card} aria-live="polite">
          <h2>오늘 이야기로 관찰 노트를 만드는 중이에요</h2>
          <p className={s.sub}>30초쯤 걸려요. 다 되면 여기에 바로 나타나요. 그동안 아이에게 "잘 잤어?" 한마디 어때요?</p>
        </section>
      );
    }
    if (!night) return <p className={s.empty}>아직 끝난 이야기가 없어요. 첫 이야기를 마치면 여기에 관찰 노트가 생겨요.</p>;
    const r = night.report;
    const info = nightOf(night.startedAt);
    const planet = planetOf(night);
    const idx = episodes.findIndex((e) => e.id === night.id);
    const older = episodes[idx + 1], newer = episodes[idx - 1];
    return (
      <>
        <section className={`${s.card} ${s.hero}`}>
          {planet && <img className={s.heroPlanet} src={planet.img} alt="" />}
          <div className={s.heroText}>
            <p className={s.meta}>
              {info ? `${info.longDate} ${info.weekday} 밤` : ""} · {night.episodeNumber}화
            </p>
            <h1>{titleOf(night)}</h1>
            {r?.moodWeather && (
              <span className={s.tone}>
                {weatherIcon(r.moodWeather)}마음 날씨 {WEATHER_LABEL[r.moodWeather]}
              </span>
            )}
            {r?.planet && <span className={s.planetName}>{r.planet.planet}</span>}
          </div>
          {r?.moodEvidence?.[0] && <p className={s.toneEvidence}>근거: “{r.moodEvidence[0]}”</p>}
          {r?.summary && <p className={s.summary}>{r.summary}</p>}
          <button type="button" className={s.btnGhost} onClick={() => openEpisode(night.id, "book")}>
            {Icon.openBook}동화책으로 읽기
          </button>
          <div className={s.pager}>
            <button type="button" disabled={!older} onClick={() => older && setNightId(older.id)}>
              ← 이전 밤
            </button>
            <span>{night.episodeNumber}화</span>
            <button type="button" disabled={!newer} onClick={() => newer && setNightId(newer.id)}>
              다음 밤 →
            </button>
          </div>
        </section>

        {!r ? (
          <section className={s.card}>
            <p className={s.sub}>이 이야기의 관찰 노트를 아직 만드는 중이에요.</p>
          </section>
        ) : (
          <>
            {r.safetyFlags.length > 0 && (
              <section className={s.card} style={{ borderColor: "#f3c7b5" }}>
                <h2>함께 살펴봐 주세요</h2>
                <p className={s.sub}>이 이야기에 어른이 함께 들어 보면 좋은 말이 있었어요.</p>
                <div className={s.chips}>
                  {r.safetyFlags.map((f, i) => (
                    <span key={i} className={s.chip}>
                      {f}
                    </span>
                  ))}
                </div>
              </section>
            )}
            <section className={s.card}>
              <h2>이야기 속에서 이런 모습이 보였어요</h2>
              <p className={s.sub}>이 밤 대화에서 나온 관찰이에요.</p>
              {insightList(night)}
            </section>
            {(r.childQuotes.length > 0 || r.childChoices.length > 0) && (
              <section className={s.card}>
                <h2>{subj} 한 말</h2>
                <p className={s.sub}>고치지 않은 그대로예요.</p>
                {r.childQuotes.map((q, i) => (
                  <div key={i} className={s.quote}>
                    <p className={s.qmeta}>{night.episodeNumber}화</p>
                    <p>“{q}”</p>
                  </div>
                ))}
                {r.childChoices.length > 0 && (
                  <>
                    <p className={s.label} style={{ marginTop: 14 }}>
                      {subj} 고른 것
                    </p>
                    <div className={s.chips}>
                      {r.childChoices.map((c, i) => (
                        <span key={i} className={s.chip}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
            {r.lineForParent && (
              <section className={`${s.card} ${s.line}`}>
                <h2>오늘 건네볼 한마디</h2>
                <blockquote>“{r.lineForParent}”</blockquote>
                <button type="button" className={s.btnSignal} onClick={() => copyLine(r.lineForParent)}>
                  한마디 복사하기
                </button>
              </section>
            )}
            {(r.nextEpisodeTeaser || r.planet) && (
              <section className={s.card}>
                <div className={s.next}>
                  {planet && <img src={planet.img} alt="" />}
                  <p>
                    <b>내일 예고</b>
                    {r.nextEpisodeTeaser}
                  </p>
                </div>
                {r.planet && (
                  <>
                    <div className={s.progress} role="img" aria-label={`${r.planet.planet} 진행 ${r.planet.done}/${r.planet.total}`}>
                      <span style={{ width: `${(r.planet.done / r.planet.total) * 100}%` }} />
                    </div>
                    <p className={s.fine}>
                      {r.planet.planet} {r.planet.done}/{r.planet.total}
                      {r.planet.goal ? ` · 다음 목표: ${r.planet.goal}` : ""}
                    </p>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </>
    );
  };

  const weekView = () => {
    const quote = weekly.quote;
    const kw = new Map<string, number>();
    episodes
      .filter((e) => weekly.days.some((d) => d.date === nightOf(e.startedAt)?.date))
      .forEach((e) => e.report?.keywords?.forEach((k) => kw.set(k.word, (kw.get(k.word) ?? 0) + k.count)));
    const words = [...kw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const latestWeek = withReport.find((e) => weekly.days.some((d) => d.date === nightOf(e.startedAt)?.date));
    const planet = planetOf(latestWeek);
    return (
      <>
        <section className={`${s.card} ${s.hero}`}>
          {planet && <img className={s.heroPlanet} src={planet.img} alt="" />}
          <div className={s.heroText}>
            <p className={s.meta}>
              {weekly.weekRangeLabel} · 이야기 {weekly.storyCount}화
            </p>
            <h1>{weekly.headline}</h1>
          </div>
          <div className={s.week}>
            {weekly.days.map((d) => (
              <div key={d.date} className={`${s.day} ${d.isToday ? s.dayToday : ""}`}>
                {d.episodeId ? (
                  <button
                    type="button"
                    aria-label={`${d.weekday} 이야기 보기`}
                    onClick={() => {
                      setNightId(d.episodeId);
                      setRange("night");
                      window.scrollTo(0, 0);
                    }}
                  >
                    {d.label}
                    {weatherIcon(d.weather)}
                  </button>
                ) : (
                  <>
                    {d.label}
                    {weatherIcon(null)}
                    <span className={s.rest}>{d.isToday ? "오늘 밤" : d.isFuture ? "" : "쉼"}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className={s.toneNote}>마음 날씨는 이야기 속에서 아이가 한 말에서만 읽었어요. 진단이 아니에요.</p>
        </section>

        {weekly.bullets.length > 0 && (
          <section className={s.card}>
            <h2>이번 주에 이런 모습이 보였어요</h2>
            <p className={s.sub}>여러 밤의 기록에서 나온 모습이에요.</p>
            <ul className={s.insights}>
              {weekly.bullets.map((b, i) => (
                <li key={i} className={s.insight}>
                  <p>{b.text}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {quote && (
          <section className={s.card}>
            <h2>{subj} 한 말</h2>
            <div className={s.quote}>
              <p className={s.qmeta}>
                {quote.weekdayLabel} · {quote.episodeNumber}화
              </p>
              <p>“{quote.text}”</p>
            </div>
            {words.length > 0 && (
              <>
                <p className={s.label} style={{ marginTop: 14 }}>
                  이야기에 자주 나온 말
                </p>
                <div className={s.chips}>
                  {words.map(([w, c]) => (
                    <span key={w} className={s.chip}>
                      {w} <small>{c}번</small>
                    </span>
                  ))}
                </div>
              </>
            )}
            <button type="button" className={s.btnGhost} onClick={() => openEpisode(quote.episodeId, "notes")}>
              이야기 전체 보기 {Icon.chev}
            </button>
          </section>
        )}

        {latestWeek?.report?.lineForParent && (
          <section className={`${s.card} ${s.line}`}>
            <h2>오늘 건네볼 한마디</h2>
            <blockquote>“{latestWeek.report.lineForParent}”</blockquote>
            <button type="button" className={s.btnSignal} onClick={() => copyLine(latestWeek.report!.lineForParent)}>
              한마디 복사하기
            </button>
          </section>
        )}
      </>
    );
  };

  const seedCard = () => {
    const suggestion = (withReport[0]?.report?.seedSuggestions ?? [])[0];
    return (
      <section className={s.card}>
        <h2>{seedCopy.title}</h2>
        <p className={s.sub}>{seedCopy.body.replace("{name}", call)}</p>
        <div className={s.seeds}>
          {seedCopy.options.map((o) => (
            <button
              key={o.preset}
              type="button"
              className={s.seed}
              aria-pressed={seed === o.preset}
              onClick={() => {
                setSeed(seed === o.preset ? null : o.preset);
                setSeedState("idle");
              }}
            >
              <b>{o.label}</b>
              <span>{o.desc}</span>
            </button>
          ))}
        </div>
        {suggestion && (
          <p className={s.suggest}>
            추천 <b>{suggestion.label}</b> · {suggestion.reason}
          </p>
        )}
        <button type="button" className={s.btn} onClick={saveSeed} disabled={seedState === "saving" || seed === (child?.savedSeed ?? null)}>
          {seedState === "saving" ? "담는 중…" : seedCopy.cta}
        </button>
        {seedState === "saved" && (
          <p className={s.saved} role="status">
            {seed ? "내일 이야기에 담았어요." : "담아 둔 마음을 비웠어요."}
          </p>
        )}
        {seedState === "error" && (
          <p className={s.saved} role="alert" style={{ color: "#b4432f" }}>
            저장하지 못했어요. 잠시 뒤에 다시 해 주세요.
          </p>
        )}
      </section>
    );
  };

  const reportView = () => (
    <>
      <div className={s.seg} role="group" aria-label="리포트 기간">
        <button type="button" aria-pressed={range === "night"} onClick={() => setRange("night")}>
          하루씩 보기
        </button>
        <button type="button" aria-pressed={range === "week"} onClick={() => setRange("week")}>
          이번 주
        </button>
      </div>
      {noteCard}
      {range === "night" ? nightView() : weekView()}
      {seedCard()}
      <div className={s.plan}>
        <span>
          <b>{PRICE_LABEL}</b> · {TRIAL_LABEL}
        </span>
        <button type="button" onClick={() => setPayOpen(true)}>
          결제
        </button>
      </div>
      <PayModal open={payOpen} onClose={() => setPayOpen(false)} />
    </>
  );

  // 이야기 기록: 별마다 책 한 권
  const shelves = useMemo(() => {
    const map = new Map<string, ParentEpisode[]>();
    for (const e of episodes) {
      const key = e.report?.planet?.id || "etc";
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].map(([key, eps]) => {
      const p = PLANETS.find((x) => x.id === key);
      const nights = eps.map((e) => nightOf(e.startedAt)).filter(Boolean);
      return {
        key,
        name: p?.name ?? eps.find((e) => e.report?.planet?.planet)?.report?.planet?.planet ?? "우리 별",
        img: p?.img ?? PLANETS[0].img,
        tint: { forest: "#dcf1e3", waterfire: "#d9eef3", upside: "#fbe6cc", rainbow: "#efeaf8" }[key] ?? "#f3ece2",
        spine: { forest: "#b6dfc4", waterfire: "#b4dbe4", upside: "#efcc9f", rainbow: "#d8cff0" }[key] ?? "#e4d8c6",
        from: nights[nights.length - 1]?.dateLabel ?? "",
        to: nights[0]?.dateLabel ?? "",
        episodes: eps,
      };
    });
  }, [episodes]);
  const selShelf = shelves.find((x) => x.key === shelf) ?? shelves[0];

  const libraryView = () => (
    <>
      <div className={s.shelfHead}>
        <h1>{call}의 책장</h1>
        <span>
          별 {shelves.length}권 · 이야기 {episodes.length}화
        </span>
      </div>
      {!shelves.length ? (
        <p className={s.empty}>아직 끝난 이야기가 없어요.</p>
      ) : (
        <>
          <div className={s.shelf}>
            {shelves.map((sh) => (
              <button key={sh.key} type="button" className={s.book} aria-pressed={sh.key === selShelf?.key} onClick={() => setShelf(sh.key)}>
                <span className={s.cover} style={{ background: sh.tint }}>
                  <img src={sh.img} alt="" />
                </span>
                <b>{sh.name}</b>
                <small>
                  {sh.from}
                  {sh.to && sh.to !== sh.from ? ` – ${sh.to}` : ""}
                </small>
              </button>
            ))}
          </div>
          {selShelf && (
            <section className={`${s.card} ${s.toc}`} style={{ ["--toc-spine" as string]: selShelf.spine }}>
              <h2>{selShelf.name}</h2>
              <p className={s.sub}>이야기 {selShelf.episodes.length}화</p>
              <p className={s.label}>목차</p>
              <ol>
                {selShelf.episodes.map((e, i) => {
                  const info = nightOf(e.startedAt);
                  return (
                    <li key={e.id}>
                      <button type="button" className={s.ep} onClick={() => openEpisode(e.id, "book")}>
                        <span className={s.n}>
                          {e.episodeNumber}
                          <small>화</small>
                        </span>
                        <span>
                          <strong>
                            {titleOf(e)}
                            {i === 0 && selShelf === shelves[0] && <span className={s.newTag}>최근</span>}
                          </strong>
                          <span>{info ? `${info.dateLabel} ${info.weekdayShort}` : ""}</span>
                        </span>
                        {weatherIcon(e.report?.moodWeather)}
                        {Icon.chev}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </>
  );

  const episodeView = (ep: ParentEpisode) => {
    const r = ep.report;
    const info = nightOf(ep.startedAt);
    const sh = shelves.find((x) => x.episodes.some((e) => e.id === ep.id));
    const list = sh?.episodes ?? [ep];
    const idx = list.findIndex((e) => e.id === ep.id);
    const newer = list[idx - 1], older = list[idx + 1];
    const paragraphs = (ep.storybookText ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
    return (
      <>
        <button type="button" className={s.back} onClick={() => setEpId(null)}>
          {Icon.back}
          {epFrom === "report" ? "리포트로" : "목차로"}
        </button>
        <section className={`${s.card} ${s.toc}`} style={{ ["--toc-spine" as string]: sh?.spine ?? "#e4d8c6" }}>
          <div className={s.epHead}>
            <p className={s.meta}>
              {sh?.name ?? ""} {ep.episodeNumber}화{info ? ` · ${info.dateLabel} ${info.weekday} 밤` : ""}
            </p>
            <h1>{titleOf(ep)}</h1>
            {r?.moodWeather && (
              <span className={s.tone}>
                {weatherIcon(r.moodWeather)}마음 날씨 {WEATHER_LABEL[r.moodWeather]}
              </span>
            )}
          </div>
          <div className={s.seg} role="group" aria-label="보기 방식" style={{ margin: "16px 0 4px" }}>
            <button type="button" aria-pressed={epView === "book"} onClick={() => setEpView("book")}>
              동화책
            </button>
            <button type="button" aria-pressed={epView === "notes"} onClick={() => setEpView("notes")}>
              한 말 · 고른 것
            </button>
          </div>
          {epView === "book" ? (
            paragraphs.length ? (
              <>
                <div className={s.storybook}>
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <p className={s.fine}>아이의 아이디어와 선택은 바꾸지 않고 문장만 다듬었어요.</p>
              </>
            ) : (
              <p className={s.empty}>동화책을 아직 만드는 중이에요.</p>
            )
          ) : (
            <div style={{ paddingTop: 10 }}>
              {r?.childQuotes.map((q, i) => (
                <div key={i} className={s.quote}>
                  <p className={s.qmeta}>{subj} 한 말</p>
                  <p>“{q}”</p>
                </div>
              ))}
              {!!r?.childChoices.length && (
                <>
                  <p className={s.label} style={{ marginTop: 14 }}>
                    {subj} 고른 것
                  </p>
                  <div className={s.chips}>
                    {r.childChoices.map((c, i) => (
                      <span key={i} className={s.chip}>
                        {c}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {r && (
                <div style={{ marginTop: 16 }}>
                  <p className={s.label}>이 이야기에서 보인 모습</p>
                  {insightList(ep)}
                </div>
              )}
              <p className={s.fine}>목소리는 저장하지 않아요. 전체 대화 기록은 서버 연결 후 여기서 볼 수 있어요.</p>
            </div>
          )}
          <button type="button" className={s.btnGhost} onClick={() => sheetRef.current?.showModal()}>
            {Icon.share}공유 카드 만들기
          </button>
          <div className={s.pager}>
            <button type="button" disabled={!older} onClick={() => older && openEpisode(older.id, epView)}>
              ← {older ? `${older.episodeNumber}화` : ""}
            </button>
            <span>— {ep.episodeNumber} —</span>
            <button type="button" disabled={!newer} onClick={() => newer && openEpisode(newer.id, epView)}>
              {newer ? `${newer.episodeNumber}화` : ""} →
            </button>
          </div>
        </section>

        <dialog ref={sheetRef} className={s.sheet} onClick={(e) => e.target === sheetRef.current && sheetRef.current?.close()}>
          <h2>공유 카드</h2>
          <p>회차 제목과 별 그림만 들어가요. 아이 프로필, 관찰 노트, 마음 담기는 들어가지 않아요.</p>
          <div className={s.share}>
            <img src={(planetOf(ep) ?? PLANETS[0]).img} alt="" />
            <small>
              {sh?.name} {ep.episodeNumber}화
            </small>
            <b>{titleOf(ep)}</b>
            {shareQuote && r?.childQuotes[0] && <q>{r.childQuotes[0]}</q>}
          </div>
          <label className={s.toggle}>
            <span>아이가 한 말 한 줄 넣기</span>
            <input type="checkbox" checked={shareQuote} onChange={(e) => setShareQuote(e.target.checked)} />
          </label>
          <div className={s.sheetActions}>
            <button type="button" className={s.btnGhost} onClick={() => sheetRef.current?.close()}>
              닫기
            </button>
            <button
              type="button"
              className={s.btn}
              onClick={async () => {
                sheetRef.current?.close();
                try {
                  const res = await fetch(`/api/episodes/${encodeURIComponent(ep.id)}/share`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ includeQuote: shareQuote }),
                  });
                  if (!res.ok) throw new Error(String(res.status));
                  const body = (await res.json()) as { url?: string; token?: string };
                  const link = body.url ?? (body.token ? `${location.origin}/share/${body.token}` : null);
                  if (!link) throw new Error("no link");
                  await navigator.clipboard.writeText(link);
                  say("공유 링크를 복사했어요");
                } catch {
                  say("공유 링크는 아직 준비 중이에요");
                }
              }}
            >
              링크 복사
            </button>
          </div>
        </dialog>
      </>
    );
  };

  const settingsView = () => <Settings say={say} goKid={goKid} childName={name} ageLabel={child?.ageLabel ?? null} />;

  const tabs: [ParentTab, string, React.ReactNode][] = [
    ["report", "교신 리포트", Icon.report],
    ["library", "이야기 기록", Icon.book],
    ["settings", "설정", Icon.gear],
  ];

  return (
    <div className={s.page}>
      <div className={s.root}>
        {header}
        {source === "mock" && status === "ready" && (
          <p className={s.sample}>
            미리보기 · <b>예시 데이터</b>로 보여 드려요
          </p>
        )}
        <main aria-busy={status === "loading"}>
          {status === "loading" ? (
            <p className={s.empty}>기록을 불러오는 중이에요…</p>
          ) : openEp ? (
            episodeView(openEp)
          ) : tab === "report" ? (
            reportView()
          ) : tab === "library" ? (
            libraryView()
          ) : (
            settingsView()
          )}
        </main>
        <nav className={s.tabs} aria-label="부모 메뉴">
          {tabs.map(([k, l, i]) => (
            <button key={k} type="button" aria-current={tab === k && !openEp ? "page" : undefined} onClick={() => goTab(k)}>
              {i}
              {l}
            </button>
          ))}
        </nav>
      </div>
      <div className={`${s.toast} ${toast ? s.toastShow : ""}`} role="status">
        {toast}
      </div>
    </div>
  );
}

function Settings({ say, goKid, childName, ageLabel }: { say: (t: string) => void; goKid: () => void; childName: string | null; ageLabel: string | null }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      say("이메일 주소를 확인해 주세요");
      return;
    }
    setBusy(true);
    try {
      if (agree) {
        const res = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), consent: true }) });
        if (!res.ok) throw new Error(String(res.status));
      }
      say(agree ? "사전 신청을 받았어요" : "로그인 링크는 로그인 화면에서 받을 수 있어요");
    } catch {
      say("지금은 신청을 받을 수 없어요. 잠시 뒤에 다시 해 주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={s.shelfHead}>
        <h1>설정</h1>
      </div>
      <section className={s.card}>
        <h2>아이</h2>
        <div className={s.row}>
          부르는 이름<span>{childName ?? "이야기 속에서 알려 줘요"}</span>
        </div>
        <div className={s.row}>
          나이<span>{ageLabel ?? "-"}</span>
        </div>
        <p className={s.fine}>이름과 나이는 이야기의 말투와 길이를 맞추는 데만 써요. 성별·관심사는 받지 않아요.</p>
      </section>
      <section className={s.card}>
        <h2>부모 확인</h2>
        <div className={s.row}>
          들어오는 방법<span>부모님 버튼 2초 누르기 + 계산 문제</span>
        </div>
        <div className={s.row}>
          비밀번호(PIN)<span>준비 중이에요</span>
        </div>
      </section>
      <section className={s.card}>
        <h2>목소리와 기록</h2>
        <p className={s.sub}>목소리는 저장하지 않아요. 아이가 한 말은 글로만 남고, 부모 확인을 거쳐야 볼 수 있어요. 아이 화면에는 관찰 노트와 마음 담기가 보이지 않아요.</p>
      </section>
      <section className={s.card}>
        <h2>다른 기기에서도 보기</h2>
        <p className={s.sub}>로그인하지 않아도 이 기기에서는 그대로 쓸 수 있어요. 다른 기기에서도 보려면 이메일로 링크를 받아요.</p>
        <div className={s.field}>
          <label htmlFor="parent-email">이메일</label>
          <input id="parent-email" type="email" inputMode="email" autoComplete="email" placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <label className={s.check}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>정식 출시 소식과 사전 신청 안내를 받을게요 (선택)</span>
        </label>
        <button type="button" className={s.btn} onClick={submit} disabled={busy}>
          {busy ? "보내는 중…" : "신청하기"}
        </button>
        <Link href="/login" className={s.btnGhost}>
          로그인 화면으로
        </Link>
        <div className={s.row} style={{ marginTop: 12 }}>
          요금제
          <span>
            <b style={{ color: "#1b1f2e" }}>{PRICE_LABEL}</b> · {TRIAL_LABEL}
          </span>
        </div>
      </section>
      <button type="button" className={s.btnGhost} onClick={goKid}>
        {Icon.kid}아이 모드로 돌아가기
      </button>
    </>
  );
}

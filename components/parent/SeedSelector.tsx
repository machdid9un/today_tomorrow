"use client";
// 내일 이야기에 마음 담기 (= 오늘의 씨앗). 소유: 역할 4.
// 문구는 lib/story/seedPresets.ts(SEED_OPTIONS·SEED_PRESET_PARENT_COPY·SEED_SECTION_COPY)가 정본이고,
// 서버 컴포넌트(app/parent/page.tsx)가 그 값을 copy로 내려준다(seedPresets → llm 모듈이 브라우저로 딸려 오지 않게).
// 저장: PATCH /api/sessions/[worldId]/seed { preset }. 실패해도 고른 마음은 그대로 두고 부드럽게 알린다.
import { useState } from "react";
import { familiarName } from "@/lib/story/weeklyReport";
import { CheckIcon } from "./icons";
import { useParentData } from "./ParentDataProvider";
import { saveSeedPreset, type ChildProfile, type SeedOptionCopy, type SeedSectionCopy } from "./parentData";
import { Card, CardTitle, focusRing } from "./ui";

export type SeedOption = SeedOptionCopy["preset"];

export interface SeedSelectorProps {
  copy: SeedSectionCopy;
  child: ChildProfile;
  isMock: boolean;
  /** 고른 마음 (대시보드가 들고 있어서 하루씩 보기의 추천에서도 고를 수 있다) */
  selected: SeedOption | null;
  onSelectedChange: (preset: SeedOption | null) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error" | "need";

export default function SeedSelector({ copy, child, isMock, selected, onSelectedChange }: SeedSelectorProps) {
  const { setSavedSeed } = useParentData();
  const [state, setState] = useState<SaveState>("idle");
  const [errorText, setErrorText] = useState("");
  const body = copy.body.replace("{name}", familiarName(child.name) ?? "아이");
  const selectedCopy = copy.options.find((o) => o.preset === selected) ?? null;

  const choose = (preset: SeedOption) => {
    onSelectedChange(selected === preset ? null : preset);
    setState("idle");
  };

  const save = async () => {
    if (state === "saving") return;
    if (!selected) {
      setState("need");
      return;
    }
    setState("saving");
    if (isMock) {
      await new Promise((r) => setTimeout(r, 350));
      setSavedSeed(child.key, selected);
      setState("saved");
      return;
    }
    if (!child.worldId) {
      setErrorText("어느 아이의 이야기인지 찾지 못해 담지 못했어요. 고른 마음은 그대로 두었어요.");
      setState("error");
      return;
    }
    const ok = await saveSeedPreset(child.worldId, selected);
    if (ok) {
      setSavedSeed(child.key, selected);
      setState("saved");
    } else {
      setErrorText("지금은 담지 못했어요. 고른 마음은 그대로 두었으니 잠시 뒤에 다시 눌러 주세요.");
      setState("error");
    }
  };

  return (
    <Card aria-labelledby="seed-title">
      <CardTitle id="seed-title">{copy.title}</CardTitle>
      <p id="seed-help" className="mt-2 text-[14px] leading-[1.6] text-[#565073]">
        {body}
      </p>

      <div role="group" aria-labelledby="seed-title" aria-describedby="seed-help" className="mt-4 grid grid-cols-2 gap-2.5">
        {copy.options.map((o) => {
          const on = selected === o.preset;
          const saved = child.savedSeed === o.preset;
          return (
            <button
              key={o.preset}
              type="button"
              aria-pressed={on}
              onClick={() => choose(o.preset)}
              className={`relative flex min-h-[88px] flex-col items-start justify-start rounded-[15px] border px-3.5 py-3 text-left transition ${
                on
                  ? "border-[#20213d] bg-[#20213d] text-white"
                  : "border-[#ddd5ea] bg-[#fffaf2] text-[#20213d] hover:border-[#b6abd9]"
              } ${focusRing}`}
            >
              <span className="pr-5 text-[15px] font-bold leading-snug">{o.label}</span>
              <span className={`mt-1.5 text-[12.5px] leading-[1.45] ${on ? "text-[#dcd8ee]" : "text-[#565073]"}`}>{o.desc}</span>
              {saved && (
                <span
                  className={`absolute right-2.5 top-2.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
                    on ? "bg-[#ffe2a2] text-[#20213d]" : "bg-[#b6abd9]/30 text-[#3b3760]"
                  }`}
                >
                  담김
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        aria-busy={state === "saving"}
        className={`mt-4 flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-[15px] bg-[#ff876e] px-4 text-[16px] font-bold text-[#20213d] transition hover:bg-[#ff7a5e] active:scale-[0.99] ${focusRing} ${
          state === "saving" ? "opacity-70" : ""
        }`}
      >
        {state === "saved" ? (
          <>
            <CheckIcon size={18} /> 내일 이야기에 담았어요
          </>
        ) : state === "saving" ? (
          "담는 중…"
        ) : (
          copy.cta
        )}
      </button>

      <p role="status" aria-live="polite" className="mt-3 min-h-[1px] text-[13px] leading-[1.55]">
        {state === "need" && <span className="text-[#7a3a24]">담을 마음을 하나 골라 주세요.</span>}
        {state === "error" && <span className="text-[#7a3a24]">{errorText}</span>}
        {state === "saved" && selectedCopy && (
          <span className="text-[#3d3a57]">
            내일 밤 이야기 용이 ‘{selectedCopy.label}’ 마음으로 곁에 있을게요.
            {isMock && <span className="text-[#565073]"> (예시 데이터라 실제로 저장되지는 않아요)</span>}
          </span>
        )}
      </p>
    </Card>
  );
}

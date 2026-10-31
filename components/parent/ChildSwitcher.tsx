"use client";
// 아이 바꾸기 알약 버튼 ("민준 · 2학년 ⌄"). 소유: 역할 4.
import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDown } from "./icons";
import { useParentData } from "./ParentDataProvider";
import { focusRing } from "./ui";
import type { ChildProfile } from "./parentData";

const labelOf = (c: ChildProfile) => [c.name ?? "우리 아이", c.ageLabel].filter(Boolean).join(" · ");

export default function ChildSwitcher() {
  const { status, children, activeChild, selectChild } = useParentData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]') ??
      menuRef.current?.querySelector<HTMLElement>("[role=menuitemradio]");
    first?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "loading" || !activeChild) {
    return <div aria-hidden="true" className="h-11 w-[118px] animate-pulse rounded-full bg-[#f1e4cf]" />;
  }

  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitemradio]") ?? []);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length];
    next?.focus();
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`아이 바꾸기, 지금 ${labelOf(activeChild)}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 max-w-[46vw] items-center gap-1.5 rounded-full border border-[#d9d2e9] bg-[#fffaf2] pl-4 pr-3 text-[14px] font-medium text-[#20213d] ${focusRing}`}
      >
        <span className="truncate">{labelOf(activeChild)}</span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="아이 고르기"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+6px)] z-30 w-[200px] overflow-hidden rounded-[20px] border border-[#e6dcef] bg-[#fffaf2] p-1.5 shadow-[0_12px_32px_rgba(32,33,61,0.14)]"
        >
          {children.map((c) => {
            const selected = c.key === activeChild.key;
            return (
              <button
                key={c.key}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  selectChild(c.key);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-[15px] px-3 text-left text-[14px] ${
                  selected ? "bg-[#20213d] font-bold text-white" : "text-[#20213d] hover:bg-[#f6efe2]"
                } ${focusRing}`}
              >
                <span className="truncate">{labelOf(c)}</span>
                {selected && <CheckIcon size={16} />}
              </button>
            );
          })}
          <p className="px-3 pb-1.5 pt-2 text-[12px] leading-snug text-[#565073]">아이 추가는 곧 열려요.</p>
        </div>
      )}
    </div>
  );
}

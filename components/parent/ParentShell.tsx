"use client";
// 부모 화면 틀: 머리(로고·예시 데이터 표시·아이 바꾸기) + 본문 + 하단 탭. 소유: 역할 4.
import Link from "next/link";
import { usePathname } from "next/navigation";
import ChildSwitcher from "./ChildSwitcher";
import { BookNavIcon, GearNavIcon, ReportNavIcon } from "./icons";
import { useParentData } from "./ParentDataProvider";
import { focusRing } from "./ui";

const NAV = [
  { href: "/parent", label: "마음 리포트", Icon: ReportNavIcon, match: (p: string) => p === "/parent" },
  { href: "/parent/episodes", label: "이야기 기록", Icon: BookNavIcon, match: (p: string) => p.startsWith("/parent/episodes") },
  { href: "/parent/settings", label: "설정", Icon: GearNavIcon, match: (p: string) => p.startsWith("/parent/settings") },
];

export default function ParentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/parent";
  const { status, source } = useParentData();

  return (
    <div className="min-h-dvh overflow-x-clip break-keep bg-[#fff4df] font-sans text-[#20213d] antialiased">
      <header className="mx-auto flex w-full max-w-[430px] items-center justify-between gap-3 px-4 pb-3 pt-[max(16px,env(safe-area-inset-top))]">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/parent" className={`shrink-0 rounded-md font-display text-[23px] leading-none tracking-tight ${focusRing}`}>
            <span className="text-[#e5603f]">상상</span> <span className="text-[#6c5ccf]">무전기</span>
          </Link>
          {status === "ready" && source === "mock" && (
            <span
              className="shrink-0 rounded-full border border-[#e3d6c0] bg-[#fffaf2]/70 px-2 py-0.5 text-[11px] font-medium text-[#565073]"
              title="아직 실제 기록을 불러오지 못해 예시 데이터를 보여 주고 있어요"
            >
              예시 데이터
            </span>
          )}
        </div>
        <ChildSwitcher />
      </header>

      <main className="mx-auto w-full max-w-[430px] px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">{children}</main>

      <nav
        aria-label="부모 화면 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[#efe1c9] bg-[#fffaf2]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto grid max-w-[430px] grid-cols-3">
          {NAV.map(({ href, label, Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[12px] ${
                    active ? "font-bold text-[#20213d]" : "text-[#565073]"
                  } ${focusRing}`}
                >
                  <Icon size={22} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

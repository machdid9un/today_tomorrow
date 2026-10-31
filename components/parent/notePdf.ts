// 이야기 관찰 노트 PDF: 브라우저에서 A4 페이지를 캔버스로 그려 JPEG로 담은 PDF를 만든다 (새 라이브러리 없음). 소유: 역할 4.
// 내용 원칙(README §5 ④): 진단·성격 단정 없음, 모든 관찰에 아이가 한 말을 근거로 붙임. 글자는 그림이라 PDF 안 검색은 안 됨.
import type { MoodWeather } from "@/lib/story/reportGenerator";

export interface NoteEvidence {
  label: string;
  text: string;
}
export interface NoteItem {
  label: string;
  text?: string;
  ev: NoteEvidence[];
}
export interface NoteData {
  childName: string;
  /** 민준이 / 서아 */
  childCall: string;
  ageLabel: string | null;
  period: string;
  planet: string | null;
  planetImg: string | null;
  count: number;
  intro: string;
  week: { day: string; weather: MoodWeather | null; label: string }[];
  insights: NoteItem[];
  quotes: NoteEvidence[];
  keywords: { word: string; count: number }[];
  choices: { label: string; items: string[] }[];
  line: string | null;
  next: string[];
  notice: string[];
  sample: boolean;
}

const W = 1240, H = 1754, M = 104, CW = W - M * 2, BOTTOM = H - 150;
const BODY = '"Noto Sans KR", sans-serif';
const HEAD = "Jua, sans-serif";
const C = { ink: "#1f1d2b", muted: "#6c6779", faint: "#9a94a8", purple: "#6454a4", lav: "#f2effb", lavInk: "#4a3f86", cream: "#fffaf3", warm: "#ffe6c7", line: "#eadfce", green: "#3f9a6b", navy: "#22234a" };

export async function makeNotePdf(data: NoteData): Promise<Blob> {
  // 웹 서체는 글자 묶음별로 받아지므로, 노트에 나오는 글자 전부를 미리 받아 둔다 (안 하면 일부 글자만 다른 서체)
  const corpus = "쫑긋 · 이야기 관찰 노트 요즘 샘플 기록 관찰 아이가 한 말 자주 쓴 낱말 고른 것 함께 해 볼 수 있는 것 꼭 읽어 주세요 건네볼 한마디 마음 날씨 진단이 아닌 기록이에요 화 번 0123456789 / “”" + JSON.stringify(data);
  await Promise.all([
    document.fonts.load(`400 26px ${BODY}`, corpus),
    document.fonts.load(`500 26px ${BODY}`, corpus),
    document.fonts.load(`700 26px ${BODY}`, corpus),
    document.fonts.load(`40px ${HEAD}`, corpus),
  ]).catch(() => undefined);
  const planetImg = data.planetImg ? await loadImg(data.planetImg) : null;

  const pages: HTMLCanvasElement[] = [];
  let ctx!: CanvasRenderingContext2D;
  let y = 0;
  const newPage = () => {
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    ctx = cv.getContext("2d")!;
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    pages.push(cv);
    y = M;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const wrap = (text: string, font: string, maxW: number) => {
    ctx.font = font;
    const out: string[] = [];
    let line = "";
    for (const word of String(text).split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) out.push(line);
      if (ctx.measureText(word).width <= maxW) {
        line = word;
        continue;
      }
      let part = "";
      for (const ch of word) {
        if (ctx.measureText(part + ch).width > maxW) {
          out.push(part);
          part = ch;
        } else part += ch;
      }
      line = part;
    }
    if (line) out.push(line);
    return out;
  };
  const text = (t: string, { font = `400 25px ${BODY}`, color = C.ink, lh = 42, x = M, maxW = CW } = {}) => {
    for (const l of wrap(t, font, maxW)) {
      ensure(lh);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.fillText(l, x, y);
      y += lh;
    }
  };
  const box = (x: number, yy: number, w: number, h: number, r: number, fill: string) => {
    ctx.beginPath();
    ctx.roundRect(x, yy, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const section = (n: number, title: string, sub?: string) => {
    ensure(190);
    y += 34;
    box(M, y, 52, 52, 26, C.purple);
    ctx.fillStyle = "#fff";
    ctx.font = `32px ${HEAD}`;
    ctx.textAlign = "center";
    ctx.fillText(String(n), M + 26, y + 9);
    ctx.textAlign = "left";
    ctx.fillStyle = C.ink;
    ctx.font = `40px ${HEAD}`;
    ctx.fillText(title, M + 72, y + 4);
    y += 70;
    if (sub) text(sub, { font: `400 22px ${BODY}`, color: C.muted, lh: 36 });
    y += 12;
  };
  const evidence = (list: NoteEvidence[]) => {
    for (const e of list) {
      const lines = wrap(e.text, `500 23px ${BODY}`, CW - 64);
      const h = 26 + 30 + lines.length * 36 + 18;
      ensure(h + 10);
      box(M + 24, y, CW - 24, h, 18, C.lav);
      ctx.fillStyle = C.lavInk;
      ctx.font = `700 19px ${BODY}`;
      ctx.fillText(e.label, M + 48, y + 18);
      ctx.fillStyle = C.ink;
      ctx.font = `500 23px ${BODY}`;
      lines.forEach((l, i) => ctx.fillText(l, M + 48, y + 50 + i * 36));
      y += h + 10;
    }
  };
  const item = (title: string, body: string | undefined, ev: NoteEvidence[]) => {
    ensure(120);
    box(M, y + 12, 10, 10, 5, C.purple);
    ctx.fillStyle = C.ink;
    ctx.font = `700 27px ${BODY}`;
    for (const [i, l] of wrap(title, `700 27px ${BODY}`, CW - 24).entries()) {
      ensure(40);
      ctx.font = `700 27px ${BODY}`;
      ctx.fillStyle = C.ink;
      ctx.fillText(l, M + 24, y);
      y += i >= 0 ? 40 : 0;
    }
    y += 4;
    if (body) text(body, { x: M + 24, maxW: CW - 24, color: "#3c3748" });
    y += 6;
    if (ev.length) evidence(ev);
    y += 14;
  };
  const bullet = (s: string, color: string) => {
    ensure(50);
    box(M + 4, y + 14, 10, 10, 5, color);
    text(s, { x: M + 28, maxW: CW - 28, color: "#3c3748" });
    y += 4;
  };
  const weatherDot = (x: number, yy: number, w: MoodWeather | null) => {
    ctx.save();
    if (w === "sunny" || w === "partly_cloudy") {
      ctx.beginPath();
      ctx.arc(x, yy, w === "sunny" ? 17 : 13, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc85a";
      ctx.fill();
    }
    if (w === "partly_cloudy" || w === "cloudy" || w === "rainy") {
      ctx.beginPath();
      ctx.ellipse(x + (w === "partly_cloudy" ? 8 : 0), yy + (w === "partly_cloudy" ? 7 : 0), 20, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = w === "partly_cloudy" ? "#ffffff" : "#e4dff0";
      ctx.fill();
      ctx.strokeStyle = "#b4adc8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (w === "rainy") {
      ctx.strokeStyle = "#8fb6e0";
      ctx.lineWidth = 3;
      for (const dx of [-8, 2, 12]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, yy + 16);
        ctx.lineTo(x + dx - 3, yy + 26);
        ctx.stroke();
      }
    }
    if (!w) {
      ctx.beginPath();
      ctx.arc(x, yy, 14, 0, Math.PI * 2);
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "#cdbfae";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  };

  // 1쪽 머리
  newPage();
  const g = ctx.createLinearGradient(0, 0, 0, 430);
  g.addColorStop(0, C.warm);
  g.addColorStop(1, C.cream);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 430);
  if (planetImg) {
    const iw = 250, ih = (planetImg.height * iw) / planetImg.width;
    ctx.drawImage(planetImg, W - M - iw, 70, iw, ih);
  }
  ctx.fillStyle = "#9b6e45";
  ctx.font = `700 22px ${BODY}`;
  ctx.fillText("쫑긋 · 이야기 관찰 노트", M, M);
  ctx.fillStyle = C.ink;
  ctx.font = `68px ${HEAD}`;
  ctx.fillText(`${data.childCall} 요즘 이야기`, M, M + 44);
  ctx.font = `400 25px ${BODY}`;
  ctx.fillStyle = "#5b4c42";
  ctx.fillText([data.childName, data.ageLabel, data.period].filter(Boolean).join(" · "), M, M + 136);
  ctx.font = `500 22px ${BODY}`;
  ctx.fillStyle = "#8a6a52";
  ctx.fillText([data.planet, `이야기 ${data.count}화`].filter(Boolean).join(" · "), M, M + 178);
  if (data.sample) {
    box(M, M + 226, 148, 40, 20, "#ffffff");
    ctx.fillStyle = C.muted;
    ctx.font = `700 19px ${BODY}`;
    ctx.fillText("예시 데이터", M + 24, M + 235);
  }
  y = 460;
  text(data.intro, { color: "#3c3748" });
  y += 18;

  ensure(170);
  box(M, y, CW, 150, 22, "#ffffff");
  const cell = CW / 7;
  data.week.forEach((d, i) => {
    const cx = M + cell * i + cell / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = C.muted;
    ctx.font = `700 21px ${BODY}`;
    ctx.fillText(d.day, cx, y + 20);
    weatherDot(cx, y + 76, d.weather);
    ctx.font = `400 17px ${BODY}`;
    ctx.fillStyle = C.faint;
    ctx.fillText(d.label, cx, y + 108);
    ctx.textAlign = "left";
  });
  y += 164;
  text("마음 날씨는 이야기 속에서 아이가 한 말에서만 읽었어요. 진단이 아니에요.", { font: `400 19px ${BODY}`, color: C.faint, lh: 30 });

  let n = 1;
  if (data.insights.length) {
    section(n++, "이야기 속에서 보인 모습", "관찰마다 근거가 된 아이의 말을 붙였어요.");
    data.insights.forEach((t) => item(t.label, t.text, t.ev));
  }
  if (data.quotes.length) {
    section(n++, `${data.childCall}${hasBatchim(data.childCall) ? "이" : "가"} 한 말`, "고치지 않은 그대로예요.");
    evidence(data.quotes);
  }
  if (data.keywords.length) {
    section(n++, "자주 쓴 낱말", "이번 주 이야기에서 여러 번 나온 낱말이에요.");
    text(data.keywords.map((k) => `${k.word} ${k.count}번`).join("   ·   "), { color: "#3c3748" });
  }
  if (data.choices.length) {
    section(n++, "이야기 속에서 고른 것");
    for (const ch of data.choices) {
      ensure(100);
      ctx.fillStyle = C.muted;
      ctx.font = `700 20px ${BODY}`;
      ctx.fillText(ch.label, M + 24, y);
      y += 34;
      text(ch.items.join(", "), { x: M + 24, maxW: CW - 24, font: `400 23px ${BODY}`, color: "#3c3748", lh: 38 });
      y += 12;
    }
  }
  section(n++, "함께 해 볼 수 있는 것");
  if (data.line) {
    const ll = wrap(`“${data.line}”`, `34px ${HEAD}`, CW - 60);
    const lh2 = 56 + ll.length * 50;
    ensure(lh2 + 20);
    box(M, y, CW, lh2, 22, "#fff0e3");
    ctx.fillStyle = "#a8470b";
    ctx.font = `700 20px ${BODY}`;
    ctx.fillText("건네볼 한마디", M + 30, y + 22);
    ctx.fillStyle = C.ink;
    ctx.font = `34px ${HEAD}`;
    ll.forEach((l, i) => ctx.fillText(l, M + 30, y + 56 + i * 50));
    y += lh2 + 20;
  }
  data.next.forEach((s) => bullet(s, C.green));
  section(n, "꼭 읽어 주세요");
  data.notice.forEach((s) => bullet(s, C.faint));

  pages.forEach((cv, i) => {
    const c2 = cv.getContext("2d")!;
    c2.textBaseline = "top";
    c2.strokeStyle = C.line;
    c2.lineWidth = 2;
    c2.beginPath();
    c2.moveTo(M, H - 100);
    c2.lineTo(W - M, H - 100);
    c2.stroke();
    c2.fillStyle = C.faint;
    c2.font = `400 18px ${BODY}`;
    c2.fillText(`쫑긋 · ${data.childName} 이야기 관찰 노트 · 진단이 아닌 관찰 기록이에요`, M, H - 80);
    c2.textAlign = "right";
    c2.fillText(`${i + 1} / ${pages.length}`, W - M, H - 80);
    c2.textAlign = "left";
  });

  return assemblePdf(pages);
}

function hasBatchim(s: string) {
  const code = s.charCodeAt(s.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0;
}

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

/** 페이지마다 JPEG 한 장을 담은 PDF 1.4 */
function assemblePdf(pages: HTMLCanvasElement[]): Blob {
  const jpegs = pages.map((cv) => {
    const bin = atob(cv.toDataURL("image/jpeg", 0.9).split(",")[1]);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  });
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (p: string | Uint8Array) => {
    const b = typeof p === "string" ? enc.encode(p) : p;
    parts.push(b);
    len += b.length;
  };
  const obj = (num: number, fn: () => void) => {
    offsets[num] = len;
    push(`${num} 0 obj\n`);
    fn();
    push("\nendobj\n");
  };
  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`));
  jpegs.forEach((jp, i) => {
    const p = 3 + i * 3, c = p + 1, im = p + 2;
    const content = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
    obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`));
    obj(c, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(im, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jp.length} >>\nstream\n`);
      push(jp);
      push("\nendstream");
    });
  });
  const size = 3 + pages.length * 3;
  const xref = len;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let k = 1; k < size; k++) push(`${String(offsets[k]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

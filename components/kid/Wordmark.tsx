// 쫑긋 로고: 쫑(용 코랄) + 긋(용 보라), 두 글자 뒤로 이야기 용의 귀 두 개가 빼꼼 솟는다. 소유: 역할 4.
// 귀는 글자 두 개를 기준으로 가운데에 놓인다 (옆 장식 ✦ 같은 건 바깥에서 붙임). 색은 쓰는 화면의 CSS 변수로 정한다:
//   --wm-jjong (쫑) · --wm-geut (긋) · --wm-ear (귀) · --wm-ear-in (귀 안쪽)
import styles from "./wordmark.module.css";

export default function Wordmark() {
  return (
    <span className={styles.word}>
      <svg className={styles.ears} viewBox="0 0 64 34" aria-hidden="true">
        <g className={styles.earLeft}>
          <path d="M22 33C12 31 5 23 5 13 5 6 9 1.5 15 1.5c8 0 14 7.5 14 17 0 6-2.5 11-7 14.5Z" fill="var(--wm-ear)" />
          <path d="M20.5 28C14 26 10 20 10 13.5c0-4.5 2.5-7.5 6-7.5 5 0 8.5 5 8.5 11.5 0 4-1.5 7.8-4 10.5Z" fill="var(--wm-ear-in)" />
        </g>
        <g className={styles.earRight}>
          <path d="M42 33c10-2 17-10 17-20 0-7-4-11.5-10-11.5-8 0-14 7.5-14 17 0 6 2.5 11 7 14.5Z" fill="var(--wm-ear)" />
          <path d="M43.5 28c6.5-2 10.5-8 10.5-14.5 0-4.5-2.5-7.5-6-7.5-5 0-8.5 5-8.5 11.5 0 4 1.5 7.8 4 10.5Z" fill="var(--wm-ear-in)" />
        </g>
      </svg>
      <span className={styles.jjong}>쫑</span>
      <span className={styles.geut}>긋</span>
    </span>
  );
}

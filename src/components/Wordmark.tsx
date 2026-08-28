const STAR =
  "M8 0l1.2 6.05L16 8l-6.8 1.95L8 16l-1.2-6.05L0 8l6.8-1.95Z";

export function Wordmark() {
  return (
    <span className="wordmark">
      <svg className="wordmark-fx" viewBox="0 0 140 40" aria-hidden>
        <path
          className="wordmark-wisp wordmark-wisp-a"
          d="M6 30 C 32 6, 58 34, 102 12 S 132 8, 136 18"
        />
        <path
          className="wordmark-wisp wordmark-wisp-b"
          d="M10 8 C 42 22, 70 2, 128 22"
        />
        <path className="wordmark-spark spark-a" d={STAR} transform="translate(2 2) scale(0.42)" />
        <path className="wordmark-spark spark-b" d={STAR} transform="translate(118 4) scale(0.32)" />
        <path className="wordmark-spark spark-c" d={STAR} transform="translate(96 26) scale(0.24)" />
      </svg>
      <span className="wordmark-name">Fidelius</span>
    </span>
  );
}

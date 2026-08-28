import seal from "../assets/seal.png";

export function SealMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={seal}
      alt=""
      width={size}
      height={size}
      draggable={false}
      aria-hidden
      className="inline-block shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

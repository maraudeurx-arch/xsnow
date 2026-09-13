const DOTS = [
  { left: "8%", delay: "0s", duration: "11s" },
  { left: "18%", delay: "2.2s", duration: "13s" },
  { left: "29%", delay: "1s", duration: "10s" },
  { left: "41%", delay: "3.4s", duration: "14s" },
  { left: "53%", delay: "0.6s", duration: "12s" },
  { left: "66%", delay: "2.8s", duration: "15s" },
  { left: "77%", delay: "1.5s", duration: "11s" },
  { left: "88%", delay: "3.8s", duration: "13s" },
  { left: "94%", delay: "0.3s", duration: "16s" },
];

export function Snowfield() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {DOTS.map((dot) => (
        <span
          key={dot.left}
          className="snow-dot"
          style={{
            left: dot.left,
            animationDelay: dot.delay,
            animationDuration: dot.duration,
          }}
        />
      ))}
    </div>
  );
}

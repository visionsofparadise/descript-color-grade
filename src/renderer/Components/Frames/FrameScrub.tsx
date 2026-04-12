interface FrameScrubProps {
  name: string;
  duration: number;
  frameTime: number;
  onChange: (frameTime: number) => void;
}

export function FrameScrub({ name, duration, frameTime, onChange }: FrameScrubProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 px-4 py-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none"
    >
      <input
        type="range"
        min={0}
        max={duration}
        step={1 / 30}
        value={frameTime}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        aria-label={`Scrub ${name}`}
        className="w-full pointer-events-auto [accent-color:white]"
      />
    </div>
  );
}

interface FrameScrubProps {
  name: string;
  duration: number;
  frameTime: number;
  onChange: (frameTime: number) => void;
}

export function FrameScrub({ name, duration, frameTime, onChange }: FrameScrubProps) {
  return (
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
      className="w-full my-3 [accent-color:white]"
    />
  );
}

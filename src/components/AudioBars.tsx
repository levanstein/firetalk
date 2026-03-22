"use client";

export function AudioBars({ playing }: { playing: boolean }) {
  if (!playing) return null;

  return (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="audio-bar w-1 bg-orange-500 rounded-full"
          style={{ height: "100%" }}
        />
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { gamepad_set_button } from "@/lib/input/gamepad";
import type { gamepad_button } from "@/lib/input/gamepad";
import { cn } from "@/lib/utils";

// Games read the joypad once per frame, so hold every press at least this
// long or very quick taps can be missed entirely
const MIN_PRESS_MS = 50;

// Maps a touch point (relative to the zone's box) to the buttons it presses
type hit_test = (x: number, y: number, rect: DOMRect) => gamepad_button[];

// Multi-touch zone: each pointer can press buttons, and sliding a finger
// updates what it presses. Returns the currently pressed buttons for styling.
function useTouchZone(hit: hit_test) {
  const pointers = useRef(new Map<number, gamepad_button[]>());
  const pressed_ref = useRef<ReadonlySet<gamepad_button>>(new Set());
  const press_times = useRef(new Map<gamepad_button, number>());
  const [pressed, set_pressed] = useState(pressed_ref.current);

  function sync(): void {
    const prev = pressed_ref.current;
    const next = new Set([...pointers.current.values()].flat());
    let any_new = false;

    for (const b of prev) {
      if (next.has(b)) continue;

      const held = performance.now() - (press_times.current.get(b) ?? 0);
      const release_later = () => {
        // Skip if the button was pressed again in the meantime
        if (!pressed_ref.current.has(b)) gamepad_set_button(b, false);
      };

      if (held >= MIN_PRESS_MS) gamepad_set_button(b, false);
      else setTimeout(release_later, MIN_PRESS_MS - held);
    }

    for (const b of next) {
      if (!prev.has(b)) {
        gamepad_set_button(b, true);
        press_times.current.set(b, performance.now());
        any_new = true;
      }
    }

    // Short haptic tick when something new is pressed (not on iOS Safari)
    if (any_new && "vibrate" in navigator) navigator.vibrate(8);

    pressed_ref.current = next;
    set_pressed(next);
  }

  function update(e: React.PointerEvent<HTMLElement>): void {
    const rect = e.currentTarget.getBoundingClientRect();
    pointers.current.set(
      e.pointerId,
      hit(e.clientX - rect.left, e.clientY - rect.top, rect),
    );
    sync();
  }

  function release(e: React.PointerEvent<HTMLElement>): void {
    pointers.current.delete(e.pointerId);
    sync();
  }

  // Release everything if the controls unmount mid-press
  useEffect(() => {
    return () => {
      for (const b of pressed_ref.current) gamepad_set_button(b, false);
    };
  }, []);

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      update(e);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (pointers.current.has(e.pointerId)) update(e);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };

  return { pressed, handlers };
}

const ZONE_CLASS = "touch-none select-none [-webkit-touch-callout:none]";

// 8-way D-pad: direction from the angle to the centre, with a small dead zone
const DPAD_SECTORS: gamepad_button[][] = [
  ["right"],
  ["right", "down"],
  ["down"],
  ["down", "left"],
  ["left"],
  ["left", "up"],
  ["up"],
  ["up", "right"],
];

const dpad_hit: hit_test = (x, y, rect) => {
  const dx = x - rect.width / 2;
  const dy = y - rect.height / 2;

  if (Math.hypot(dx, dy) < rect.width * 0.12) return [];

  const angle = Math.atan2(dy, dx);
  const sector = Math.round(angle / (Math.PI / 4)) & 7;
  return DPAD_SECTORS[sector];
};

export function DPad({ className }: { className?: string }) {
  const { pressed, handlers } = useTouchZone(dpad_hit);

  const arm = (button: gamepad_button, position: string) => (
    <div
      className={cn(
        "absolute size-1/3 bg-secondary transition-colors",
        pressed.has(button) && "bg-muted-foreground/40",
        position,
      )}
    />
  );

  return (
    <div
      {...handlers}
      role="group"
      aria-label="D-pad"
      className={cn("relative aspect-square", ZONE_CLASS, className)}
    >
      {arm("up", "top-0 left-1/3 rounded-t-lg")}
      {arm("left", "top-1/3 left-0 rounded-l-lg")}
      {arm("right", "top-1/3 right-0 rounded-r-lg")}
      {arm("down", "bottom-0 left-1/3 rounded-b-lg")}
      <div className="absolute top-1/3 left-1/3 size-1/3 bg-secondary" />
    </div>
  );
}

// B sits lower-left, A upper-right (like the real console). Touching the gap
// between them presses both.
const B_CENTER = { x: 0.27, y: 0.62 };
const A_CENTER = { x: 0.73, y: 0.38 };
const BUTTON_RADIUS = 0.24;

const action_hit: hit_test = (x, y, rect) => {
  const reach = BUTTON_RADIUS * 1.35 * rect.width;
  const near = (c: { x: number; y: number }) =>
    Math.hypot(x - c.x * rect.width, y - c.y * rect.height) < reach;

  const hits: gamepad_button[] = [];
  if (near(B_CENTER)) hits.push("b");
  if (near(A_CENTER)) hits.push("a");
  return hits;
};

export function ActionButtons({ className }: { className?: string }) {
  const { pressed, handlers } = useTouchZone(action_hit);

  const circle = (
    button: gamepad_button,
    label: string,
    c: { x: number; y: number },
  ) => (
    <div
      className={cn(
        "absolute flex -translate-1/2 items-center justify-center rounded-full",
        "bg-gb-action text-lg font-semibold text-gb-action-foreground shadow-md",
        "transition-transform duration-75",
        pressed.has(button) && "scale-90 brightness-125",
      )}
      style={{
        left: `${c.x * 100}%`,
        top: `${c.y * 100}%`,
        width: `${BUTTON_RADIUS * 200}%`,
        height: `${BUTTON_RADIUS * 200}%`,
      }}
    >
      {label}
    </div>
  );

  return (
    <div
      {...handlers}
      role="group"
      aria-label="A and B buttons"
      className={cn("relative aspect-square", ZONE_CLASS, className)}
    >
      {circle("b", "B", B_CENTER)}
      {circle("a", "A", A_CENTER)}
    </div>
  );
}

export function PillButton({
  button,
  label,
}: {
  button: gamepad_button;
  label: string;
}) {
  const { pressed, handlers } = useTouchZone(() => [button]);

  return (
    <div
      {...handlers}
      role="button"
      aria-label={label}
      className={cn(
        "flex h-7 w-16 items-center justify-center rounded-full bg-secondary",
        "text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase",
        "transition-transform duration-75",
        pressed.has(button) && "scale-95 bg-muted-foreground/40",
        ZONE_CLASS,
      )}
    >
      {label}
    </div>
  );
}

export function StartSelect({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center gap-3", className)}>
      <PillButton button="select" label="select" />
      <PillButton button="start" label="start" />
    </div>
  );
}

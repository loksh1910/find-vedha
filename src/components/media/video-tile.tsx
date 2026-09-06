"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

type Common = {
  name: string;
  colorVar?: string;
  speaking?: boolean;
  className?: string;
};

/** A peer's tile — live feed if they're on the call, avatar otherwise. */
export function PeerTile({
  name,
  colorVar,
  speaking,
  micOn = true,
  camOn = false,
  stream = null,
  className,
}: Common & {
  micOn?: boolean;
  camOn?: boolean;
  stream?: MediaStream | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream ?? null;
    if (stream) el.play().catch(() => {});
  }, [stream]);

  return (
    <Frame colorVar={colorVar} speaking={speaking} className={className}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            camOn ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {!camOn && (
        <>
          <Avatar name={name} size={26} />
          <span className="mt-1 text-[0.625rem] text-muted">{name}</span>
        </>
      )}
      <Badges micOn={micOn} camOn={camOn} muted={!stream} />
    </Frame>
  );
}

/** The viewer's own tile — live camera feed + working mic/cam toggles. */
export function SelfTile({
  name,
  colorVar,
  speaking,
  stream,
  camOn,
  micOn,
  onToggleCam,
  onToggleMic,
  className,
}: Common & {
  stream: MediaStream | null;
  camOn: boolean;
  micOn: boolean;
  onToggleCam: () => void;
  onToggleMic: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream ?? null;
    if (stream) el.play().catch(() => {});
  }, [stream]);

  return (
    <Frame colorVar={colorVar} speaking={speaking} className={className}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={cn(
          "absolute inset-0 h-full w-full -scale-x-100 object-cover",
          camOn ? "opacity-100" : "opacity-0",
        )}
      />
      {!camOn && (
        <>
          <Avatar name={name} size={26} />
          <span className="mt-1 text-[0.625rem] text-muted">{name}</span>
        </>
      )}
      <span className="absolute left-1.5 top-1.5 rounded-sm bg-black/55 px-1 py-px text-[0.5625rem] font-medium text-white/90">
        You
      </span>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent px-1 pb-1 pt-3">
        <button
          type="button"
          onClick={onToggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={micOn}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            micOn
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-danger text-white hover:brightness-110",
          )}
        >
          {micOn ? <Mic size={12} /> : <MicOff size={12} />}
        </button>
        <button
          type="button"
          onClick={onToggleCam}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={camOn}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            camOn
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-danger text-white hover:brightness-110",
          )}
        >
          {camOn ? <Video size={12} /> : <VideoOff size={12} />}
        </button>
      </div>
    </Frame>
  );
}

function Frame({
  colorVar,
  speaking,
  className,
  children,
}: {
  colorVar?: string;
  speaking?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-md border bg-bg-inset",
        speaking ? "border-game-accent" : "border-line",
        className,
      )}
    >
      {colorVar && (
        <span
          className="absolute right-1.5 top-1.5 z-10 h-2 w-2 rounded-full"
          style={{ background: `var(${colorVar})` }}
        />
      )}
      {children}
    </div>
  );
}

function Badges({ micOn, camOn, muted }: { micOn: boolean; camOn: boolean; muted?: boolean }) {
  return (
    <div className={cn("absolute bottom-1 right-1 flex gap-0.5", muted ? "text-faint" : "text-white/80")}>
      {micOn ? <Mic size={9} /> : <MicOff size={9} />}
      {camOn ? <Video size={9} /> : <VideoOff size={9} />}
    </div>
  );
}

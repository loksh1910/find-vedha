"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams } from "next/navigation";
import type { DailyCall, DailyParticipant } from "@daily-co/daily-js";

/**
 * Master switch for REAL in-room video/audio (Daily call object,
 * /api/daily/room, live camera + mic). Off until a media path is paid for /
 * chosen.
 */
export const VIDEO_ENABLED = false;

/**
 * Portfolio mock. Renders the entire video UI — the lobby's horizontal table
 * strip and the in-game right-rail panel — with placeholder tiles and
 * *working* mic / camera buttons, but no real media at all: no getUserMedia,
 * no Daily, no network. Toggling a button just flips its own icon + colour.
 * Ignored when VIDEO_ENABLED is true (real calls take over).
 */
export const VIDEO_MOCK = true;

/** Should the video UI render at all — real or mocked. */
export const VIDEO_UI = VIDEO_ENABLED || VIDEO_MOCK;

type Phase = "choosing" | "acquiring" | "live" | "skipped" | "error";

export type RemotePeer = {
  /** the Supabase user id carried in the meeting token */
  id: string;
  sessionId: string;
  name: string;
  stream: MediaStream | null; // audio + video
  camOn: boolean;
  micOn: boolean;
  speaking: boolean;
};

type MediaCtx = {
  stream: MediaStream | null;
  camOn: boolean;
  micOn: boolean;
  phase: Phase;
  /** true once the viewer has answered the camera/mic prompt (or skipped) */
  answered: boolean;
  error: string | null;
  /** the other people connected to the room's call */
  peers: RemotePeer[];
  /** answer the prompt: join the call with whichever devices were asked for */
  choose: (opts: { cam: boolean; mic: boolean }) => Promise<void>;
  skip: () => void;
  toggleCam: () => void;
  toggleMic: () => void;
};

const Ctx = createContext<MediaCtx | null>(null);

function trackOf(
  p: DailyParticipant | undefined,
  kind: "video" | "audio",
): MediaStreamTrack | null {
  const t = p?.tracks?.[kind];
  return t?.state === "playable" && t.persistentTrack ? t.persistentTrack : null;
}

/** Real Daily-backed provider. Only mounted when VIDEO_ENABLED is true. */
function RealMediaProvider({ children }: { children: ReactNode }) {
  const params = useParams<{ code: string }>();
  const code = (
    Array.isArray(params.code) ? params.code[0] : (params.code ?? "")
  ).toUpperCase();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<RemotePeer[]>([]);

  const callRef = useRef<DailyCall | null>(null);

  const sync = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const all = call.participants();
    const local = all.local;

    setCamOn(!!local?.video);
    setMicOn(!!local?.audio);
    const lv = trackOf(local, "video");
    setStream(lv ? new MediaStream([lv]) : null);

    setPeers(
      Object.values(all)
        .filter((p) => !p.local)
        .map((p) => {
          const v = trackOf(p, "video");
          const a = trackOf(p, "audio");
          const tracks = [v, a].filter(Boolean) as MediaStreamTrack[];
          return {
            id: p.user_id || p.session_id,
            sessionId: p.session_id,
            name: p.user_name || "Player",
            stream: tracks.length ? new MediaStream(tracks) : null,
            camOn: !!p.video,
            micOn: !!p.audio,
            speaking: false,
          };
        }),
    );
  }, []);

  const ensureCall = useCallback(async (): Promise<DailyCall> => {
    if (callRef.current) return callRef.current;
    const Daily = (await import("@daily-co/daily-js")).default;
    let call: DailyCall;
    try {
      call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
    } catch {
      // a previous instance still exists (Fast Refresh, remount) — reuse it
      call = Daily.getCallInstance() as DailyCall;
    }
    call
      .on("joined-meeting", sync)
      .on("participant-joined", sync)
      .on("participant-updated", sync)
      .on("participant-left", sync)
      .on("track-started", sync)
      .on("track-stopped", sync)
      .on("active-speaker-change", (ev) => {
        const sid = ev?.activeSpeaker?.peerId;
        setPeers((ps) => ps.map((p) => ({ ...p, speaking: p.sessionId === sid })));
      })
      .on("error", (ev) => {
        console.error("[media] daily error", ev);
      });
    callRef.current = call;
    return call;
  }, [sync]);

  const dailyMessage = (err: unknown): string => {
    if (err && typeof err === "object") {
      const e = err as { errorMsg?: string; error?: { msg?: string }; message?: string };
      return e.errorMsg || e.error?.msg || e.message || "Could not connect to the call.";
    }
    return typeof err === "string" ? err : "Could not connect to the call.";
  };

  const choose = useCallback(
    async ({ cam, mic }: { cam: boolean; mic: boolean }) => {
      if (!VIDEO_ENABLED || (!cam && !mic)) {
        setPhase("skipped");
        setError(null);
        return;
      }
      setPhase("acquiring");
      setError(null);
      try {
        const res = await fetch("/api/daily/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        if (!res.ok) throw new Error("The call server didn't respond.");
        const { url, token } = (await res.json()) as { url: string; token: string };

        const call = await ensureCall();
        const state = call.meetingState();

        if (state === "joined-meeting") {
          await call.setLocalVideo(cam);
          await call.setLocalAudio(mic);
        } else {
          if (state !== "new") {
            try {
              await call.leave();
            } catch {
              /* fine */
            }
          }
          try {
            await call.join({ url, token, startVideoOff: !cam, startAudioOff: !mic });
          } catch (joinErr) {
            console.error("[media] join with devices failed, retrying receive-only", joinErr);
            // couldn't open the camera/mic — join anyway so they can still see/hear
            await call.join({ url, token, startVideoOff: true, startAudioOff: true });
            setError("Couldn't reach your camera/mic — connected in view-only mode.");
          }
        }
        setPhase("live");
        sync();
      } catch (err) {
        console.error("[media] choose failed", err);
        setError(dailyMessage(err));
        setPhase("error");
      }
    },
    [code, ensureCall, sync],
  );

  const skip = useCallback(() => {
    void callRef.current?.leave();
    setStream(null);
    setPeers([]);
    setCamOn(false);
    setMicOn(false);
    setError(null);
    setPhase("skipped");
  }, []);

  const toggleCam = useCallback(() => {
    const call = callRef.current;
    if (!call) {
      void choose({ cam: true, mic: micOn });
      return;
    }
    void call.setLocalVideo(!camOn);
    setCamOn(!camOn);
  }, [choose, camOn, micOn]);

  const toggleMic = useCallback(() => {
    const call = callRef.current;
    if (!call) {
      void choose({ cam: camOn, mic: true });
      return;
    }
    void call.setLocalAudio(!micOn);
    setMicOn(!micOn);
  }, [choose, camOn, micOn]);

  // tear the call down when leaving the room entirely
  useEffect(() => {
    return () => {
      const call = callRef.current;
      callRef.current = null;
      void call?.destroy();
    };
  }, []);

  const value: MediaCtx = {
    stream,
    camOn,
    micOn,
    phase,
    answered: phase !== "choosing",
    error,
    peers,
    choose,
    skip,
    toggleCam,
    toggleMic,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Mock provider — no devices, no Daily, no network. `camOn` / `micOn` are
 * plain local state so the tile buttons visibly toggle; `stream` stays null
 * (tiles fall back to a placeholder) and there are no remote `peers` (the
 * lobby / grid supply their own placeholder roster).
 */
function MockMediaProvider({ children }: { children: ReactNode }) {
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const value: MediaCtx = {
    stream: null,
    camOn,
    micOn,
    phase: "live",
    answered: true,
    error: null,
    peers: [],
    choose: async () => {},
    skip: () => {},
    toggleCam: () => setCamOn((v) => !v),
    toggleMic: () => setMicOn((v) => !v),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function MediaProvider({ children }: { children: ReactNode }) {
  return VIDEO_ENABLED ? (
    <RealMediaProvider>{children}</RealMediaProvider>
  ) : (
    <MockMediaProvider>{children}</MockMediaProvider>
  );
}

export function useMedia(): MediaCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMedia must be used inside <MediaProvider>");
  return ctx;
}

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

type Phase = "choosing" | "acquiring" | "live" | "skipped" | "error";

type MediaCtx = {
  stream: MediaStream | null;
  camOn: boolean;
  micOn: boolean;
  phase: Phase;
  /** true once the viewer has answered the camera/mic prompt (or skipped) */
  answered: boolean;
  error: string | null;
  /** answer the prompt: acquire whichever devices were asked for */
  choose: (opts: { cam: boolean; mic: boolean }) => Promise<void>;
  skip: () => void;
  toggleCam: () => void;
  toggleMic: () => void;
};

const Ctx = createContext<MediaCtx | null>(null);

export function MediaProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [error, setError] = useState<string | null>(null);

  // canonical live tracks; `stream` is a fresh wrapper handed to consumers so
  // a <video> re-attaches whenever the track set changes
  const tracksRef = useRef<{ video?: MediaStreamTrack; audio?: MediaStreamTrack }>({});

  const publish = useCallback(() => {
    const { video, audio } = tracksRef.current;
    const list = [video, audio].filter(Boolean) as MediaStreamTrack[];
    setStream(list.length ? new MediaStream(list) : null);
  }, []);

  const stopAll = useCallback(() => {
    const { video, audio } = tracksRef.current;
    video?.stop();
    audio?.stop();
    tracksRef.current = {};
  }, []);

  // stop the camera/mic when leaving the room entirely
  useEffect(() => () => stopAll(), [stopAll]);

  const acquire = useCallback(
    async (want: { video: boolean; audio: boolean }) => {
      const gum = navigator.mediaDevices?.getUserMedia;
      if (!gum) throw new Error("This browser has no camera/microphone access.");
      const s = await navigator.mediaDevices.getUserMedia({
        video: want.video ? { width: 960, height: 720 } : false,
        audio: want.audio,
      });
      const v = s.getVideoTracks()[0];
      const a = s.getAudioTracks()[0];
      if (v) {
        tracksRef.current.video?.stop();
        tracksRef.current.video = v;
      }
      if (a) {
        tracksRef.current.audio?.stop();
        tracksRef.current.audio = a;
      }
    },
    [],
  );

  const skip = useCallback(() => {
    stopAll();
    setStream(null);
    setCamOn(false);
    setMicOn(false);
    setError(null);
    setPhase("skipped");
  }, [stopAll]);

  const choose = useCallback(
    async ({ cam, mic }: { cam: boolean; mic: boolean }) => {
      if (!cam && !mic) return skip();
      setPhase("acquiring");
      setError(null);
      try {
        await acquire({ video: cam, audio: mic });
        setCamOn(!!tracksRef.current.video);
        setMicOn(!!tracksRef.current.audio);
        publish();
        setPhase("live");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reach your devices.");
        setPhase("error");
      }
    },
    [acquire, publish, skip],
  );

  const toggleCam = useCallback(() => {
    const t = tracksRef.current.video;
    if (t) {
      t.enabled = !camOn;
      setCamOn(!camOn);
      return;
    }
    // no camera track yet (e.g. joined mic-only) — acquire one now
    void acquire({ video: true, audio: false })
      .then(() => {
        setCamOn(true);
        if (phase !== "live") setPhase("live");
        publish();
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not start the camera."),
      );
  }, [acquire, camOn, phase, publish]);

  const toggleMic = useCallback(() => {
    const t = tracksRef.current.audio;
    if (t) {
      t.enabled = !micOn;
      setMicOn(!micOn);
      return;
    }
    void acquire({ video: false, audio: true })
      .then(() => {
        setMicOn(true);
        if (phase !== "live") setPhase("live");
        publish();
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not start the microphone."),
      );
  }, [acquire, micOn, phase, publish]);

  const value: MediaCtx = {
    stream,
    camOn,
    micOn,
    phase,
    answered: phase !== "choosing",
    error,
    choose,
    skip,
    toggleCam,
    toggleMic,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMedia(): MediaCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMedia must be used inside <MediaProvider>");
  return ctx;
}

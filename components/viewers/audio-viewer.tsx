"use client";

/**
 * Enhanced AudioViewer Component
 *
 * Features:
 * - Custom Material Design 3 controls with animations
 * - Animated audio visualizer bars
 * - Playback speed control (0.5x to 2x)
 * - Loop and repeat controls
 * - Keyboard shortcuts (Space, Arrow keys, L for loop)
 * - Volume control with visual feedback
 * - Timeline scrubbing with waveform preview
 * - Loading and buffering states
 * - Smooth Framer Motion animations
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Download } from "@prisma/client";
import { Card } from "actify";

interface AudioViewerProps {
  download: Download;
}

export function AudioViewer({ download }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);

  const audioUrl = `/api/downloads/${download.id}/content`;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize audio visualizer
  const initializeVisualizer = useCallback(() => {
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    if (!audio || !canvas) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContextRef.current.createMediaElementSource(audio);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }
    } catch (err) {
      console.error("Visualizer initialization error:", err);
    }
  }, []);

  // Draw visualizer
  const drawVisualizer = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgb(17, 24, 39)"; // gray-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Gradient color based on height
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play();
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    } else {
      audio.pause();
    }
  }, []);

  // Seek forward/backward
  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  // Change volume
  const handleVolumeChange = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
      audio.muted = true;
    } else if (isMuted) {
      setIsMuted(false);
      audio.muted = false;
    }
  }, [isMuted]);

  // Change playback speed
  const handlePlaybackRateChange = useCallback((rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  // Toggle loop
  const toggleLoop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = !audio.loop;
    setIsLooping(audio.loop);
  }, []);

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seek(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seek(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case "KeyM":
          e.preventDefault();
          toggleMute();
          break;
        case "KeyL":
          e.preventDefault();
          toggleLoop();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seek, handleVolumeChange, volume, toggleMute, toggleLoop]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      initializeVisualizer();
      drawVisualizer();
    };
    const handlePause = () => {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };
    const handleLoadedData = () => setIsLoading(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleError = () => {
      setError("Failed to load audio. The file may be corrupted or in an unsupported format.");
      setIsLoading(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("volumechange", handleVolumeChange);
    audio.addEventListener("loadeddata", handleLoadedData);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.removeEventListener("loadeddata", handleLoadedData);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeVisualizer, drawVisualizer]);

  if (error) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined mb-4 text-6xl text-red-500">error</span>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Audio Error</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" variant="elevated" elevation={2}>
      <div className="relative">
        {/* Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full bg-gray-900"
        />

        {/* Album Art Overlay */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            animate={{
              rotate: isPlaying ? 360 : 0,
            }}
            transition={{
              duration: 20,
              repeat: isPlaying ? Infinity : 0,
              ease: "linear",
            }}
            className="rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 p-8 shadow-2xl backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-6xl text-white">music_note</span>
          </motion.div>
        </motion.div>

        {/* Loading Spinner */}
        <AnimatePresence>
          {(isLoading || isBuffering) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="material-symbols-outlined text-6xl text-white"
              >
                sync
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Audio Element (hidden) */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Controls */}
      <div className="bg-gray-50 p-6 dark:bg-gray-900">
        {/* Track Info */}
        <div className="mb-4 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {download.title || download.fileName}
          </h3>
          {download.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{download.description}</p>
          )}
        </div>

        {/* Timeline */}
        <div className="mb-4">
          <div
            className="group h-2 cursor-pointer rounded-full bg-gray-300 dark:bg-gray-700"
            onClick={handleTimelineClick}
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentTime / duration) * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => seek(-10)}
            className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Rewind 10s"
          >
            <span className="material-symbols-outlined text-2xl">replay_10</span>
          </button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="rounded-full bg-primary p-4 text-white shadow-lg transition-shadow hover:shadow-xl"
          >
            <span className="material-symbols-outlined text-4xl">
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </motion.button>

          <button
            onClick={() => seek(10)}
            className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            title="Forward 10s"
          >
            <span className="material-symbols-outlined text-2xl">forward_10</span>
          </button>
        </div>

        {/* Secondary Controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined text-xl">
                {isMuted || volume === 0 ? "volume_off" : volume < 0.5 ? "volume_down" : "volume_up"}
              </span>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLoop}
              className={`rounded-full p-2 transition-colors ${
                isLooping
                  ? "bg-primary/20 text-primary"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              title="Loop"
            >
              <span className="material-symbols-outlined text-xl">repeat</span>
            </button>

            <select
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

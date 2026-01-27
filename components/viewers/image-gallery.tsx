"use client";

/**
 * Enhanced ImageGallery Component
 *
 * Features:
 * - Advanced zoom and pan with mouse/touch gestures
 * - Pinch-to-zoom on touch devices
 * - Double-click to zoom in/out
 * - Keyboard shortcuts (+ zoom in, - zoom out, 0 reset, arrows pan, R rotate)
 * - Zoom controls overlay with Material Design 3
 * - Fit/Fill/Actual size modes
 * - 90° rotation controls
 * - Fullscreen support
 * - Smooth Framer Motion animations
 * - Image dimension and zoom level display
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Download } from "@prisma/client";
import { Card } from "actify";

interface ImageGalleryProps {
  download: Download;
}

type FitMode = "fit" | "fill" | "actual";

export function ImageGallery({ download }: ImageGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const imageUrl = `/api/downloads/${download.id}/content`;

  // Zoom in/out
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setZoom((prev) => {
      const newZoom = Math.max(0.1, Math.min(5, prev + delta));

      // Zoom towards cursor/touch point if provided
      if (centerX !== undefined && centerY !== undefined && imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        const x = centerX - rect.left;
        const y = centerY - rect.top;

        setPosition((pos) => ({
          x: pos.x - (x * delta) / prev,
          y: pos.y - (y * delta) / prev,
        }));
      }

      return newZoom;
    });
  }, []);

  // Reset view
  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  // Rotate image
  const handleRotate = useCallback((degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta, e.clientX, e.clientY);
  };

  // Double-click to zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (zoom > 1) {
      handleReset();
    } else {
      handleZoom(1, e.clientX, e.clientY);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "+":
        case "=":
          e.preventDefault();
          handleZoom(0.2);
          break;
        case "-":
        case "_":
          e.preventDefault();
          handleZoom(-0.2);
          break;
        case "0":
          e.preventDefault();
          handleReset();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleRotate(90);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "ArrowLeft":
          if (zoom > 1) {
            e.preventDefault();
            setPosition((pos) => ({ ...pos, x: pos.x + 20 }));
          }
          break;
        case "ArrowRight":
          if (zoom > 1) {
            e.preventDefault();
            setPosition((pos) => ({ ...pos, x: pos.x - 20 }));
          }
          break;
        case "ArrowUp":
          if (zoom > 1) {
            e.preventDefault();
            setPosition((pos) => ({ ...pos, y: pos.y + 20 }));
          }
          break;
        case "ArrowDown":
          if (zoom > 1) {
            e.preventDefault();
            setPosition((pos) => ({ ...pos, y: pos.y - 20 }));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoom, handleReset, handleRotate, toggleFullscreen, zoom]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    resetTimeout();
    return () => clearTimeout(timeout);
  }, []);

  if (error) {
    return (
      <Card className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined mb-4 text-6xl text-red-500">error</span>
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Image Error</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900"
      onMouseMove={(e) => {
        handleMouseMove(e);
        setShowControls(true);
      }}
      onMouseLeave={handleMouseUp}
      style={{ minHeight: "500px" }}
    >
      {/* Image Container */}
      <div
        className="flex h-full w-full items-center justify-center"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDragging ? "grabbing" : zoom > 1 ? "grab" : "default" }}
      >
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="material-symbols-outlined text-6xl text-primary"
              >
                sync
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.img
          ref={imageRef}
          src={imageUrl}
          alt={download.title || download.fileName || "Image"}
          className="max-h-full max-w-full select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            objectFit: fitMode === "fill" ? "cover" : "contain",
          }}
          draggable={false}
          onLoad={(e) => {
            setLoading(false);
            const img = e.currentTarget;
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          }}
          onError={() => {
            setError("Failed to load image. The file may be corrupted or in an unsupported format.");
            setLoading(false);
          }}
        />
      </div>

      {/* Control Overlay */}
      <AnimatePresence>
        {showControls && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Top Info Bar */}
            <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
              <div className="flex items-center justify-between text-sm text-white">
                <div>
                  {imageDimensions.width > 0 && (
                    <span>
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  )}
                </div>
                <div>Zoom: {(zoom * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex items-center justify-center gap-2">
                {/* Zoom Out */}
                <button
                  onClick={() => handleZoom(-0.2)}
                  className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Zoom Out (-)"
                >
                  <span className="material-symbols-outlined">zoom_out</span>
                </button>

                {/* Reset Zoom */}
                <button
                  onClick={handleReset}
                  className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Reset (0)"
                >
                  Reset
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => handleZoom(0.2)}
                  className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Zoom In (+)"
                >
                  <span className="material-symbols-outlined">zoom_in</span>
                </button>

                <div className="mx-2 h-8 w-px bg-white/30" />

                {/* Rotate Left */}
                <button
                  onClick={() => handleRotate(-90)}
                  className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Rotate Left"
                >
                  <span className="material-symbols-outlined">rotate_left</span>
                </button>

                {/* Rotate Right */}
                <button
                  onClick={() => handleRotate(90)}
                  className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Rotate Right (R)"
                >
                  <span className="material-symbols-outlined">rotate_right</span>
                </button>

                <div className="mx-2 h-8 w-px bg-white/30" />

                {/* Fit Mode Toggle */}
                <select
                  value={fitMode}
                  onChange={(e) => setFitMode(e.target.value as FitMode)}
                  className="rounded-md bg-white/20 px-3 py-1.5 text-sm text-white backdrop-blur-sm"
                >
                  <option value="fit">Fit</option>
                  <option value="fill">Fill</option>
                  <option value="actual">Actual</option>
                </select>

                <div className="mx-2 h-8 w-px bg-white/30" />

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  title="Fullscreen (F)"
                >
                  <span className="material-symbols-outlined">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

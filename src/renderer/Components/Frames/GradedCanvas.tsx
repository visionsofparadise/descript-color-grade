import { useEffect, useRef } from "react";
import { buildUniforms } from "./grade-uniforms";
import {
  createGradeProgram,
  createTexture,
  destroyGradeProgram,
  drawGrade,
  uploadTexture,
  type GradeProgram,
} from "./grade-webgl";

// A canvas that renders an image or a video frame through Descript's
// ColorAdjustment shader. Owns its own WebGL context and handles both
// source kinds via the same code path.
//
// - Image sources: decode once (`new Image()`), upload texture on load
// - Video sources: decode via hidden `<video>`, upload current frame
//   on seek complete
//
// All texture uploads go through `uploadTexture`, which accepts either
// HTMLImageElement or HTMLVideoElement. The same shader runs every
// time; we just re-upload the texture when the source content changes
// (new image, new video frame) and re-draw on every adjustment change.
//
// Resize handling is the same as the old DirectGradedImage: canvas
// pixel dimensions match the wrapper's content rect × devicePixelRatio,
// with an object-contain aspect calculation and a rAF-throttled
// ResizeObserver.

interface GradedCanvasProps {
  src: string;
  alt: string;
  kind: "image" | "video";
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  highlights: number;
  shadows: number;
  /** For video sources, the currently-displayed frame time in seconds. */
  frameTime?: number;
  /** Fired once the video metadata has loaded, reporting duration
   *  in seconds. Used by the parent to configure the scrub slider. */
  onVideoReady?: (duration: number) => void;
  className?: string;
}

export function GradedCanvas({
  src,
  alt,
  kind,
  exposure,
  contrast,
  saturation,
  temperature,
  tint,
  highlights,
  shadows,
  frameTime,
  onVideoReady,
  className,
}: GradedCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<GradeProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceReadyRef = useRef(false);
  const sourceAspectRef = useRef<number | null>(null);
  const lastCanvasSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  );

  // Draws the current source (image or video frame) through the shader
  // with the current adjustments. Safe to call whenever — no-ops if
  // the source isn't ready yet.
  const render = (): void => {
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;

    if (gl === null || program === null || texture === null) return;

    if (!sourceReadyRef.current) return;

    drawGrade(
      gl,
      program,
      texture,
      buildUniforms({
        exposure,
        contrast,
        saturation,
        temperature,
        tint,
        highlights,
        shadows,
      }),
    );
  };

  // Uploads the current source content into the GPU texture. For
  // images this is the decoded `HTMLImageElement`; for videos it's the
  // current presentation frame of the `HTMLVideoElement`.
  const uploadCurrentSource = (): void => {
    const gl = glRef.current;
    const texture = textureRef.current;

    if (gl === null || texture === null) return;

    const image = imageRef.current;
    const video = videoRef.current;

    if (kind === "image" && image !== null) {
      uploadTexture(gl, texture, image);
      sourceAspectRef.current = image.naturalWidth / image.naturalHeight;
      sourceReadyRef.current = true;
    } else if (kind === "video" && video !== null) {
      uploadTexture(gl, texture, video);
      sourceAspectRef.current = video.videoWidth / video.videoHeight;
      sourceReadyRef.current = true;
    }
  };

  // Resizes the canvas to match the wrapper's visible rect at full
  // device pixel density, with object-contain aspect-ratio math. Safe
  // to call whenever; it's a no-op if the source aspect ratio isn't
  // known yet (still loading).
  const resizeCanvas = (): void => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const sourceAspect = sourceAspectRef.current;

    if (wrapper === null || canvas === null || gl === null) return;

    if (sourceAspect === null) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const wrapperPhysicalW = rect.width * dpr;
    const wrapperPhysicalH = rect.height * dpr;

    if (wrapperPhysicalW <= 0 || wrapperPhysicalH <= 0) return;

    const wrapperAspect = wrapperPhysicalW / wrapperPhysicalH;

    let targetW: number;
    let targetH: number;

    if (sourceAspect > wrapperAspect) {
      targetW = wrapperPhysicalW;
      targetH = wrapperPhysicalW / sourceAspect;
    } else {
      targetH = wrapperPhysicalH;
      targetW = wrapperPhysicalH * sourceAspect;
    }

    const finalW = Math.max(1, Math.round(targetW));
    const finalH = Math.max(1, Math.round(targetH));

    const last = lastCanvasSizeRef.current;

    if (last !== null && last.width === finalW && last.height === finalH) {
      return;
    }

    lastCanvasSizeRef.current = { width: finalW, height: finalH };

    canvas.width = finalW;
    canvas.height = finalH;
    gl.viewport(0, 0, finalW, finalH);

    render();
  };

  // Initialize WebGL context + program + texture once on mount.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      antialias: false,
    });

    if (gl === null) return;

    glRef.current = gl;
    programRef.current = createGradeProgram(gl);
    textureRef.current = createTexture(gl);

    return (): void => {
      const programValue = programRef.current;

      if (programValue !== null) {
        destroyGradeProgram(gl, programValue);
        programRef.current = null;
      }

      const textureValue = textureRef.current;

      if (textureValue !== null) {
        gl.deleteTexture(textureValue);
        textureRef.current = null;
      }

      glRef.current = null;
    };
  }, []);

  // Load the source whenever `src` or `kind` changes.
  useEffect(() => {
    sourceReadyRef.current = false;
    sourceAspectRef.current = null;
    lastCanvasSizeRef.current = null;

    let cancelled = false;

    if (kind === "image") {
      const image = new Image();

      image.crossOrigin = "anonymous";
      image.onload = (): void => {
        if (cancelled) return;

        imageRef.current = image;
        uploadCurrentSource();
        resizeCanvas();
        render();
      };
      image.src = src;

      return (): void => {
        cancelled = true;
        imageRef.current = null;
      };
    }

    // kind === "video"
    const video = document.createElement("video");

    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const handleLoadedMetadata = (): void => {
      if (cancelled) return;

      if (onVideoReady) onVideoReady(video.duration);

      // Seek to the requested frame time (or 0) to paint the first
      // frame. `seeked` fires once the frame is decoded and ready.
      video.currentTime = frameTime ?? 0;
    };

    const handleSeeked = (): void => {
      if (cancelled) return;

      uploadCurrentSource();
      resizeCanvas();
      render();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("seeked", handleSeeked);

    video.src = src;
    videoRef.current = video;

    return (): void => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("seeked", handleSeeked);
      video.src = "";
      videoRef.current = null;
    };
    // The `frameTime` dep is deliberately omitted — frame changes
    // without src changes are handled by the next effect.
     
  }, [src, kind]);

  // When `frameTime` changes on a video source, seek and re-render.
  useEffect(() => {
    if (kind !== "video") return;

    const video = videoRef.current;

    if (video === null) return;

    if (!Number.isFinite(video.duration)) return;

    const target = frameTime ?? 0;

    if (Math.abs(video.currentTime - target) < 1e-4) return;

    video.currentTime = target;
  }, [frameTime, kind]);

  // ResizeObserver on the wrapper, rAF-throttled so we don't re-grade
  // dozens of times per second during a window drag.
  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (wrapper === null) return;

    let rafHandle: number | null = null;

    const observer = new ResizeObserver(() => {
      if (rafHandle !== null) return;

      rafHandle = requestAnimationFrame(() => {
        rafHandle = null;
        resizeCanvas();
      });
    });

    observer.observe(wrapper);

    return (): void => {
      observer.disconnect();

      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
      }
    };
  }, []);

  // Re-render whenever any adjustment scalar changes. Texture stays,
  // only uniforms + draw.
  useEffect(() => {
    render();
  }, [exposure, contrast, saturation, temperature, tint, highlights, shadows]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={alt}
        role="img"
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      />
    </div>
  );
}

import { useEffect, useRef } from "react";
import type {
  DescriptColorModel,
  VideoTreatment,
} from "@/models/State/Project";
import { buildUniforms } from "./utils/grade-uniforms";
import {
  createGradeProgram,
  createTexture,
  destroyGradeProgram,
  drawGrade,
  uploadTexture,
  type GradeProgram,
} from "./utils/grade-webgl";

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
  colorModel: DescriptColorModel;
  videoTreatment: VideoTreatment;
  /** For video sources, the currently-displayed frame time in seconds. */
  frameTime?: number;
  /** Fired once the video metadata has loaded, reporting duration
   *  in seconds. Used by the parent to configure the scrub slider. */
  onVideoReady?: (duration: number) => void;
  /** "contain" fits the source inside the wrapper (letterboxed);
   *  "cover" fills the wrapper (cropped). Defaults to "cover". */
  fit?: "contain" | "cover";
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
  colorModel,
  videoTreatment,
  frameTime,
  onVideoReady,
  fit = "cover",
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
  // `fit` is read by `resizeCanvas`, which is called from a
  // ResizeObserver registered once at mount. Closing over the prop
  // would freeze the value; keep it in a ref updated every render so
  // the observer callback always sees the current mode. The write is
  // inside a deps-less effect to satisfy the react-hooks/refs rule
  // (ref writes must happen outside render).
  const fitRef = useRef(fit);
  useEffect(() => {
    fitRef.current = fit;
  });

  // Uniform values are read by `render()`, which is called from
  // several non-reactive sites: the ResizeObserver callback, the
  // `seeked` handler registered inside the `[src, kind]` effect, and
  // the `image.onload` handler in that same effect. Each of those
  // captures a `render` closure from the render cycle where its
  // effect last ran — typically from the initial load, when all
  // sliders were zero. Without the ref, seeking a video frame after
  // the user has tuned sliders re-draws with the stale zero uniforms
  // and the frame looks ungraded until the next slider tick.
  const uniformsRef = useRef({
    exposure,
    contrast,
    saturation,
    temperature,
    tint,
    highlights,
    shadows,
  });
  useEffect(() => {
    uniformsRef.current = {
      exposure,
      contrast,
      saturation,
      temperature,
      tint,
      highlights,
      shadows,
    };
  });

  // Project-level pipeline settings are also read from long-lived
  // callbacks (`seeked`, `image.onload`, ResizeObserver-driven redraws),
  // so keep them in a ref for the same stale-closure reason as the
  // slider uniforms above.
  const pipelineOptionsRef = useRef({
    colorModel,
    videoTreatment,
  });
  useEffect(() => {
    pipelineOptionsRef.current = {
      colorModel,
      videoTreatment,
    };
  });

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
      buildUniforms(uniformsRef.current, {
        colorModel: pipelineOptionsRef.current.colorModel,
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
      uploadTexture(gl, texture, video, {
        premultiplyAlpha:
          pipelineOptionsRef.current.videoTreatment === "descript-optimized",
      });
      sourceAspectRef.current = video.videoWidth / video.videoHeight;
      sourceReadyRef.current = true;
    }
  };

  // Resizes the canvas to match the wrapper's visible rect at full
  // device pixel density. In "contain" mode the canvas fits inside the
  // wrapper (letterboxed); in "cover" mode it fills the wrapper with
  // overflow cropped by the wrapper's `overflow: hidden`. Safe to call
  // whenever; it's a no-op if the source aspect ratio isn't known yet.
  const resizeCanvas = (): void => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const sourceAspect = sourceAspectRef.current;

    if (wrapper === null || canvas === null || gl === null) return;

    if (sourceAspect === null) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const wrapperCssW = rect.width;
    const wrapperCssH = rect.height;

    if (wrapperCssW <= 0 || wrapperCssH <= 0) return;

    const wrapperAspect = wrapperCssW / wrapperCssH;

    // In CSS pixels: the layout size the canvas should occupy.
    let cssW: number;
    let cssH: number;

    const sourceWiderThanWrapper = sourceAspect > wrapperAspect;
    const currentFit = fitRef.current;

    if (currentFit === "contain") {
      if (sourceWiderThanWrapper) {
        cssW = wrapperCssW;
        cssH = wrapperCssW / sourceAspect;
      } else {
        cssH = wrapperCssH;
        cssW = wrapperCssH * sourceAspect;
      }
    } else {
      // cover: fill the wrapper on the constrained axis; overflow on the other
      if (sourceWiderThanWrapper) {
        cssH = wrapperCssH;
        cssW = wrapperCssH * sourceAspect;
      } else {
        cssW = wrapperCssW;
        cssH = wrapperCssW / sourceAspect;
      }
    }

    const bufW = Math.max(1, Math.round(cssW * dpr));
    const bufH = Math.max(1, Math.round(cssH * dpr));

    const last = lastCanvasSizeRef.current;

    if (last !== null && last.width === bufW && last.height === bufH) {
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      return;
    }

    lastCanvasSizeRef.current = { width: bufW, height: bufH };

    canvas.width = bufW;
    canvas.height = bufH;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    gl.viewport(0, 0, bufW, bufH);

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

  // Global pipeline settings apply immediately to the current source.
  // Video treatment changes require a fresh upload because WebGL's
  // pixel-store settings are latched at `texImage2D` time.
  useEffect(() => {
    if (!sourceReadyRef.current) return;

    uploadCurrentSource();
    render();
  }, [colorModel, videoTreatment]);

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

  // Re-run the layout math when the fit mode changes. Invalidates the
  // size cache so the new aspect calculation always applies even if
  // the buffer happens to match in one direction.
  useEffect(() => {
    lastCanvasSizeRef.current = null;
    resizeCanvas();

  }, [fit]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={alt}
        role="img"
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

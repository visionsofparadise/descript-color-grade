import { useEffect, useRef } from "react";
import { buildUniforms } from "./utils/grade-uniforms";
import {
	createGradeProgram,
	createResampleProgram,
	createResampleTarget,
	createTexture,
	destroyQuadProgram,
	destroyResampleTarget,
	drawGrade,
	drawResample,
	uploadTexture,
	type GradeProgram,
	type ResampleProgram,
	type ResampleTarget,
} from "./utils/grade-webgl";
import { proxyDimensionsOf } from "./utils/proxy-dimensions";
import type { DescriptColorModel, VideoTreatment } from "@/models/Project";

interface GradedCanvasProps {
	url: string;
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
	frameTime?: number;
	onVideoReady?: (duration: number) => void;
	fit?: "contain" | "cover";
	className?: string;
}

export function GradedCanvas({
	url,
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
	const resampleProgramRef = useRef<ResampleProgram | null>(null);
	const resampleTargetRef = useRef<ResampleTarget | null>(null);
	const textureRef = useRef<WebGLTexture | null>(null);
	const imageRef = useRef<HTMLImageElement | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const sourceReadyRef = useRef(false);
	const sourceSizeRef = useRef<{ width: number; height: number } | null>(null);
	const lastCanvasSizeRef = useRef<{ width: number; height: number } | null>(null);
	const fitRef = useRef(fit);

	useEffect(() => {
		fitRef.current = fit;
	});

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

	const render = (): void => {
		const gl = glRef.current;
		const program = programRef.current;
		const texture = textureRef.current;
		const canvas = canvasRef.current;

		if (gl === null || program === null || texture === null || canvas === null) return;

		if (!sourceReadyRef.current) return;

		gl.viewport(0, 0, canvas.width, canvas.height);

		drawGrade(
			gl,
			program,
			resampleTargetRef.current?.texture ?? texture,
			buildUniforms(uniformsRef.current, {
				colorModel: pipelineOptionsRef.current.colorModel,
			}),
		);
	};

	const refreshProxy = (): void => {
		const gl = glRef.current;
		const texture = textureRef.current;
		const canvas = canvasRef.current;
		const sourceSize = sourceSizeRef.current;

		if (gl === null || texture === null || canvas === null || sourceSize === null) return;

		let target = resampleTargetRef.current;

		if (kind !== "video" || pipelineOptionsRef.current.videoTreatment !== "descript-optimized") {
			if (target !== null) destroyResampleTarget(gl, target);

			resampleTargetRef.current = null;

			return;
		}

		const resample = (resampleProgramRef.current ??= createResampleProgram(gl));
		const proxy = proxyDimensionsOf(sourceSize.width, sourceSize.height, canvas.width, canvas.height);

		if (
			target !== null &&
			(target.width !== proxy.width || target.height !== proxy.height || target.sourceHeight !== sourceSize.height)
		) {
			destroyResampleTarget(gl, target);
			target = null;
		}

		target ??= createResampleTarget(gl, sourceSize.height, proxy.width, proxy.height);
		resampleTargetRef.current = target;

		drawResample(gl, resample, texture, sourceSize.width, sourceSize.height, target);
	};

	const uploadCurrentSource = (): void => {
		const gl = glRef.current;
		const texture = textureRef.current;

		if (gl === null || texture === null) return;

		const image = imageRef.current;
		const video = videoRef.current;

		if (kind === "image" && image !== null) {
			uploadTexture(gl, texture, image);

			sourceSizeRef.current = { width: image.naturalWidth, height: image.naturalHeight };
			sourceReadyRef.current = true;
		} else if (kind === "video" && video !== null) {
			uploadTexture(gl, texture, video, {
				premultiplyAlpha: pipelineOptionsRef.current.videoTreatment === "descript-optimized",
			});

			sourceSizeRef.current = { width: video.videoWidth, height: video.videoHeight };
			sourceReadyRef.current = true;
		}

		if (lastCanvasSizeRef.current !== null) refreshProxy();
	};

	const resizeCanvas = (): void => {
		const wrapper = wrapperRef.current;
		const canvas = canvasRef.current;
		const gl = glRef.current;
		const sourceSize = sourceSizeRef.current;

		if (wrapper === null || canvas === null || gl === null) return;

		if (sourceSize === null) return;

		const sourceAspect = sourceSize.width / sourceSize.height;
		const rect = wrapper.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		const wrapperCssW = rect.width;
		const wrapperCssH = rect.height;

		if (wrapperCssW <= 0 || wrapperCssH <= 0) return;

		const wrapperAspect = wrapperCssW / wrapperCssH;

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

		refreshProxy();
		render();
	};

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
				destroyQuadProgram(gl, programValue);
				programRef.current = null;
			}

			const resampleProgramValue = resampleProgramRef.current;

			if (resampleProgramValue !== null) {
				destroyQuadProgram(gl, resampleProgramValue);
				resampleProgramRef.current = null;
			}

			const resampleTargetValue = resampleTargetRef.current;

			if (resampleTargetValue !== null) {
				destroyResampleTarget(gl, resampleTargetValue);
				resampleTargetRef.current = null;
			}

			const textureValue = textureRef.current;

			if (textureValue !== null) {
				gl.deleteTexture(textureValue);
				textureRef.current = null;
			}

			glRef.current = null;
		};
	}, []);

	useEffect(() => {
		sourceReadyRef.current = false;
		sourceSizeRef.current = null;
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

			image.setAttribute("src", url);

			return (): void => {
				cancelled = true;
				imageRef.current = null;
			};
		}

		const video = document.createElement("video");

		video.crossOrigin = "anonymous";
		video.preload = "auto";
		video.muted = true;
		video.playsInline = true;

		const handleLoadedMetadata = (): void => {
			if (cancelled) return;

			if (onVideoReady) onVideoReady(video.duration);

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

		video.setAttribute("src", url);
		videoRef.current = video;

		return (): void => {
			cancelled = true;
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("seeked", handleSeeked);
			video.setAttribute("src", "");
			videoRef.current = null;
		};
	}, [url, kind]);

	useEffect(() => {
		if (kind !== "video") return;

		const video = videoRef.current;

		if (video === null) return;

		if (!Number.isFinite(video.duration)) return;

		const target = frameTime ?? 0;

		if (Math.abs(video.currentTime - target) < 1e-4) return;

		video.currentTime = target;
	}, [frameTime, kind]);

	useEffect(() => {
		if (!sourceReadyRef.current) return;

		uploadCurrentSource();
		render();
	}, [colorModel, videoTreatment]);

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

	useEffect(() => {
		render();
	}, [exposure, contrast, saturation, temperature, tint, highlights, shadows]);

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
			<canvas ref={canvasRef} aria-label={alt} role="img" style={{ flexShrink: 0 }} />
		</div>
	);
}

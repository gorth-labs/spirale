import { useEffect, useRef } from "react";
import { Link } from "wouter";

const SPOTLIGHT_R = 260;
const LERP = 0.1;

const BG_IMAGE_1 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";
const BG_IMAGE_2 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

export default function Home() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const topLayerRef = useRef<HTMLDivElement>(null);
  const orbRef      = useRef<HTMLDivElement>(null);

  const mouseRef  = useRef({ x: -999, y: -999 });
  const smoothRef = useRef({ x: -999, y: -999 });
  const rafRef    = useRef<number>();

  useEffect(() => {
    // Size the canvas to the viewport
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener("resize", resize);

    // Track raw mouse
    const onMouseMove = (e: MouseEvent) => {
      if (smoothRef.current.x === -999) {
        smoothRef.current = { x: e.clientX, y: e.clientY };
      }
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouseMove);

    // Single RAF loop — no React state, only direct DOM writes
    const loop = () => {
      if (smoothRef.current.x !== -999) {
        const sx = smoothRef.current.x;
        const sy = smoothRef.current.y;
        const nx = sx + (mouseRef.current.x - sx) * LERP;
        const ny = sy + (mouseRef.current.y - sy) * LERP;
        const moved = Math.abs(nx - sx) > 0.05 || Math.abs(ny - sy) > 0.05;
        smoothRef.current = { x: nx, y: ny };

        if (moved) {
          // 1. Draw spotlight mask onto off-screen canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, SPOTLIGHT_R);
              g.addColorStop(0,    "rgba(255,255,255,1)");
              g.addColorStop(0.4,  "rgba(255,255,255,1)");
              g.addColorStop(0.6,  "rgba(255,255,255,0.75)");
              g.addColorStop(0.75, "rgba(255,255,255,0.4)");
              g.addColorStop(0.88, "rgba(255,255,255,0.12)");
              g.addColorStop(1,    "rgba(255,255,255,0)");
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(nx, ny, SPOTLIGHT_R, 0, Math.PI * 2);
              ctx.fill();

              // 2. Apply mask directly via style — no setState
              const dataUrl = canvas.toDataURL();
              if (topLayerRef.current) {
                topLayerRef.current.style.maskImage         = `url(${dataUrl})`;
                topLayerRef.current.style.webkitMaskImage   = `url(${dataUrl})`;
                topLayerRef.current.style.maskSize          = "100% 100%";
                topLayerRef.current.style.webkitMaskSize    = "100% 100%";
                topLayerRef.current.style.display           = "block";
              }
            }
          }

          // 3. Move the glowing orb
          if (orbRef.current) {
            orbRef.current.style.transform   = `translate(${nx - 200}px, ${ny - 200}px)`;
            orbRef.current.style.visibility  = "visible";
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white tracking-[-0.02em]" style={{ fontFamily: "Inter, sans-serif" }}>
      <section
        className="relative w-full overflow-hidden bg-black"
        style={{ height: "100dvh" }}
      >
        {/* Off-screen canvas — only used for mask generation */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Background image layer */}
        <div
          className="absolute inset-0 bg-center bg-cover bg-no-repeat hero-zoom z-10"
          style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        />

        {/* Reveal layer — mask applied via ref, not state */}
        <div
          ref={topLayerRef}
          className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
          style={{
            backgroundImage: `url(${BG_IMAGE_2})`,
            display: "none",         // hidden until first cursor move
            maskSize:         "100% 100%",
            WebkitMaskSize:   "100% 100%",
          }}
        />

        {/* Glowing orb — positioned via ref */}
        <div
          ref={orbRef}
          className="fixed pointer-events-none rounded-full"
          style={{
            width:           400,
            height:          400,
            backgroundColor: "rgba(139, 92, 246, 0.4)",
            filter:          "blur(60px)",
            mixBlendMode:    "color-dodge",
            zIndex:          40,
            visibility:      "hidden",
          }}
        />

        {/* ── Hero text ── */}
        <div className="absolute top-[14%] flex flex-col items-center text-center px-5 pointer-events-none z-50 w-full">
          <span
            className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl leading-[0.95] text-white hero-anim hero-reveal mix-blend-difference"
            style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
          >
            Layers hold
          </span>
          <span
            className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 text-white hero-anim hero-reveal mix-blend-difference"
            style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
          >
            tales of time
          </span>
        </div>

        {/* ── Bottom-left blurb ── */}
        <div
          className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] hero-anim hero-fade z-50"
          style={{ animationDelay: "0.7s" }}
        >
          <p className="text-sm text-white/80 leading-relaxed mix-blend-difference">
            Every layer of sediment records a chapter of our planet, from ancient seabeds to drifting ash, layered across millions of years beneath us.
          </p>
        </div>

        {/* ── Bottom-right CTA ── */}
        <div
          className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 hero-anim hero-fade z-50"
          style={{ animationDelay: "0.85s" }}
        >
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed mix-blend-difference">
            Our interactive maps let you peel back the crust to trace how stones, fossils, and deep time combine to shape the ground beneath your feet.
          </p>
          <Link
            href="/test/new"
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30 pointer-events-auto"
          >
            Start Testing
          </Link>
        </div>

        {/* ── Nav ── */}
        <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
              <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
            </svg>
            <span className="text-white text-2xl font-playfair italic mix-blend-difference">Spirale</span>
          </div>

          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
            <Link href="/dashboard" className="text-white/80 hover:bg-white/20 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/test/new" className="text-white/80 hover:bg-white/20 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium">
              New Test
            </Link>
            <a href="#" className="text-white/80 hover:bg-white/20 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium">Docs</a>
            <a href="#" className="text-white/80 hover:bg-white/20 hover:text-white px-4 py-1.5 rounded-full text-sm font-medium">Plans</a>
          </div>

          <div className="hidden md:block">
            <a href="#" className="bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors">
              Sign Up
            </a>
          </div>

          <div className="md:hidden text-white cursor-pointer mix-blend-difference">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </div>
        </nav>
      </section>
    </div>
  );
}

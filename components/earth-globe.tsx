"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

type Arc = {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string[]
}

export default function EarthGlobe() {
  const globeRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  const arcsData: Arc[] = useMemo(
    () =>
      Array.from({ length: 18 }).map(() => {
        const startLat = (Math.random() - 0.5) * 160
        const startLng = (Math.random() - 0.5) * 360
        const endLat = (Math.random() - 0.5) * 160
        const endLng = (Math.random() - 0.5) * 360
        return {
          startLat,
          startLng,
          endLat,
          endLng,
          color: ["#34d399", "#22c55e"], // mint to neon green
        }
      }),
    [],
  )

  useEffect(() => {
    if (!globeRef.current) return
    const controls = globeRef.current.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.65
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    setReady(true)
  }, [])

  return (
    <div className="relative h-[360px] sm:h-[420px] md:h-[500px] lg:h-[560px]">
      {/* soft green glow behind globe */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-60"
        style={{
          background: "radial-gradient(closest-side, rgba(34,197,94,0.28), rgba(34,197,94,0.08) 55%, transparent 70%)",
        }}
      />
      {/* the globe */}
      <Globe
        ref={globeRef}
        width={undefined}
        height={undefined}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="#22c55e"
        atmosphereAltitude={0.25}
        arcsData={arcsData}
        arcColor={(d: Arc) => d.color}
        arcAltitude={0.2}
        arcStroke={0.9}
        arcDashLength={0.35}
        arcDashGap={0.7}
        arcDashAnimateTime={4000}
        animateIn
        rendererConfig={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      />
      {/* subtle particle sprinkle */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen opacity-30"
        style={{
          backgroundImage: "radial-gradient(rgba(34,197,94,0.18) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />
    </div>
  )
}

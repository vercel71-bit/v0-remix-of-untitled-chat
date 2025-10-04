"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

interface ProjectMapProps {
  longitude: number
  latitude: number
  projectTitle: string
  mapboxToken?: string
}

export function ProjectMap({ longitude, latitude, projectTitle }: ProjectMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false)

  useEffect(() => {
    // Only initialize map when Leaflet is loaded and we have a map container
    if (!isLeafletLoaded || !mapRef.current || mapInstanceRef.current) return

    try {
      // Initialize the map
      const map = (window as any).L.map(mapRef.current).setView([latitude, longitude], 14)

      // Add OpenStreetMap tiles
      ;(window as any).L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      const markerHtml =
        '<div style="background-color: hsl(142, 76%, 36%); width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">' +
        '<div style="width: 12px; height: 12px; background-color: white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>' +
        "</div>"

      // Create custom marker icon
      const customIcon = (window as any).L.divIcon({
        className: "custom-marker",
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      })

      // Add marker with popup
      const popupContent = '<div style="padding: 8px; font-weight: 600;">' + projectTitle + "</div>"
      ;(window as any).L.marker([latitude, longitude], { icon: customIcon }).addTo(map).bindPopup(popupContent)

      mapInstanceRef.current = map

      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        map.invalidateSize()
      }, 100)
    } catch (error) {
      console.error("[v0] Error initializing map:", error)
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isLeafletLoaded, latitude, longitude, projectTitle])

  return (
    <>
      {/* Load Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      {/* Load Leaflet JS */}
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
        crossOrigin=""
        strategy="lazyOnload"
        onLoad={() => setIsLeafletLoaded(true)}
      />

      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
        {/* Loading state */}
        {!isLeafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm z-10">
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={mapRef} className="absolute inset-0 z-0" style={{ height: "100%", width: "100%" }} />

        {/* Location label */}
        {isLeafletLoaded && (
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-card-foreground shadow-sm z-[1000] pointer-events-none">
            📍 {projectTitle}
          </div>
        )}
      </div>
    </>
  )
}

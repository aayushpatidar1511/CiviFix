'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import {
  Locate,
  MapPin,
  Search,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  X,
  Navigation2,
  Compass,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react'
import { Complaint, MapPinData, api } from '@/lib/api'

// Tile layer URL definitions
const TILE_LAYERS = {
  streets: {
    name: 'Default (Streets)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite (Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
}

// Leaflet custom marker helper
function createMarkerIcon(color: string, label?: string) {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease;
        ">
          <svg style="transform: rotate(45deg); width: 14px; height: 14px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

// Pulsating blue marker for user's own current GPS location
function createUserLocationIcon() {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px;">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(26, 115, 232, 0.35);
          animation: userPulse 1.8s ease-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #1a73e8;
          border: 3px solid #ffffff;
          box-shadow: 0 0 8px rgba(0,0,0,0.4);
        "></div>
      </div>
      <style>
        @keyframes userPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

// Draggable pin for report picker
function createPickerMarkerIcon() {
  return L.divIcon({
    className: 'picker-marker',
    html: `
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: #ea4335;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 6px 16px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: #ffffff;
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  })
}

interface RealCityMapProps {
  pins: MapPinData[]
  issues: Complaint[]
  onSelectIssue?: (issue: Complaint) => void
  userLocation?: { lat: number; lng: number } | null
}

/**
 * Full Google Maps style interactive map component
 * Includes: Google Search Bar, Satellite/Streets Switcher, Fullscreen, Custom Controls, Markers with Popups
 */
export function RealCityMap({ pins, issues, onSelectIssue, userLocation }: RealCityMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const currentTileLayerRef = useRef<L.TileLayer | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([])
  const [showResultsDropdown, setShowResultsDropdown] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Default coordinates centered on Indore, Madhya Pradesh
  const defaultCenter: [number, number] = [22.7196, 75.8577]

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] as [number, number] : defaultCenter

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: false, // We render custom Google Maps style controls
      attributionControl: false,
    })

    const initialLayer = L.tileLayer(TILE_LAYERS[mapType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[mapType].attribution,
    }).addTo(map)

    currentTileLayerRef.current = initialLayer
    markersLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Switch between Street and Satellite layers
  useEffect(() => {
    if (!mapRef.current) return
    if (currentTileLayerRef.current) {
      mapRef.current.removeLayer(currentTileLayerRef.current)
    }
    const newLayer = L.tileLayer(TILE_LAYERS[mapType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[mapType].attribution,
    }).addTo(mapRef.current)
    currentTileLayerRef.current = newLayer
  }, [mapType])

  // Update user GPS location beacon
  useEffect(() => {
    if (!mapRef.current || !userLocation) return

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
    } else {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createUserLocationIcon(),
        zIndexOffset: 1000,
      }).addTo(mapRef.current)

      userMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px 6px; font-size: 11px;">
          <strong style="color: #1a73e8; display: block; margin-bottom: 2px;">📍 Your Current Location</strong>
          <span style="color: #5f6368; font-size: 10px;">Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}</span>
        </div>
      `)
      userMarkerRef.current = userMarker
    }
  }, [userLocation])

  // Plot civic complaint pins
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    pins.forEach((pin) => {
      let color = '#1a73e8' // Medium/Low blue
      if (pin.priority === 'CRITICAL') color = '#d93025' // Google Red
      else if (pin.priority === 'HIGH') color = '#f29900' // Google Amber
      else if (pin.status === 'RESOLVED') color = '#188038' // Google Green

      const marker = L.marker([pin.lat, pin.lng], {
        icon: createMarkerIcon(color),
      })

      const popupContent = document.createElement('div')
      popupContent.style.fontFamily = 'Arial, sans-serif'
      popupContent.style.minWidth = '220px'
      popupContent.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 700; color: #5f6368;">${pin.code}</span>
          <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${color}22; color: ${color};">
            ${pin.priority}
          </span>
        </div>
        <div style="font-size: 13px; font-weight: 700; color: #202124; margin-bottom: 4px; line-height: 1.3;">${pin.title}</div>
        <div style="font-size: 11px; color: #5f6368; margin-bottom: 6px;">📍 ${pin.address}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid #dadce0; padding-top: 6px; margin-top: 6px;">
          <span style="font-size: 10px; color: #80868b;">${pin.department_name}</span>
          <button id="view-issue-${pin.id}" style="
            background: #1a73e8;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          ">
            View Details &rarr;
          </button>
        </div>
      `

      popupContent.querySelector(`#view-issue-${pin.id}`)?.addEventListener('click', () => {
        const found = issues.find((i) => i.id === pin.id)
        if (found && onSelectIssue) {
          onSelectIssue(found)
        }
      })

      marker.bindPopup(popupContent)
      markersLayerRef.current?.addLayer(marker)
    })
  }, [pins, issues, onSelectIssue])

  // Google Maps Search handler using backend proxy (zero CORS errors)
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setShowResultsDropdown(false)
    try {
      const data = await api.searchLocation(searchQuery)
      if (data && data.length > 0) {
        setSearchResults(data)
        const first = data[0]
        const lat = parseFloat(first.lat)
        const lon = parseFloat(first.lon)
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 16, { duration: 1.2 })
        }
        if (data.length > 1) {
          setShowResultsDropdown(true)
        }
      } else {
        alert('Place not found. Try searching with landmark or city name (e.g. "Rajwada, Indore")')
      }
    } catch (err) {
      console.error('Map search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle click on specific search result
  const selectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16, { duration: 1.2 })
    }
    setSearchQuery(item.display_name.split(',')[0])
    setShowResultsDropdown(false)
  }

  // Fly to User's live location
  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 16, { duration: 1.2 })
      userMarkerRef.current?.openPopup()
      return
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    const tryGeo = (highAcc: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          if (mapRef.current) {
            mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 })
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([lat, lng])
              userMarkerRef.current.openPopup()
            }
          }
        },
        (err) => {
          if (highAcc) {
            tryGeo(false)
          } else {
            alert('Could not access current location. Please grant browser location permission.')
          }
        },
        { enableHighAccuracy: highAcc, timeout: highAcc ? 4000 : 8000, maximumAge: 60000 }
      )
    }
    tryGeo(true)
  }

  // Toggle fullscreen
  const toggleFullscreen = () => {
    const el = mapContainerRef.current?.parentElement
    if (!el) return

    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '420px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #dbe2e6',
      }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* GOOGLE MAPS STYLE FLOATING SEARCH BAR */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 1000,
          width: 'min(90%, 340px)',
        }}
      >
        <form
          onSubmit={handleSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
            padding: '4px 10px',
            gap: '8px',
          }}
        >
          <Search size={16} color="#5f6368" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Google Map (streets, landmarks)..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '12px',
              color: '#202124',
              background: 'transparent',
              padding: '6px 0',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setShowResultsDropdown(false)
              }}
              style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: '#70757a' }}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching}
            style={{
              background: '#1a73e8',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 10px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {isSearching ? '...' : 'Go'}
          </button>
        </form>

        {/* Dropdown Suggestions */}
        {showResultsDropdown && searchResults.length > 0 && (
          <div
            style={{
              marginTop: '4px',
              background: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid #e8eaed',
            }}
          >
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => selectSearchResult(item)}
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: '#3c4043',
                  borderBottom: '1px solid #f1f3f4',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <MapPin size={12} color="#1a73e8" style={{ flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GOOGLE MAPS LAYER SWITCHER (Streets vs Satellite) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '12px',
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
          style={{
            background: '#ffffff',
            border: '2px solid #ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#202124',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Toggle Satellite Imagery vs Street Map"
        >
          <Layers size={14} color="#1a73e8" />
          <span>{mapType === 'streets' ? 'Satellite View' : 'Street Map'}</span>
        </button>
      </div>

      {/* GOOGLE MAPS FLOATING CONTROLS (Top-Right / Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Locate Me GPS button */}
        <button
          type="button"
          onClick={handleLocateMe}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: '#ffffff',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: '#1a73e8',
          }}
          title="Your current location"
        >
          <Compass size={19} />
        </button>

        {/* Zoom In & Out Controls */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            style={{
              width: '38px',
              height: '34px',
              border: 'none',
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#3c4043',
              borderBottom: '1px solid #dadce0',
            }}
            title="Zoom In"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            style={{
              width: '38px',
              height: '34px',
              border: 'none',
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#3c4043',
            }}
            title="Zoom Out"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullscreen}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: '#ffffff',
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: '#3c4043',
          }}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Active Pin Legend Badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(4px)',
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '10px',
          fontWeight: 700,
          color: '#3c4043',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d93025' }} /> Critical
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f29900' }} /> High
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a73e8' }} /> Medium
        </span>
      </div>
    </div>
  )
}

interface ReportMapPickerProps {
  lat: number
  lng: number
  onLocationSelect: (loc: { lat: number; lng: number }) => void
  onFetchAddress?: (address: string) => void
  userLocation?: { lat: number; lng: number } | null
}

/**
 * Google Maps style interactive location picker for the "Report Issue" modal
 * Includes: Address Search Bar, Satellite/Street Switcher, Draggable Pin, Device Geolocation, Auto Reverse Geocoding
 */
export function ReportMapPicker({ lat, lng, onLocationSelect, onFetchAddress, userLocation }: ReportMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([])
  const [showResultsDropdown, setShowResultsDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [detectedAddress, setDetectedAddress] = useState('')

  // Valid coordinate fallback centered on Indore
  const validLat = !isNaN(lat) && lat !== 0 ? lat : (userLocation?.lat || 22.7196)
  const validLng = !isNaN(lng) && lng !== 0 ? lng : (userLocation?.lng || 75.8577)

  // Reverse geocoding helper via backend proxy (zero CORS errors)
  const reverseGeocode = useCallback(
    async (targetLat: number, targetLng: number) => {
      setIsReverseGeocoding(true)
      try {
        const data = await api.reverseGeocode(targetLat, targetLng)
        if (data && data.display_name) {
          const formatted = data.display_name
          setDetectedAddress(formatted)
          if (onFetchAddress) {
            onFetchAddress(formatted)
          }
        }
      } catch (err) {
        console.error('Reverse geocode error:', err)
      } finally {
        setIsReverseGeocoding(false)
      }
    },
    [onFetchAddress]
  )

  // Initialize Picker Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [validLat, validLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    })

    const initialLayer = L.tileLayer(TILE_LAYERS[mapType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[mapType].attribution,
    }).addTo(map)

    tileLayerRef.current = initialLayer

    // Draggable red pin
    const marker = L.marker([validLat, validLng], {
      icon: createPickerMarkerIcon(),
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map)

    marker.on('dragend', (e) => {
      const position = e.target.getLatLng()
      onLocationSelect({ lat: position.lat, lng: position.lng })
      reverseGeocode(position.lat, position.lng)
    })

    // Click anywhere on map to drop / move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
      reverseGeocode(e.latlng.lat, e.latlng.lng)
    })

    markerRef.current = marker
    mapRef.current = map

    // Fix modal layout measurement (critical for Leaflet in dialogs)
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 450)

    // Initial reverse geocode if address not yet set
    reverseGeocode(validLat, validLng)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Switch between Street and Satellite layers
  useEffect(() => {
    if (!mapRef.current) return
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }
    const newLayer = L.tileLayer(TILE_LAYERS[mapType].url, {
      maxZoom: 19,
      attribution: TILE_LAYERS[mapType].attribution,
    }).addTo(mapRef.current)
    tileLayerRef.current = newLayer
  }, [mapType])

  // Update marker position if external lat/lng changes
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return
    const cur = markerRef.current.getLatLng()
    if (Math.abs(cur.lat - validLat) > 0.0001 || Math.abs(cur.lng - validLng) > 0.0001) {
      markerRef.current.setLatLng([validLat, validLng])
      mapRef.current.panTo([validLat, validLng])
    }
  }, [validLat, validLng])

  // Search address or landmark via backend proxy (zero CORS errors)
  const handleSearchPlace = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setShowResultsDropdown(false)
    try {
      const data = await api.searchLocation(searchQuery)
      if (data && data.length > 0) {
        setSearchResults(data)
        const item = data[0]
        const newLat = parseFloat(item.lat)
        const newLng = parseFloat(item.lon)

        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 })
          markerRef.current.setLatLng([newLat, newLng])
          onLocationSelect({ lat: newLat, lng: newLng })
          setDetectedAddress(item.display_name)
          if (onFetchAddress) {
            onFetchAddress(item.display_name)
          }
        }
        if (data.length > 1) {
          setShowResultsDropdown(true)
        }
      } else {
        alert('Location not found. Try including landmark or city name (e.g., "Vijay Nagar, Indore").')
      }
    } catch (err) {
      console.error('Picker search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  // Select a specific search result from dropdown
  const selectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const newLat = parseFloat(item.lat)
    const newLng = parseFloat(item.lon)
    if (mapRef.current && markerRef.current) {
      mapRef.current.flyTo([newLat, newLng], 16, { duration: 1.2 })
      markerRef.current.setLatLng([newLat, newLng])
      onLocationSelect({ lat: newLat, lng: newLng })
      setDetectedAddress(item.display_name)
      if (onFetchAddress) {
        onFetchAddress(item.display_name)
      }
    }
    setSearchQuery(item.display_name.split(',')[0])
    setShowResultsDropdown(false)
  }

  // Use browser GPS current location
  const handleUseCurrentLocation = () => {
    // If parent already has userLocation, use it immediately
    if (userLocation && mapRef.current && markerRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 1.2 })
      markerRef.current.setLatLng([userLocation.lat, userLocation.lng])
      onLocationSelect({ lat: userLocation.lat, lng: userLocation.lng })
      reverseGeocode(userLocation.lat, userLocation.lng)
      return
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setIsLocating(true)
    const tryGeo = (highAcc: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false)
          const userLat = pos.coords.latitude
          const userLng = pos.coords.longitude

          if (mapRef.current && markerRef.current) {
            mapRef.current.flyTo([userLat, userLng], 17, { duration: 1.2 })
            markerRef.current.setLatLng([userLat, userLng])
            onLocationSelect({ lat: userLat, lng: userLng })
            reverseGeocode(userLat, userLng)
          }
        },
        (err) => {
          if (highAcc) {
            tryGeo(false)
          } else {
            setIsLocating(false)
            alert('Could not access current location. Please grant permission in your browser address bar or use the search bar above.')
          }
        },
        { enableHighAccuracy: highAcc, timeout: highAcc ? 4000 : 8000, maximumAge: 60000 }
      )
    }
    tryGeo(true)
  }

  return (
    <div style={{ marginBottom: '14px' }}>
      {/* Header with Coordinates and Current Location Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#3c4043', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={13} color="#ea4335" /> Select Exact Location on Google Map
        </span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          style={{
            border: '1px solid #1a73e8',
            background: '#e8f0fe',
            color: '#1a73e8',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
        >
          <Navigation2 size={13} /> {isLocating ? 'Locating...' : '📍 Use Current Location'}
        </button>
      </div>

      {/* GOOGLE MAPS STYLE SEARCH BAR & MAP CONTAINER */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '240px',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #dadce0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        {/* Map */}
        <div ref={containerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Floating Search Bar */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            right: '8px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
              padding: '3px 8px',
              gap: '6px',
            }}
          >
            <Search size={14} color="#5f6368" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!e.target.value.trim()) setShowResultsDropdown(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSearchPlace(e)
                }
              }}
              placeholder="Search area, colony or landmark (e.g. Rajwada, Indore)..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '11px',
                color: '#202124',
                background: 'transparent',
                padding: '4px 0',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSearchQuery('')
                  setShowResultsDropdown(false)
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 2,
                  cursor: 'pointer',
                  color: '#70757a',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSearchPlace(e)
              }}
              disabled={isSearching}
              style={{
                background: '#1a73e8',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </div>

          {/* Autocomplete / Suggestions Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <div
              style={{
                marginTop: '4px',
                background: '#ffffff',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
                maxHeight: '130px',
                overflowY: 'auto',
                border: '1px solid #e8eaed',
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    selectSearchResult(item)
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: '#202124',
                    borderBottom: idx < searchResults.length - 1 ? '1px solid #f1f3f4' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                >
                  <MapPin size={12} color="#ea4335" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.display_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Satellite vs Street Toggle */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            style={{
              background: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#202124',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Layers size={12} color="#1a73e8" />
            <span>{mapType === 'streets' ? 'Satellite' : 'Street'}</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 1000,
            background: '#ffffff',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            style={{
              width: '28px',
              height: '26px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              borderBottom: '1px solid #eee',
            }}
          >
            <Plus size={13} color="#444" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            style={{
              width: '28px',
              height: '26px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Minus size={13} color="#444" />
          </button>
        </div>
      </div>

      {/* Auto-detected address preview */}
      <div
        style={{
          marginTop: '6px',
          background: '#f8f9fa',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '10px',
          color: '#5f6368',
          border: '1px solid #e8eaed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
          <strong>Auto Address:</strong>{' '}
          {isReverseGeocoding ? 'Detecting address from coordinates...' : detectedAddress || 'Click map to pin point'}
        </span>
        <span style={{ fontSize: '9px', color: '#80868b' }}>
          {validLat.toFixed(4)}, {validLng.toFixed(4)}
        </span>
      </div>
    </div>
  )
}

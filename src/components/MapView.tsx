
"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  ScaleControl,
  ZoomControl,
  CircleMarker,
  Popup,
  Tooltip,
  Polyline,
  Polygon,
  useMap,
} from "react-leaflet";

import {
  Layers3,
  Map as MapIcon,
  Satellite,
  LocateFixed,
  ShieldAlert,
} from "lucide-react";

import type { SimulationResponse } from "@/types/simulation";
import "leaflet/dist/leaflet.css";

type Place = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    placeId: string;
    kind: "home" | "meeting";
    label: string;
    simulated: boolean;
    nodeId: string;
  };
};

type PlacesData = {
  type: "FeatureCollection";
  features: Place[];
};

type Props = {
  originId: string;
  scenario: "normal" | "blocked";
  simulation: SimulationResponse | null;
  loading: boolean;
  simulationError: string;
};

type MapStyle = "satellite" | "streets";

const CENTER: [number, number] = [
  -5.26167,
  -80.67417,
];

function AjustarVista({
  places,
  originId,
  simulation,
  resetCount,
}: {
  places: Place[];
  originId: string;
  simulation: SimulationResponse | null;
  resetCount: number;
}) {
  const map = useMap();
  const routeCoordinates =
    simulation?.route?.geometry.coordinates;

  useEffect(() => {
    if (!places.length) return;

    const points: [number, number][] = [];

    // Enfocar el hogar seleccionado y el punto de encuentro.
    const relevantPlaces = places.filter(
      (place) =>
        place.properties.placeId === originId ||
        place.properties.kind === "meeting"
    );

    for (const place of relevantPlaces) {
      const [longitude, latitude] =
        place.geometry.coordinates;

      points.push([latitude, longitude]);
    }

    // Incluir la ruta completa, incluso cuando tiene desvíos.
    if (routeCoordinates) {
      for (const [longitude, latitude] of routeCoordinates) {
        points.push([latitude, longitude]);
      }
    }

    if (!points.length) return;

    map.fitBounds(points, {
      paddingTopLeft: [55, 110],
      paddingBottomRight: [55, 65],
      maxZoom: 16,
      animate: true,
    });
  }, [
    map,
    places,
    originId,
    routeCoordinates,
    resetCount,
  ]);

  return null;
}

export default function MapView({
  originId,
  scenario,
  simulation,
  loading,
  simulationError,
}: Props) {
  const [places, setPlaces] = useState<Place[]>([]);

  const [mapStyle, setMapStyle] =
    useState<MapStyle>("satellite");

  const [showRiskZones, setShowRiskZones] =
    useState(false);

  const [resetCount, setResetCount] = useState(0);

  const [placesError, setPlacesError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlaces() {
      try {
        const response = await fetch(
          "/data/places.geojson"
        );

        if (!response.ok) {
          throw new Error("No se pudieron cargar los lugares.");
        }

        const data =
          (await response.json()) as PlacesData;

        if (
          data.type !== "FeatureCollection" ||
          !Array.isArray(data.features)
        ) {
          throw new Error("Datos de lugares no válidos.");
        }

        if (active) {
          setPlaces(data.features);
          setPlacesError("");
        }
      } catch {
        if (active) {
          setPlacesError(
            "No se pudieron cargar los puntos del mapa."
          );
        }
      }
    }

    loadPlaces();

    return () => {
      active = false;
    };
  }, []);

  // Simulación provista por la página: una sola solicitud /api/simulate
  // alimenta el mapa, el panel lateral y el formulario familiar.

  const routePositions: [number, number][] =
    simulation?.route?.geometry.coordinates.map(
      ([longitude, latitude]) => [
        latitude,
        longitude,
      ]
    ) ?? [];

  const blockedRoads =
    simulation?.roads.features.filter((road) =>
      simulation.blockedRoadIds.includes(
        road.properties.roadId
      )
    ) ?? [];

  const riskZones =
    simulation?.riskZones.features ?? [];

  const selectedPlace = places.find(
    (place) =>
      place.properties.placeId === originId
  );

  const selectedLabel =
    selectedPlace?.properties.label ??
    originId.replace("_", " ").toUpperCase();

  const error = placesError || simulationError;

  return (
    <div className="rt-map relative h-full min-h-[330px] w-full overflow-hidden bg-[#111C1A]">
      <MapContainer
        center={CENTER}
        zoom={15}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full min-h-[330px] w-full"
      >
        {mapStyle === "satellite" ? (
          <TileLayer
            key="satellite"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, GIS User Community'
            maxZoom={19}
          />
        ) : (
          <TileLayer
            key="streets"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        )}

        <AjustarVista
          places={places}
          originId={originId}
          simulation={simulation}
          resetCount={resetCount}
        />

        {showRiskZones &&
          riskZones.map((zone, index) => (
            <Polygon
              key={`risk-${index}`}
              positions={zone.geometry.coordinates.map(
                (ring) =>
                  ring.map(
                    ([longitude, latitude]) =>
                      [latitude, longitude] as [
                        number,
                        number
                      ]
                  )
              )}
              pathOptions={{
                color: "#F38B56",
                fillColor: "#F38B56",
                fillOpacity: 0.18,
                weight: 2,
                dashArray: "5 7",
              }}
            >
              <Popup>
                <strong>{zone.properties.label}</strong>
                <p>
                  Zona ilustrativa del escenario.
                  No representa una evaluación oficial.
                </p>
              </Popup>
            </Polygon>
          ))}

        {blockedRoads.map((road) => {
          const positions = road.geometry.coordinates.map(
            ([longitude, latitude]) =>
              [latitude, longitude] as [
                number,
                number
              ]
          );

          return (
            <Polyline
              key={`blocked-shadow-${road.properties.roadId}`}
              positions={positions}
              pathOptions={{
                color: "#1F1715",
                opacity: 0.85,
                weight: 13,
              }}
              interactive={false}
            />
          );
        })}

        {blockedRoads.map((road) => (
          <Polyline
            key={`blocked-${road.properties.roadId}`}
            positions={road.geometry.coordinates.map(
              ([longitude, latitude]) =>
                [latitude, longitude] as [
                  number,
                  number
                ]
            )}
            pathOptions={{
              color: "#FF9867",
              weight: 7,
              opacity: 1,
              dashArray: "7 10",
              lineCap: "round",
            }}
          >
            <Tooltip sticky>
              Vía bloqueada en el escenario hipotético
            </Tooltip>
          </Polyline>
        ))}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#0C2522",
              weight: 15,
              opacity: 0.88,
              lineCap: "round",
              lineJoin: "round",
            }}
            interactive={false}
          />
        )}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#45DCC0",
              weight: 10,
              opacity: 0.32,
              lineCap: "round",
              lineJoin: "round",
            }}
            interactive={false}
          />
        )}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#8AFBE2",
              weight: 5,
              opacity: 1,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Tooltip sticky>
              Recorrido ilustrativo calculado
            </Tooltip>
          </Polyline>
        )}

        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#F1FFF9",
              weight: 2,
              opacity: 0.9,
              dashArray: "2 15",
              className: "rt-route-motion",
              lineCap: "round",
            }}
            interactive={false}
          />
        )}

        {places.map((place) => {
          const [longitude, latitude] =
            place.geometry.coordinates;

          const position: [number, number] = [
            latitude,
            longitude,
          ];

          const isHome =
            place.properties.kind === "home";

          const selected =
            place.properties.placeId === originId;

          const color = isHome
            ? "#BAF274"
            : "#FF9867";

          return (
            <CircleMarker
              key={place.properties.placeId}
              center={position}
              radius={selected ? 11 : 8}
              pathOptions={{
                color: "#14201B",
                fillColor: color,
                fillOpacity: 1,
                weight: 3,
              }}
            >
              {(selected || !isHome) && (
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -16]}
                  opacity={1}
                  className="rt-location-label"
                >
                  {selected
                    ? `${place.properties.label} · Origen`
                    : "Punto de encuentro"}
                </Tooltip>
              )}

              <Popup>
                <div className="min-w-[150px]">
                  <strong>
                    {place.properties.label}
                  </strong>
                  <p>
                    {isHome
                      ? "Hogar ficticio de demostración."
                      : "Punto de encuentro ilustrativo."}
                  </p>
                  <p>
                    No es una ubicación oficial de
                    evacuación.
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        <ZoomControl position="bottomleft" />
        <ScaleControl
          position="bottomleft"
          imperial={false}
        />
      </MapContainer>

      <div className="absolute left-2 top-2 z-[1000] w-[195px] max-w-[calc(100%-1rem)] rounded-2xl border border-white/20 bg-[#14201B]/95 p-3 sm:left-4 sm:top-4 sm:w-[245px] sm:p-4 text-[#F1F4EB] shadow-[0_15px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#BAF274]/15 text-[#BAF274]">
            <Layers3 size={17} />
          </span>

          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#BAF274]">
              Exploración territorial
            </p>
            <p className="text-xs font-semibold">
              Catacaos · Piura
            </p>
          </div>
        </div>

        <div className="my-3 h-px bg-white/10" />

        <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[#B9C9C0]">
          Vista del mapa
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMapStyle("satellite")}
            aria-pressed={mapStyle === "satellite"}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
              mapStyle === "satellite"
                ? "border-[#BAF274] bg-[#BAF274]/15 text-[#D9FFAC]"
                : "border-white/15 bg-white/5 text-[#CED8D0] hover:bg-white/10"
            }`}
          >
            <Satellite size={14} />
            Satélite
          </button>

          <button
            type="button"
            onClick={() => setMapStyle("streets")}
            aria-pressed={mapStyle === "streets"}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-[11px] font-medium transition-colors ${
              mapStyle === "streets"
                ? "border-[#BAF274] bg-[#BAF274]/15 text-[#D9FFAC]"
                : "border-white/15 bg-white/5 text-[#CED8D0] hover:bg-white/10"
            }`}
          >
            <MapIcon size={14} />
            Calles
          </button>
        </div>

        <button
          type="button"
          onClick={() => setResetCount((count) => count + 1)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-[#EAE5DA] transition-colors hover:bg-white/10"
        >
          <LocateFixed size={14} />
          Centrar recorrido
        </button>

        {scenario === "blocked" && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-[#D6DDD4]">
            <input
              type="checkbox"
              checked={showRiskZones}
              onChange={(event) =>
                setShowRiskZones(event.target.checked)
              }
              className="accent-[#F38B56]"
            />
            Ver zonas de riesgo ilustrativas
          </label>
        )}

        <p className="mt-3 text-[10px] leading-4 text-[#99AA9F]">
          {mapStyle === "satellite"
            ? "Imágenes satelitales de referencia; no son en tiempo real."
            : "Cartografía de OpenStreetMap."}
        </p>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-[1000] hidden max-w-[215px] rounded-xl border border-white/20 bg-[#14201B]/90 px-4 py-3 text-[#F1F4EB] shadow-xl backdrop-blur-xl sm:block">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A9B4A9]">
          Origen seleccionado
        </p>

        <p className="mt-1 text-sm font-semibold text-[#BAF274]">
          {selectedLabel}
        </p>

        <div className="mt-2 flex items-center gap-2 text-[10px]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              scenario === "blocked"
                ? "bg-[#F38B56]"
                : "bg-[#BAF274]"
            }`}
          />

          <span>
            {scenario === "blocked"
              ? "Bloqueo hipotético"
              : "Escenario normal"}
          </span>
        </div>

        {loading && (
          <p className="mt-2 text-[10px] text-[#B8C5BB]">
            Calculando recorrido...
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="absolute bottom-20 left-4 z-[1000] max-w-[310px] rounded-xl border border-[#F38B56]/40 bg-[#261B18]/95 p-3 text-xs text-[#FFD7C2] shadow-xl"
        >
          <ShieldAlert size={16} className="mb-2" />
          {error}
        </div>
      )}

      <style>{`
        .rt-map .leaflet-container {
          background: #16221e;
          font-family: inherit;
        }

        .rt-map .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.28);
        }

        .rt-map .leaflet-control-zoom a {
          background: #17231e;
          color: #baf274;
          border-bottom-color: rgba(255,255,255,0.12);
        }

        .rt-map .leaflet-control-zoom a:hover {
          background: #2f4035;
          color: #e7ffca;
        }

        .rt-map .leaflet-control-scale-line {
          background: rgba(20,32,27,0.88);
          border-color: #baf274;
          color: #f1f4eb;
          text-shadow: none;
          border-radius: 3px;
          padding: 2px 5px;
        }

        .rt-map .leaflet-control-attribution {
          background: rgba(20,32,27,0.88);
          color: #eae5da;
          font-size: 10px;
        }

        .rt-map .leaflet-control-attribution a {
          color: #baf274;
        }

        .rt-map .rt-location-label {
          border: 1px solid rgba(186,242,116,0.45);
          border-radius: 8px;
          background: rgba(20,32,27,0.95);
          box-shadow: 0 5px 22px rgba(0,0,0,0.3);
          color: #eaffd1;
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 9px;
        }

        .rt-map .rt-location-label::before {
          border-top-color: rgba(20,32,27,0.95);
        }

        .rt-map .rt-route-motion {
          animation: rt-route-flow 2.2s linear infinite;
        }

        @keyframes rt-route-flow {
          to {
            stroke-dashoffset: -68;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .rt-map .rt-route-motion {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

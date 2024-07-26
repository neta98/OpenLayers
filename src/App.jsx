import { Feature } from 'ol';
import EditBar from 'ol-ext/control/EditBar';
import 'ol-ext/dist/ol-ext.css';
import Popup from 'ol-ext/overlay/Popup';
import Map from 'ol/Map';
import View from 'ol/View';
import { click } from 'ol/events/condition';
import { Polygon } from 'ol/geom';
import Select from 'ol/interaction/Select';
import ImageLayer from 'ol/layer/Image';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import 'ol/ol.css';
import ImageStatic from 'ol/source/ImageStatic';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import proj4 from 'proj4';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const PopupComponent = ({ infoMap }) => {
  const [info, setInfo] = useState(null);

  const handleClick = () => {
    console.log("infoMap", infoMap);
    setInfo(infoMap);
  };

  return (
    <div>
      <button onClick={handleClick} className='btn btn-primary'> Info </button>
      {info && (
        <div style={{ background: '#333', color: '#fff', padding: '10px', marginTop: '10px', borderRadius: '5px' }}>
          <pre>
            <strong>Frame Index:</strong> {info?.mapBrowserEvent?.map?.frameIndex_}{"\n"}
            <strong>Pixel To Coordinate Transform:</strong> {JSON.stringify(infoMap?.mapBrowserEvent?.map?.frameState_?.pixelToCoordinateTransform, null, 2)}{"\n"}
            <strong>Extent:</strong> {JSON.stringify(info?.mapBrowserEvent?.map?.frameState_?.extent, null, 2)}{"\n"}
            <strong>Coordinate to Pixel Transform:</strong> {JSON.stringify(infoMap?.mapBrowserEvent?.map?.frameState_?.coordinateToPixelTransform, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}


const MapComponent = () => {

  const [features, setFeatures] = useState([]);
  const [map, setMap] = useState();

  // Definizione del sistema di coordinate EPSG:3003 con proj4
  proj4.defs('EPSG:3003', '+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=1500000 +y_0=0 +ellps=intl +units=m +no_defs');
  // Definizione del sistema di coordinate EPSG:3857 con proj4
  proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs');

  // Trasformazione delle coordinate da EPSG:3003 a EPSG:3857 utilizzando proj4
  const coord3857FirstPoint = proj4('EPSG:3003', 'EPSG:3857', [1397705.5609122282, 4294271.163289327]);
  const coord3857SecondPoint = proj4('EPSG:3003', 'EPSG:3857', [1592937.5104892706, 4572445.570833506]);

  // Coordinate del quadrato in EPSG:3857
  const squareCoords = [
    [870843.3284442091, 4689512.535020835],
    [1125360.471684545, 4689512.535020835],
    [1125360.471684545, 5053866.837982913],
    [870843.3284442091, 5053866.837982913],
    [870843.3284442091, 4689512.535020835], // per chiudere il quadrato
  ];

  // Creazione del poligono
  const squarePolygon = new Feature({
    geometry: new Polygon([squareCoords]),
  });

  // Stile del poligono
  const squareStyle = new Style({
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.4)',
    }),
    stroke: new Stroke({
      color: 'rgba(255, 255, 0, 1)',
      width: 2,
    }),
  });

  // Applicazione dello stile al poligono
  squarePolygon.setStyle(squareStyle);

  //Creazione sorgente per il vector 
  const vectorSource = new VectorSource({
    features: [squarePolygon],
  });

  const vectorLayer = new VectorLayer({
    source: vectorSource,
  })

  const select = new Select({
    condition: click,
    layers: [vectorLayer],
  });

  const popup = new Popup({
    popupClass: 'default anim', // Classe CSS per lo stile e l'animazione del popup
    closeBox: true,
  });

  select.on('select', (event) => {
    popup.hide()
    const feature = event.selected[0];
    if (feature && !popup.active) {
      // Crea un contenitore per il componente React
      const container = document.createElement('div');

      // Monta il componente React nel contenitore usando createRoot
      const root = createRoot(container);
      root.render(<PopupComponent infoMap={event} />);

      popup.show(feature.getGeometry().getInteriorPoint().getCoordinates(), container); // Mostra il popup
    } else {
      popup.hide()
    }
  });

  // Funzione per centrare la view sul poligono selezionato tramite i button nella sidebar
  const onClickFeature = id => {
    const selectedFeature = features.find(feature => feature.ol_uid === id);
    const geometry = selectedFeature.getGeometry();
    const extent = geometry.getExtent();
    map.getView().fit(extent, { padding: [20, 20, 20, 20] });
  }

  // Funzione per aggiornare lo stato delle features
  const updateFeatures = () => setFeatures(vectorSource.getFeatures());

  useEffect(() => {
    // Creazione della mappa OpenLayers
    const map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new ImageLayer({
          source: new ImageStatic({
            url: "https://basemap.nationalmap.gov/arcgis/services/USGSImageryOnly/MapServer/WmsServer?SERVICE=WMS&REQUEST=GetMap&LAYERS=0&STYLES=&FORMAT=image/jpeg&BGCOLOR=0xFFFFFF&TRANSPARENT=FALSE&CRS=EPSG:3003&BBOX=1397705.5609122282,4294271.163289327,1592937.5104892706,4572445.570833506&WIDTH=256&HEIGHT=256&VERSION=1.3.0", // URL dell'immagine da visualizzare
            imageExtent: coord3857FirstPoint.concat(coord3857SecondPoint), // Estensione trasformata in EPSG:3857
          }),
        }),
        vectorLayer
      ],
      view: new View({
        center: [0, 0],
        zoom: 7,
      }),
      controls: [
        new EditBar({
          source: vectorSource,
          interactions: {
            Draw: true,
            DrawPolygon: true,
            DrawPoint: false,
            DrawLine: false,
            DrawCircle: false,
            DrawRectangle: false,
            DrawHole: false,
            Select: true,
            Modify: true,
            Delete: true,
            Transform: true,
            Undo: true,
            Redo: true
          }
        })
      ]
    });

    map.addInteraction(select);

    map.addOverlay(popup);

    setMap(map);
    setFeatures(vectorSource.getFeatures());

    // Aggiungi listener agli eventi delle features
    vectorSource.on('addfeature', updateFeatures);
    vectorSource.on('removefeature', updateFeatures);
    vectorSource.on('changefeature', updateFeatures);

    // Pulisci i listener quando il componente viene smontato
    return () => {
      vectorSource.un('addfeature', updateFeatures);
      vectorSource.un('removefeature', updateFeatures);
      vectorSource.un('changefeature', updateFeatures);
      map.setTarget(null);  // Cleanup della mappa quando il componente viene smontato
    };

  }, []);

  return (
    <div style={{ display: "flex" }}>
      <div id="map" style={{ width: '80%', height: '100vh' }}></div>
      <div id="sidebar" style={{ display: "flex", flexDirection: "column", width: '20%', height: '100vh' }}>
        {
          features.map(feature => <div style={{ display: "flex", justifyContent: "center", padding: 10 }}><button className='btn btn-primary' onClick={() => onClickFeature(feature.ol_uid)}>{feature.ol_uid}</button></div>)
        }
      </div>
    </div>
  );
};

export default MapComponent;

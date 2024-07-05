import React, { useEffect, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import proj4 from 'proj4';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Polygon } from 'ol/geom';
import { Feature } from 'ol';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import EditBar from 'ol-ext/control/EditBar';
import 'ol-ext/dist/ol-ext.css';
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';
import Popup from 'ol-ext/overlay/Popup';

const MapComponent = () => {

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
      popup.show(feature.getGeometry().getInteriorPoint().getCoordinates(), '<div>Popup contenuto</div>'); // Mostra il popup
    } else {
      popup.hide()
    }
  });

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

    return () => {
      map.setTarget(null); // Cleanup della mappa quando il componente viene smontato
    };

  }, []);

  return (
    <div id="map" style={{ width: '100%', height: '100vh' }}></div>
  );
};

export default MapComponent;

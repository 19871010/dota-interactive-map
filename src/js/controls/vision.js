import SourceVector from 'ol/source/vector';
import LayerVector from 'ol/layer/vector';
import { latLonToWorld, worldToLatLon, getTileRadius } from './../conversion';
import getLightUnion from './../getLightUnion';
import styles from './../styleDefinitions';
import MultiPolygon from 'ol/geom/multipolygon';
import Feature from 'ol/feature';

function VisionControl(InteractiveMap) {
    const self = this;
    this.InteractiveMap = InteractiveMap;
    this.source = new SourceVector({
        defaultDataProjection : 'pixel'
    });
    this.layer =  new LayerVector({
        source: this.source,
        style: styles.visionSimulation
    });
}

VisionControl.prototype.getVisionFeature = function (feature, coordinate, radius) {
    const vs = this.InteractiveMap.vs;

    // get coordinate from feature if not provided
    let worldCoordinate;
    let dotaProps;
    if (!coordinate) {
        dotaProps = feature.get('dotaProps');
        worldCoordinate = [dotaProps.x, dotaProps.y];
    }
    else {
        worldCoordinate = latLonToWorld(coordinate);
    }
    
    // get radius from feature if not provided
    radius = radius || this.InteractiveMap.getFeatureVisionRadius(feature, dotaProps)
    if (radius == null) return;
    
    const gridXY = vs.WorldXYtoGridXY(worldCoordinate[0], worldCoordinate[1]);
    if (vs.isValidXY(gridXY.x, gridXY.y, true, true, true)) {
        vs.updateVisibility(gridXY.x, gridXY.y, getTileRadius(radius));
        
        const outlines = getLightUnion(vs.grid, vs.lights).map(function (ring) {
            return ring.map(function (point) {
                const worldXY = vs.GridXYtoWorldXY(point.x, point.y);
                return worldToLatLon([worldXY.x, worldXY.y]);
            })
        });
        const multiPolygon = new MultiPolygon([outlines], 'XY');
        const feature = new Feature({
            geometry: multiPolygon
        });
        feature.set('visionData', {
            area: vs.area,
            lightArea: vs.lightArea
        }, false);
        return feature;
    }
}

VisionControl.prototype.toggleVisionFeature = function (feature) {
    const visionFeature = feature.get('visionFeature');
    if (visionFeature) {
        this.source.removeFeature(visionFeature);
        feature.set('visionFeature', null);
        return null;
    }
    else {
        return this.setVisionFeature(feature);
    }
}

VisionControl.prototype.removeVisionFeature = function (feature) {
    const visionFeature = feature.get('visionFeature');
    if (visionFeature) {
        this.source.removeFeature(visionFeature);
        feature.set('visionFeature', null);
    }
}

VisionControl.prototype.setVisionFeature = function (feature, coordinate, unitClass) {
    // remove existing visionFeature for feature
    this.removeVisionFeature(feature);
    
    // determine radius according to unit type
    const radius = this.InteractiveMap.getFeatureVisionRadius(feature, feature.get('dotaProps'), unitClass);
    // create and add vision feature
    const visionFeature = this.getVisionFeature(feature, coordinate, radius);
    if (visionFeature) {
        this.source.addFeature(visionFeature);
    }
    feature.set('visionFeature', visionFeature, true);
    return visionFeature;
}


export default VisionControl;
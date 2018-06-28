import Observable from 'ol/observable';
import Polygon from 'ol/geom/polygon';
import LinearRing from 'ol/geom/linearring';
import Feature from 'ol/feature';
import getPopupContent from './../getPopupContent';
import styles from './../styleDefinitions';
import mapConstants from './../mapConstants';
import { worldToLatLon } from './../conversion';
import createCirclePointCoords from './../util/createCirclePointCoords';

class InfoControl {
    constructor(InteractiveMap) {
        this.InteractiveMap = InteractiveMap;
        //this.highlight = null;
        this.lastPointerMoveTime = Date.now();
        this.pointerMoveListener = null;
        this.clickListener = null;
    }
    
    activate() {
        if (!this.pointerMoveListener) {
            this.pointerMoveListener = this.InteractiveMap.map.on('pointermove', evt => {
                // When user was dragging map, then coordinates didn't change and there's
                // no need to continue
                if (evt.dragging) {
                    return;
                }

                const pixel = this.InteractiveMap.map.getEventPixel(evt.originalEvent);
                
                // if mouse over a building feature, show info and highlight
                let feature = this.InteractiveMap.map.forEachFeatureAtPixel(pixel, feature => feature, {
                    layerFilter: this.InteractiveMap.layerFilters.marker
                });
                if (feature) {
                    if (!this.isActive()) {
                        this.displayFeatureInfo(feature, false);
                    }
                    this.highlight(feature);
                }
                else {
                    this.close(false);
            
                    // if mouse over a ward feature, highlight
                    feature = this.InteractiveMap.checkAndHighlightWard(pixel);
                    
                    if (feature) {
                        this.InteractiveMap.wardControl.showVisibilityInfo(feature.get('visionFeature'));
                    }
                    // no highlighted feature so unhighlight current feature
                    else if (!this.isActive()) {
                        this.unhighlight();
                    }
                }
            });
        }
        if (!this.clickListener) {
            this.clickListener = this.InteractiveMap.map.on('click', evt => {
                this.unhighlight();
                let feature = this.InteractiveMap.map.forEachFeatureAtPixel(evt.pixel, feature => feature, {
                    layerFilter: this.InteractiveMap.layerFilters.marker
                });
                if (feature) {
                    if (!feature.get("clicked")) {
                        this.InteractiveMap.deselectAll();
                        const dotaProps = feature.get('dotaProps');
                        if (feature.get('dotaProps').id == "ent_dota_tree") {
                            this.InteractiveMap.treeControl.toggleTree(feature, dotaProps);
                        }
                        else {
                            this.displayFeatureInfo(feature, true);
                            this.select(feature);
                            this.InteractiveMap.panTo(evt.coordinate);
                        }
                    }
                    else {
                        this.InteractiveMap.deselectAll();
                        this.close(true);
                    }
                }
                else {
                    // if clicked a ward feature, highlight
                    feature = this.InteractiveMap.checkAndHighlightWard(evt.pixel);
                    
                    if (feature) {
                        const visionFeature = feature.get('visionFeature');
                        if (visionFeature) {
                            this.InteractiveMap.wardControl.showVisibilityInfo(feature.get('visionFeature'), true);
                        }
                        else {
                            this.close(true);
                        }
                        this.InteractiveMap.panTo(evt.coordinate);
                    }
                    // no highlighted feature so unhighlight current feature
                    else if (!this.isActive()) {
                        this.unhighlight();            
                        this.close(true);
                    }
                    this.InteractiveMap.deselectAll();
                }
            });
        }
    }
    
    deactivate() {
        this.InteractiveMap.unhighlightWard();
        Observable.unByKey(this.pointerMoveListener);
        this.pointerMoveListener = null;
        Observable.unByKey(this.clickListener);
        this.clickListener = null;
    }

    setContent(html) {
        this.infoContent.innerHTML = html;
    }

    isActive() {
        return this.info.classList.contains('active');
    }

    open(bClicked) {
        this.info.classList.add('slideUp');
        this.info.classList.remove('slideDown');
        if (bClicked) {
            this.info.classList.add('active');
        }
    }

    close(bOverrideActive) {
        if (!this.isActive() || bOverrideActive) {
            this.info.classList.add('slideDown');
            this.info.classList.remove('slideUp');
            this.info.classList.remove('active');
        }
    }

    initialize(id) {
        this.id = id;
        this.info = document.getElementById(id);
        this.infoContent = document.querySelector('#' + id + ' .message-content');
        this.closeBtn = document.querySelector('#' + id + ' .btn-close');
        this.closeBtn.addEventListener('click', evt => this.close(true), false);
    }
    
    displayFeatureInfo(feature, bClicked) {
        this.setContent(getPopupContent(this.InteractiveMap.getStatData(), feature));
        this.open(bClicked);
    };

    unhighlight(feature) {
        const highlightedFeature = feature || this.InteractiveMap.highlightedFeature;
        if (highlightedFeature && !highlightedFeature.get("clicked")) {
            const dotaProps = highlightedFeature.get('dotaProps');
            if (dotaProps) {
                if (dotaProps.id == 'npc_dota_neutral_spawner') {
                    const pullRange = highlightedFeature.get('pullRange');
                    if (pullRange) {
                        this.InteractiveMap.getMapLayer('pullRange').getSource().removeFeature(pullRange);
                        highlightedFeature.set("pullRange", null, true);
                    }
                    const guardRange = highlightedFeature.get('guardRange');
                    if (guardRange) {
                        this.InteractiveMap.getMapLayer('pullRange').getSource().removeFeature(guardRange);
                        highlightedFeature.set("guardRange", null, true);
                    }
                }
            }
        }
        this.InteractiveMap.unhighlight();
    }

    highlight(feature) {
        this.unhighlight();
        const dotaProps = feature.get('dotaProps');
        if (dotaProps) {
            if (dotaProps.id == 'npc_dota_neutral_spawner') {
                if (!feature.get('pullRange')) {
                    let circle = this.InteractiveMap.getRangeCircle(feature, null, null, null, 400);
                    feature.set("guardRange", circle, true);
                    this.InteractiveMap.getMapLayer('pullRange').getSource().addFeature(circle);
                    
                    const center = worldToLatLon([dotaProps.x, dotaProps.y]);
                    const pullTiming = mapConstants.pullRangeTiming[dotaProps.pullType];
                    const pullMaxCoords = createCirclePointCoords(center[0], center[1], 400 + pullTiming * 350, 360);
                    const pullMinCoords = createCirclePointCoords(center[0], center[1], 400 + pullTiming * 270, 360);
                    const geom = new Polygon([pullMaxCoords]);
                    geom.appendLinearRing(new LinearRing(pullMinCoords));
                    circle = new Feature(geom);
                    feature.set("pullRange", circle, true);
                    this.InteractiveMap.getMapLayer('pullRange').getSource().addFeature(circle);
                }
            }
        }
        this.InteractiveMap.highlight(feature);
    }

    select(feature) {    
        if (feature && !feature.get("clicked")) {
            if (feature == this.InteractiveMap.highlightedFeature) {
                this.unhighlight();
            }
            this.InteractiveMap.selectSource.addFeature(feature);
            feature.set("clicked", true, true);
        }
    }

}

export default InfoControl;
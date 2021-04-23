import * as THREE from 'three';
import {MeshLine, MeshLineMaterial} from "three.meshline";

export class MotionVisualization extends THREE.Group {

    constructor(parentObj) {

        super();

        this.parentContainer = parentObj;

        this.splineMesh = new THREE.Mesh();
        this.motionPoints = [];
        this.distanceThreshold = 10;

        /*
        this.testline(new THREE.Vector3(0,0,2000));
        this.testline = this.testline.bind(this);
         */

    }

    newMotionPoint(pos){

        if (this.motionPoints.length === 0){
            this.motionPoints.push(pos);


        } else {
            if (this.motionPoints[this.motionPoints.length-1].distanceTo(pos) > this.distanceThreshold){
                this.motionPoints.push(pos);
                this.updateMotionLine();

                console.log("NEW POINT IN MOTION LINE!", pos);
            }
        }

    }

    /*
    testline(pos){
        console.log("DRAWING TEST LINE: ", this.parentContainer);

        this.parentContainer.remove(this.splineMesh);

        const spline = new MeshLine();

        //Create a closed wavey loop
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(1000,0,0),
            new THREE.Vector3(1000,0,1000),
            pos
        ]);

        const points = curve.getPoints( 50 );
        console.log('geometry vertices: ', points);

        const geometry = new THREE.Geometry();
        geometry.vertices = points;

        spline.setGeometry( geometry );

        const material = new MeshLineMaterial({
            useMap: false,
            useAlphaMap: false,
            color: 0xffffff,
            opacity: 1,
            lineWidth: 5,
            sizeAttenuation: 0
        });

        this.splineMesh = new THREE.Mesh( spline.geometry, material );
        this.splineMesh.position.y -= 20;

        this.parentContainer.add( this.splineMesh );
    }*/

    clearMotionLine(){
        this.motionPoints = [];
        this.updateMotionLine();
    }

    updateMotionLine(){

        if (this.motionPoints.length > 1){
            this.parentContainer.remove(this.splineMesh);

            const spline = new MeshLine();
            const splinePointMultiplier = 10;

            //Create a closed wavey loop
            const curve = new THREE.CatmullRomCurve3(this.motionPoints);
            const points = curve.getPoints( this.motionPoints.length * splinePointMultiplier );

            const geometry = new THREE.Geometry();
            geometry.vertices = points;

            spline.setGeometry( geometry );

            const material = new MeshLineMaterial({color: 0x01FFFD, lineWidth: 5});

            this.splineMesh = new THREE.Mesh( spline.geometry, material );
            this.splineMesh.position.y -= 20;

            this.parentContainer.add( this.splineMesh );
        } else {
            this.parentContainer.remove(this.splineMesh);
        }

    }


}
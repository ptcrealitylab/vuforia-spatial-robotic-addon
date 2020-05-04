import * as THREE from 'three';
import FBXLoader from "three-fbx-loader";
import {Path} from "./path";

export class RobotDummy extends THREE.Group {
    constructor() {

        super();

        let geometryMarker = new THREE.BoxGeometry( 170, 70, 290 );
        let materialMarker = new THREE.MeshBasicMaterial( {color: 0x836490, transparent: true, opacity: 0} );

        let robotMarker = new THREE.Mesh( geometryMarker, materialMarker );

        this.add(robotMarker);

    }
}

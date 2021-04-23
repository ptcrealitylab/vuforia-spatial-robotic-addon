import animitter from 'animitter';  // a library for handling animation-loops
import {MainUI} from "./mainUI";
import {KineticARView} from "./kineticARView";
import {CheckpointUI} from "./checkpointUI";
import {distanceBetween} from "./utils";

/*
* MainUI contains all information, assets and logic for the UI on the screen
*/
const mainUI = new MainUI();
mainUI.on('reset', resetTracking);
mainUI.on('clearPath', clearPath);
mainUI.on('closePath', closePathCallback);
mainUI.on('closeAction', closeActionCallback);

function closeActionCallback(){
    console.log("CLOSE ACTION");
    kineticARView.activateCheckpointMode(0);
    mainUI.hideCloseActionButton();
    checkpointUI.resetMode();
    mainUI.hideCheckpointPositionMenu();
}

function resetTracking(){
    if (kineticARView !== undefined) kineticARView.isRobotAnchorSet = false;
}

function closePathCallback(){ kineticARView.currentPath.closePath(); }
function clearPath() {

    closeActionCallback();

    // Clear paths and send request to server to remove nodes and delete all checkpoints from path
    kineticARView.paths.forEach(path => { path.clear(); });

    // Call server to delete nodes
    realityInterface.writePublicData("kineticNode4", "ClearPath", true);

}

document.body.appendChild( mainUI.domElement );

/*
* KineticARView contains all information, assets and logic for the threejs scene
*/
const kineticARView = new KineticARView();
kineticARView.on('robotAnchored', sendRobotPosition);                                                             // Subscribe to send robot position to server
kineticARView.on('surfaceTracked', function surfaceTracked(){ mainUI.surfaceTracked(); });                        // Subscribe to give feedback on surface tracked in mainUI

// Send robot position and direction in AR to server
function sendRobotPosition(){
    let arData = {
        "robotInitPosition" : kineticARView.lastPosition,
        "robotInitDirection" : kineticARView.lastDirection
    };
    realityInterface.writePublicData("kineticNode3", "ARstatus", arData);
    mainUI.robotTracked();
}
document.body.appendChild( kineticARView.renderer.domElement );

/*
* CheckpointUI contains all information, assets and logic for the dynamic UI for each checkpoint
*/
const checkpointUI = new CheckpointUI();
checkpointUI.on('rotate', function(){
    kineticARView.activateCheckpointMode(1);
    mainUI.showCloseActionButton();
}, false);
checkpointUI.on('speed', function(){
    kineticARView.activateCheckpointMode(2);
    mainUI.showCloseActionButton();
}, false);
checkpointUI.on('height', function(){
    kineticARView.activateCheckpointMode(3);
    mainUI.showCloseActionButton();
}, false);

checkpointUI.on('position', function(){
    kineticARView.activateCheckpointMode(4);
    mainUI.showCheckpointPositionMenu();
    kineticARView.showCheckpointArrows();
    mainUI.showCloseActionButton();
}, false);

mainUI.on('positionEdit', function (data) {
    kineticARView.adjustPosition(data);
    kineticARView.currentPath.updatePathData();
    pushPathsDataToServer();
});

document.body.appendChild( checkpointUI.domElement );

/*
* realityInterface is the variable...
*/
const realityInterface = new RealityInterface();

realityInterface.onRealityInterfaceLoaded(function() {
    realityInterface.setFullScreenOn();
    realityInterface.setStickyFullScreenOn();
    realityInterface.subscribeToMatrix();
    realityInterface.addMatrixListener(renderRobotCallback);
    realityInterface.addGroundPlaneMatrixListener(groundPlaneCallback);
    realityInterface.writePublicData("kineticNode4", "ClearPath", true);
    realityInterface.setVisibilityDistance(100);

    // Resize to screen dimensions

    realityInterface.getScreenDimensions(function(width, height) {
        document.body.width = width + 'px';
        document.body.height = height + 'px';
        kineticARView.rendererWidth = width;
        kineticARView.rendererHeight = height;
        kineticARView.renderer.setSize( kineticARView.rendererWidth, kineticARView.rendererHeight );
        realityInterface.changeFrameSize(width, height);
    });


    // Keep pointer move active after some time of pointer down
    realityInterface.setMoveDelay(-1);
    //realityInterface.useSimplifiedPointerEvents();

    realityInterface.addReadPublicDataListener("kineticNode1", "CheckpointStopped", function (data){
        console.log('Checkpoint STOPPED: ', data);
        if (kineticARView !== undefined) kineticARView.checkpointReached(data);
    });

    realityInterface.addReadPublicDataListener("kineticNode1", "CheckpointTriggered", function (data){
        console.log('Checkpoint TRIGGERED: ', data);
        if (kineticARView !== undefined) kineticARView.checkpointTriggered(data);
    });

    // Position robot/occlusion dummy
    realityInterface.addReadPublicDataListener("kineticNode1", "ARposition", function (data){
        //if (kineticARView !== undefined) kineticARView.moveDummyRobot(data);
    });

    realityInterface.addReadPublicDataListener("kineticNode2", "pathData", function (data) {

        if (kineticARView !== undefined) kineticARView.updateDevices(data);
    });
});

function groundPlaneCallback(groundPlaneMatrix, projectionMatrix) {
    if (kineticARView !== undefined) kineticARView.setGroundPlaneMatrix(groundPlaneMatrix, projectionMatrix);
}

function renderRobotCallback(modelviewmatrix, projectionMatrix) {
    if (kineticARView !== undefined){
        kineticARView.renderRobot(modelviewmatrix, projectionMatrix);
    }
}

let test = false;

function pointerDown(eventData) {

    lastMousePosition.x = eventData.x;
    lastMousePosition.y = eventData.y;
    
    test = false;

    console.log('pointer DOWN');

    //console.log('button touch: ', mainUI.buttonTouch);
    if (!mainUI.buttonTouch){

        // If the adjustment position menu is open, close it
        if (checkpointUI.checkpointMode === 4){
            mainUI.hideCheckpointPositionMenu();
            //kineticARView.hideCheckpointArrows();
            kineticARView.currentPath.selectedCheckpoint.deselectCheckpoint();
            kineticARView.currentPath.selectedCheckpoint = null;
        }

        let newRay = kineticARView.getRayFromMouse(eventData);
        let newPositionOnGroundPlane = kineticARView.computeGroundPlaneIntersection(newRay);       // Get Intersection with Ground Plane
        
        //console.log('kineticARView.currentPath: ', kineticARView.currentPath);

        if (kineticARView.currentPath !== null && kineticARView.currentPath.isActive()){

            //console.log('path ongroundplane **********');

            kineticARView.currentPath.onGroundPlaneIntersection(newRay, newPositionOnGroundPlane, checkpointUI.checkpointMode);  // Deal with tap on Ground Plane in current path

        } else {

            //console.log('new path --');

            kineticARView.createNewPath(newPositionOnGroundPlane);                                 // Create new path with first checkpoint

            pushPathsDataToServer();

            kineticARView.currentPath.newCheckpoint(newPositionOnGroundPlane);    // Create first checkpoint
            kineticARView.currentPath.updateHeightLinesAndFloorMarks();
            kineticARView.currentPath.on('checkpoint_menu', checkpointUI.activateCheckpointMenu);  // Subscribe to activate checkpoint menu

            kineticARView.currentPath.on('reset_mode', function () {
                console.log('RESET MODE from path ****************************');
                checkpointUI.resetMode();
                kineticARView.closeEdit();
                mainUI.hideCloseActionButton();
            });
        }
        pushPathsDataToServer();

    }
}

let lastMousePosition = { x: 0, y: 0 };

function pointerMove(eventData){

    // pointerMove gets triggered when the finger is touching the screen even when there is no movement
    // To filter that, we compute the distance from the last finger position and ignore if it is 0
    let newMousePosition = {x : eventData.x, y : eventData.y};
    let distance = distanceBetween(lastMousePosition, newMousePosition);

    if (!mainUI.buttonTouch && distance > 0){

        if (!checkpointUI.isCheckpointMenuVisible()){

            let newRay = kineticARView.getRayFromMouse(eventData);
            let newPosition = kineticARView.computeGroundPlaneIntersection(newRay);

            if (checkpointUI.checkpointMode === 0 && kineticARView.currentPath !== null){

                //console.log('MOVE SELECTED and CLOSE RESET');

                kineticARView.moveSelectedCheckpoint(newPosition);
                kineticARView.currentPath.closeReset();

            } else {

                kineticARView.editCheckpoint(eventData, newPosition, checkpointUI.checkpointMode);

            }
        }
    }

    lastMousePosition.x = eventData.x;
    lastMousePosition.y = eventData.y;

    if (kineticARView.currentPath !== null) kineticARView.currentPath.updatePathData();
    
}

function pointerUp( eventData ) {

    if (!mainUI.buttonTouch){
        checkpointUI.deactivateCheckpointMenu();
        kineticARView.closeEdit();
        kineticARView.currentPath.closeReset();

        pushPathsDataToServer();
    }
}

function pushPathsDataToServer(){
    let pathsData = [];
    kineticARView.paths.forEach(path => { pathsData.push(path.pathData); });

    //console.log('push data to server: ', pathsData);
    realityInterface.writePublicData("kineticNode2", "pathData", pathsData);
}

const loop = animitter(update);                                             // creates a loop 60fps using window.requestAnimationFrame

/**
 * @desc update loop called at 60fps
 * @param int $deltaTime - in milliseconds
 * @param int $elapsedTime - in milliseconds
 * @param int $frameCount
 */
function update(deltaTime, elapsedTime, frameCount) {

    //annie.update(deltaTime);

    kineticARView.paths.forEach(path => {

        //path.checkpointsLookAt(kineticARView.camera.position);                // Make all checkpoints look at camera
        path.update(deltaTime, elapsedTime, frameCount);
    });

    // TODO: this should be a trigger. Not happening at every frame
    // Checkpoint Menu selection
    if (checkpointUI.isCheckpointMenuVisible()){

        checkpointUI.showCheckpointMenu(kineticARView.currentPath, kineticARView.camera, kineticARView.renderer);

    } else {

        checkpointUI.resetCheckpointMenu();

    }
}

document.addEventListener( 'pointerdown', pointerDown, false );
document.addEventListener( 'pointermove', pointerMove, false );
document.addEventListener( 'pointerup', pointerUp, false );

loop.start();

/**
 * @preserve
 *
 *                                     .,,,;;,'''..
 *                                 .'','...     ..',,,.
 *                               .,,,,,,',,',;;:;,.  .,l,
 *                              .,',.     ...     ,;,   :l.
 *                             ':;.    .'.:do;;.    .c   ol;'.
 *      ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *     ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *    .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *     .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *    .:;,,::co0XOko'              ....''..'.'''''''.
 *    .dxk0KKdc:cdOXKl............. .. ..,c....
 *     .',lxOOxl:'':xkl,',......'....    ,'.
 *          .';:oo:...                        .
 *               .cd,    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐   .
 *                 .l;   ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘   '
 *                   'l. ╚═╝└─┘┴└─ └┘ └─┘┴└─  '.
 *                    .o.                   ...
 *                     .''''','.;:''.........
 *                          .'  .l
 *                         .:.   l'
 *                        .:.    .l.
 *                       .x:      :k;,.
 *                       cxlc;    cdc,,;;.
 *                      'l :..   .c  ,
 *                      o.
 *                     .,
 *
 *             ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *             ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *             ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 * Created by Anna Fuste on 03/20/19.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
var server = require('@libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);

const { WebSocketInterface } = require('./websocketInterface');
const { RestAPIInterface } = require('./restapiInterface');
const { RestAPIServer } = require('./restapiserver');
const { CustomMaths } = require('./customMaths');

exports.enabled = settings('enabled');
exports.configurable = true;

let objectName = 'MIR';
let hostIP = '10.10.10.30';
let port = 39320;

let isRobotConnected = false;
let enableMIRConnection = true;     // For debugging purposes, deactivate from browser if you just want to develop on the interface without the robot connection

if (exports.enabled) {               // These settings will be exposed to the webFrontend to potentially be modified

    setup();

    console.log('MIR: Settings loaded: ', objectName, hostIP, port, isRobotConnected, enableMIRConnection);

    server.setHardwareInterfaceSettings('MIR100', exports.settings, null, function(successful, error) {
        if (error) {
            console.log('MIR100: error persisting settings', error);
        }
    });
    
    function setup() {
        
        /**
         * These settings will be exposed to the webFrontend to potentially be modified
         */
        exports.settings = {
            robotIp: {
                value: settings('robotIp', '10.10.10.30'),
                type: 'text',
                disabled: false,
                default: '10.10.10.30',
                helpText: 'The IP address of the MIR100 you want to connect to.'
            },
            robotPort: {
                value: settings('robotPort', 39320),
                type: 'number',
                disabled: false,
                default: 39320,
                helpText: 'The port of the MIR100 Gateway.'
            },
            objectName: {
                value: settings('objectName', 'MIR'),
                type: 'text',
                default: 'mir100',
                disabled: false,
                default: 'MIR',
                helpText: 'The name of the object that connects to this hardware interface.'
            },
            isRobotConnected: {
                value: settings('isRobotConnected', false),
                type: 'boolean',                                                // Variable type
                disabled: true,                                                 // If this variable should be editable or not
                default: false,                                                 // Default value assigned to this variable
                helpText: 'Is the robot currently connected?'                   // Text that will appear on the web frontend
            },
            enableMIRConnection: {
                value: settings('enableMIRConnection', true),                   // Variable type
                type: 'boolean',                                                // Default value assigned to this variable
                default: false,
                disabled: false,                                                // If this variable should be editable or not
                default: true,
                helpText: 'Do you want to enable the connection of the robot?'  // Text that will appear on the web frontend
            }
        };
    }
    
    objectName = exports.settings.objectName.value;
    hostIP = exports.settings.robotIp.value;
    port = parseInt(exports.settings.robotPort.value);
    enableMIRConnection = exports.settings.enableMIRConnection.value;
    isRobotConnected = exports.settings.isRobotConnected.value;

    server.addEventListener('reset', function() {   // reload the settings from settings.json when you get a 'reset' message
        settings = server.loadHardwareInterface(__dirname);
        setup();

        console.log('MIR: Settings loaded: ', objectName, hostIP, port, isRobotConnected, enableMIRConnection);
    });
}

// Robot Websocket & REST variables
let websocket, restapi, serverRest = null;
let maths = null;

// Robot REST API address and endpoints
const restAddress = "http://" + hostIP + "/api/v2.0.0";
const endpoints = {
    missions: "/missions",
    status: "/status",
    maps: "/maps",
    positions: "/positions"
};

let mir_current_state = 3;                  // MIR starts with state 3: READY!
let mir_mission_interrupted = false;
let moveToCoordinateGUID = "";              // Mission GUID needed for REST calls
let inMotion = false;                       // When robot is moving
let mirStatus = {};                         // MIR STATUS
let arStatus = {};                          // AR STATUS

let pathData = [];                          // List of paths with checkpoints
let activeCheckpointName = null;            // Current active checkpoint

const groundPlaneScaleFactor = 1000;        // In mm
let lastPositionAR = {x: 0, y: 0};          // Last position of the robot in AR
let lastDirectionAR = {x: 0, y: 0};         // Last direction of the robot in AR
let currentPositionMIR = {x: 0, y: 0};      // Current position of the robot in her MIR map
let currentOrientationMIR = 0;              // Current orientation of the robot in her MIR map
let initPositionMIR = {x: 0, y: 0};         // Initial position of the robot in her MIR map
let initOrientationMIR = 0;                 // Initial orientation of the robot in her MIR map when the user tracks it with the phone
let initOrientationAR = 0;                  // Initial orientation of the robot in AR when the user tracks it with the phone
let initialSync = false;

function startHardwareInterface() {
    
    console.log('MIR: Start Robotic Addon - Allow robot Connection? ', enableMIRConnection);

    server.enableDeveloperUI(true);
    server.removeAllNodes(objectName, 'kineticAR'); // We remove all existing nodes from the Frame
    
    maths = new CustomMaths();

    console.log('MIR: Setting default tool to motion');
    server.setTool(objectName, 'kineticAR', 'motion', __dirname);

    server.addNode(objectName, "kineticAR", "kineticNode1", "storeData");     // Node for realtime robot position data
    server.addNode(objectName, "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode(objectName, "kineticAR", "kineticNode3", "storeData");     // Node for receiving AR status
    server.addNode(objectName, "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path

    server.addPublicDataListener(objectName, "kineticAR", "kineticNode3","ARstatus",function (data){

        arStatus = data;

        lastPositionAR.x = data.robotInitPosition['x']/groundPlaneScaleFactor;
        lastPositionAR.y = data.robotInitPosition['z']/groundPlaneScaleFactor;

        lastDirectionAR.x = data.robotInitDirection['x'];
        lastDirectionAR.y = data.robotInitDirection['z'];

        initOrientationMIR = currentOrientationMIR;                         // Get orientation at this moment in time
        initOrientationAR =  (-1) * maths.signed_angle([1,0], [lastDirectionAR.x, lastDirectionAR.y]) * 180 / Math.PI;
        initPositionMIR.x = currentPositionMIR.x;
        initPositionMIR.y = currentPositionMIR.y;
        initialSync = true;

        console.log("LAST POSITION AR: ", lastPositionAR);              //       { x: -332.3420, y: 482.1173, z: 1749.54107 }
        console.log("LAST DIRECTION AR: ", lastDirectionAR);            //       { x: -0.84, y: -0.00424 }

    });

    server.addPublicDataListener(objectName, "kineticAR", "kineticNode4","ClearPath",function (data) {

        console.log("MIR:   -   -   -   Frame has requested to clear path: ", data);

        pathData.forEach(path => {
            path.checkpoints.forEach(checkpoint => {
                server.removeNode(objectName, "kineticAR", checkpoint.name);
            });
            path.checkpoints = [];
        });
        pathData = [];

        server.pushUpdatesToDevices(objectName);

        inMotion = false;
        activeCheckpointName = null;

    });

    server.addPublicDataListener(objectName, "kineticAR", "kineticNode2","pathData",function (data){
        
        data.forEach(framePath => {             // We go through array of paths

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index === framePath.index){   // If this path exists on the server, proceed to compare checkpoints
                    pathExists = true;
                    
                    framePath.checkpoints.forEach(frameCheckpoint => {      // Foreach checkpoint received from the frame

                        let exists = false;
                        
                        serverPath.checkpoints.forEach(serverCheckpoint => {        // Check against each checkpoint stored on the server

                            if (serverCheckpoint.name === frameCheckpoint.name){            // Same checkpoint. Check if position has changed and update
                                
                                exists = true;

                                if (serverCheckpoint.posX !== frameCheckpoint.posX) serverCheckpoint.posX = frameCheckpoint.posX;
                                if (serverCheckpoint.posY !== frameCheckpoint.posY) serverCheckpoint.posY = frameCheckpoint.posY;
                                if (serverCheckpoint.posZ !== frameCheckpoint.posZ) serverCheckpoint.posZ = frameCheckpoint.posZ;
                                if (serverCheckpoint.orientation !== frameCheckpoint.orientation) serverCheckpoint.orientation = frameCheckpoint.orientation;

                                server.moveNode(objectName, "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.3,[
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, frameCheckpoint.posY * 2, 1
                                ], true);
                            }
                        });
                        
                        if (!exists){                       // If the checkpoint is not in the server, add it and add the node listener.
                            serverPath.checkpoints.push(frameCheckpoint);

                            server.addNode(objectName, "kineticAR", frameCheckpoint.name, "node");

                            console.log('NEW ' + frameCheckpoint.name + ' | position: ', frameCheckpoint.posX, frameCheckpoint.posZ);

                            server.moveNode(objectName, "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.3,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, frameCheckpoint.posY * 2, 1
                            ], true);
                            
                            //console.log(' ************** Add read listener to ', frameCheckpoint.name);
                            
                            server.addReadListener(objectName, "kineticAR", frameCheckpoint.name, function(data){            // Add listener to node

                                let indexValues = frameCheckpoint.name.split("_")[1];
                                let pathIdx = parseInt(indexValues.split(":")[0]);
                                let checkpointIdx = parseInt(indexValues.split(":")[1]);

                                nodeReadCallback(data, checkpointIdx, pathIdx);
                            });
                        }
                    });
                }
            });
            if (!pathExists) pathData.push(framePath);   // If the path doesn't exist on the server, add it to the server path data
        });

        console.log("MIR: Current PATH DATA in SERVER: ", JSON.stringify(pathData));

        server.pushUpdatesToDevices(objectName);

    });

    if (enableMIRConnection) connectWebsocket();
    updateEvery(0, 100);
}

// Request Information to the MIR100
function restRequest(endpoint){
    return restapi.getData(restAddress + endpoint);
}

function nodeReadCallback(data, checkpointIdx, pathIdx){

    // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint
    // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

    console.log('MIR: NODE ', checkpointIdx, ' path: ', pathIdx, ' received ', data);

    let checkpointTriggered = pathData[pathIdx].checkpoints[checkpointIdx];

    if (data.value === 1){

        if (!checkpointTriggered.active){   // Checkpoint has changed from not active to active. We have to send robot here

            console.log('MIR: Checkpoint has changed from not active to active: ', checkpointTriggered.name);
            
            activeCheckpointName = checkpointTriggered.name;
            checkpointTriggered.active = 1;             // This checkpoint gets activated

            let missionData = computeMIRCoordinatesTo(checkpointTriggered.posX, checkpointTriggered.posZ, checkpointTriggered.orientation);

            let newAddress = restAddress + "/mission_queue";

            if (enableMIRConnection) {
                restapi.postData(newAddress, missionData)
                    .then(res => console.log(res))          // JSON-string from `response.json()` call
                    .catch(error => console.error(error));
            }

            inMotion = true;
        } else {
            console.log('MIR: WARNING: This checkpoint was already active!');
        }

    } else if (data.value === 0){   // If node receives a 0

        if (checkpointTriggered.active){

            console.log('MIR: Checkpoint has changed from active to not active: ', checkpointTriggered.name);

            if (inMotion){      // The node has been deactivated in the middle of the move mission. We need to delete the mission from the mission queue
                
                console.log('MIR: Mission interrupted');

                let newAddress = restAddress + "/mission_queue";

                restapi.deleteData(newAddress)
                    .then(res => console.log(res)) // JSON-string from `response.json()` call
                    .catch(error => console.error(error));

                mir_mission_interrupted = true;
                checkpointTriggered.active = 0; // deactivate the checkpoint

            } else {        // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint
                
                console.log('MIR: Checkpoint reached: ', checkpointTriggered.name);
                checkpointTriggered.active = 0; // This checkpoint gets deactivated

                let nextCheckpointToTrigger = null;

                if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                      // Next checkpoint in same path
                    nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                    console.log('MIR: Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                    
                    server.write(objectName, "kineticAR", nextCheckpointToTrigger.name, 1);

                } else {                                                                            // We reached end of path

                    activeCheckpointName = null;

                }
            }
        }
    }
}

function computeMIRCoordinatesTo(newCheckpointX, newCheckpointY, checkpointOrientation){

    let lastDirectionTo = [lastDirectionAR.x, lastDirectionAR.y];

    let from = [lastPositionAR.x, lastPositionAR.y];
    let to = [newCheckpointX / groundPlaneScaleFactor, newCheckpointY / groundPlaneScaleFactor];

    const newDistance = maths.distance(from, to);                                   // Distance that the robot has to travel to get to the next point

    let newDirectionVector = [to[0] - from[0], to[1] - from[1]];                    // newDirection = to - from

    let angleBetween = maths.signed_angle(newDirectionVector, lastDirectionTo);     // Angle between direction vectors

    const newDirectionDeg = maths.radians_to_degrees(angleBetween);                 // Angle that the robot has to turn to go to next coordinate in deg

    currentOrientationMIR = currentOrientationMIR + newDirectionDeg;                // Angle in the MIR Coordinate system

    currentPositionMIR.x += newDistance * Math.cos(maths.degrees_to_radians(currentOrientationMIR));
    currentPositionMIR.y += newDistance * Math.sin(maths.degrees_to_radians(currentOrientationMIR));

    let angleDifferenceAR = initOrientationAR + checkpointOrientation;
    let newOrientation = initOrientationMIR - angleDifferenceAR;

    // Normalize to range range (-180, 180]
    if (newOrientation > 180)        { newOrientation -= 360; }
    else if (newOrientation <= -180) { newOrientation += 360; }

    let dataObj = {
        "mission_id": moveToCoordinateGUID,
        "parameters":[{"input_name":"positionX","value": currentPositionMIR.x},
            {"input_name":"positionY","value": currentPositionMIR.y},
            {"input_name":"orientation","value": newOrientation}]
    };

    currentOrientationMIR = newOrientation;
    lastDirectionAR.x = Math.cos(maths.degrees_to_radians(checkpointOrientation));
    lastDirectionAR.y = Math.sin(maths.degrees_to_radians(checkpointOrientation));
    lastPositionAR.x = to[0];
    lastPositionAR.y = to[1];

    return dataObj;
}

function processStatus(data) {

    if (data !== undefined){
        mirStatus = data['position'];

        if (mirStatus !== undefined){
            currentPositionMIR.x = mirStatus['x'];
            currentPositionMIR.y = mirStatus['y'];
            currentOrientationMIR = mirStatus['orientation'];

            // Send info to rest server for others to access it.
            serverRest.RobotStatus = mirStatus;

            /*console.log("********************************");
            console.log("   -   -   -   ROBOT NAME: " + data['robot_name']);
            console.log("   -   -   -   ROBOT POS: ", dataStatus);
            console.log("   -   -   -   mission_queue_id: " + data['mission_queue_id']);
            console.log("   -   -   -   mission_queue_url: " + data['mission_queue_url']);
            console.log("   -   -   -   mission_text: " + data['mission_text']);
            console.log("   -   -   -   mode_id: " + data['mode_id']);
            console.log("   -   -   -   state_id: " + data['state_id']);
            console.log("   -   -   -   state_text: " + data['state_text']);*/

            const state_id = parseInt(data['state_id']);

            switch(state_id){
            case 3:
                if (mir_current_state !== 3){

                    if (mir_mission_interrupted){

                        console.log('MIR: All missions stopped due to interruption');

                        mir_mission_interrupted = false;

                        mir_current_state = 3;

                        inMotion = false;

                    } else {

                        console.log("MIR: Robot changed state to ready.");
                        inMotion = false;

                        if (activeCheckpointName !== null){     // MIR has finished mission. Send a 0 to current checkpoint
                            server.write(objectName, "kineticAR", activeCheckpointName, 0);
                        } else {
                            console.log("MIR: No checkpoint active. Active checkpoint is NULL");
                        }

                        mir_current_state = 3;
                    }
                }
                break;
            case 5:
                if (mir_current_state !== 5){
                    console.log("MIR: CHANGED STATE TO EXECUTING!");

                    mir_current_state = 5;

                    inMotion = true;        // When robot starts moving
                }
                break;

            case 10:    // emergency stop
                console.log("MIR: EMERGENCY STOP");
                break;

            case 11:    // manual control
                console.log("MIR: MANUAL CONTROL");
                break;
            default:
                break;
            }
        }
    }
}

/**
 * @desc Once REST responds with data from missions, process the data and keep the GUID
 */
function processMissions(data){
    for(var i = 0; i < data.length; i++) {
        var obj = data[i];
        if (obj.name === 'Move To Coordinate') moveToCoordinateGUID = obj.guid;
    }
}

/**
 * @desc This method will send the position of the robot in AR in realtime to the tool
 */
function sendRealtimeRobotPosition(){

    let _currentOrientation_MIR = websocket.currentYaw();                       // Orientation of the robot at this frame in degrees (from WebSocket)
    let _currentPosition_MIR = websocket.currentRobotPosition;                  // Position of the robot at this frame

    let newARPosition = positionFromMIRToAR(_currentPosition_MIR, _currentOrientation_MIR);
    
    server.writePublicData(objectName, "kineticAR", "kineticNode1", "ARposition", newARPosition);    // Send newARPosition to frame
}

/**
 * @desc Compute the position from the MIR robot map into the AR coordinate system
 */
function positionFromMIRToAR(newPosition, newDirectionAngle)
{
    let newARPosition = {x:0, y:0, z:0};

    if (newDirectionAngle < 0) newDirectionAngle += 360;                                                    // newDirectionAngle between 0 - 360

    let initialAngleMIR = initOrientationMIR;
    if (initialAngleMIR < 0) initialAngleMIR += 360;                                                        // initialAngleMIR between 0 - 360
    let initialRobotDirectionVectorMIR = [Math.cos(maths.degrees_to_radians(initialAngleMIR)),              // MIR space
        Math.sin(maths.degrees_to_radians(initialAngleMIR))];

    let from = [initPositionMIR.x, initPositionMIR.y];
    let to = [newPosition.x, newPosition.y];

    let newDistance = maths.distance(from, to);                                                             // Distance between points

    let newDir = [to[0] - from[0], to[1] - from[1]];                                                        // newDirection = to - from
    let newDirectionRad = maths.signed_angle(initialRobotDirectionVectorMIR, newDir);                       // Angle between initial direction and new direction

    let angleDifference = newDirectionAngle - initialAngleMIR;                                              // Angle difference between current and initial MIR orientation
    
    let _initialOrientation_AR = maths.signed_angle([arStatus.robotInitDirection['x'], arStatus.robotInitDirection['z']], [1,0]);   // Initial AR direction

    if (_initialOrientation_AR < 0) _initialOrientation_AR += 2*Math.PI;                                    // _initialOrientation_AR between 0 - 360

    let newARAngle = maths.radians_to_degrees(_initialOrientation_AR) + angleDifference;

    let newAngleDeg = maths.radians_to_degrees(_initialOrientation_AR) + maths.radians_to_degrees(newDirectionRad);

    newARPosition.x = (arStatus.robotInitPosition['x']/groundPlaneScaleFactor) + (newDistance * Math.cos(maths.degrees_to_radians(newAngleDeg)));
    newARPosition.y = - ((- arStatus.robotInitPosition['z']/groundPlaneScaleFactor) + (newDistance * Math.sin(maths.degrees_to_radians(newAngleDeg))));
    newARPosition.z = maths.degrees_to_radians(newARAngle);

    return newARPosition;
}

/**
 * @desc Connect to websocket. If it fails, try to connect again. If success, continue with rest api requests
 */
function connectWebsocket(){

    websocket = new WebSocketInterface(hostIP, port);

    websocket.eventEmitter.on('ok', function(){
        startRESTRequests();                            // Start REST requests
        exports.settings.isRobotConnected.value = true;
        server.pushSettingsToGui('MIR100', exports.settings);
    }, false);
    websocket.eventEmitter.on('ko', function(){
        connectWebsocket();                             // Try again until success
        exports.settings.isRobotConnected.value = false;
        server.pushSettingsToGui('MIR100', exports.settings);
    }, false);
}

/**
 * @desc Initial REST requests calls for missions and status
 */
function startRESTRequests(){

    restapi = new RestAPIInterface(hostIP);
    serverRest = new RestAPIServer(3030);       // Create server for others to access robot data

    restRequest(endpoints.missions).then(function (data) {

        processMissions(data);
        requestStatus();

    }).catch(error => console.warn('\x1b[36m%s\x1b[0m', "MIR: Could not process Missions. REST request failed. ☹ "));
}

/**
 * @desc Recursively ask for status
 */
function requestStatus(){
    restRequest(endpoints.status).then(function (data){
        processStatus(data);
        requestStatus();    // call restRequest again
    }).catch(error => console.error(error));
}

/**
 * @desc UPDATE method
 */
function updateEvery(i, time) {
    setTimeout(() => {
        if (enableMIRConnection && initialSync) sendRealtimeRobotPosition();
        updateEvery(++i, time);
    }, time)
}

server.addEventListener("initialize", function () {
    if (exports.enabled) startHardwareInterface();
});
server.addEventListener("shutdown", function () {
});



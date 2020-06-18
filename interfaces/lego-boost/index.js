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

exports.enabled = settings('enabled');
exports.configurable = true;

const Hub = require('wedoboostpoweredup');
const { CustomMaths } = require('./customMaths');

let objectName = 'lego-boost';
// (0 - 100) motor power
let boostSpeed = 10;
let wheelType = 0;
let wheelDiameter = 0;
let wheelSeparation = 0;
let wheelA_driftOffset = 0;
let wheelB_driftOffset = 0;
let isRobotConnected = false;
// For debugging purposes, deactivate from browser if you just want to develop on the interface without the robot connection
let enableRobotConnection = true;

// These settings will be exposed to the webFrontend to potentially be modified
if (exports.enabled) {
    
    setup();
    
    console.log('LEGO-BOOST: Settings loaded: ', objectName, isRobotConnected, enableRobotConnection);
    
    server.setHardwareInterfaceSettings('lego-boost', exports.settings, null, function(successful, error) {
        if (error) {
            console.log('LEGO-BOOST: error persisting settings', error);
        }
    });
    
    function setup() {
        
        /**
         * These settings will be exposed to the webFrontend to potentially be modified
         */
        exports.settings = {
            objectName: {
                value: settings('objectName', 'lego-boost'),
                type: 'text',
                disabled: false,
                default: 'lego-boost',
                helpText: 'The name of the object that connects to this hardware interface.'
            },
            boostSpeed: {
                value: settings('boostSpeed', 10),
                type: 'number',
                disabled: false,
                default: 10,
                helpText: 'Lego Boost Speed ranging from 0-100 motor power'
            },
            wheelType: {
                value: settings('wheelType', 0),
                type: 'number',
                disabled: false,
                default: 0,
                helpText: 'The type of wheel. For regular wheel (0). For tank wheel (1).'
            },
            wheelDiameter: {
                value: settings('wheelDiameter', 0.03175),
                type: 'number',
                disabled: false,
                default: 0.03175,
                helpText: 'Wheel diamater for this particular robot.'
            },
            wheelSeparation: {
                value: settings('wheelSeparation', 0.066675),
                type: 'number',
                disabled: false,
                default: 0.066675,
                helpText: 'Distance from wheel to wheel.'
            },
            wheelA_driftOffset: {
                value: settings('wheelA_driftOffset', 7),
                type: 'number',
                disabled: false,
                default: 7,
                helpText: 'Drift offset considering inertia, floor friction and motor power variations for wheel A.'
            },
            wheelB_driftOffset: {
                value: settings('wheelB_driftOffset', 5),
                type: 'number',
                disabled: false,
                default: 5,
                helpText: 'Drift offset considering inertia, floor friction and motor power variations for wheel B.'
            },
            isRobotConnected: {
                value: settings('isRobotConnected', false),
                type: 'boolean',                                                // Variable type
                disabled: true,                                                 // If this variable should be editable or not
                default: false,                                                 // Default value assigned to this variable
                helpText: 'Is the robot currently connected?'                   // Text that will appear on the web frontend
            },
            enableRobotConnection: {
                value: settings('enableRobotConnection', true),                         // Variable type
                type: 'boolean',                                                // Default value assigned to this variable
                disabled: false,                                                // If this variable should be editable or not
                default: true,
                helpText: 'Do you want to enable the connection of the robot?'  // Text that will appear on the web frontend
            }
        };
    }
    
    objectName = exports.settings.objectName.value;
    enableRobotConnection = exports.settings.enableRobotConnection.value;
    isRobotConnected = exports.settings.isRobotConnected.value;
    wheelDiameter = exports.settings.wheelDiameter.value;
    wheelSeparation = exports.settings.wheelSeparation.value;
    wheelA_driftOffset = exports.settings.wheelA_driftOffset.value;
    wheelB_driftOffset = exports.settings.wheelB_driftOffset.value;
    boostSpeed = exports.settings.boostSpeed.value;
    wheelType = exports.settings.wheelType.value;

    server.addEventListener('reset', function() {   // reload the settings from settings.json when you get a 'reset' message
        settings = server.loadHardwareInterface(__dirname);
        setup();

        console.log('LEGO-BOOST: Settings loaded: ', objectName, wheelType, wheelDiameter, wheelSeparation, wheelA_driftOffset, wheelB_driftOffset, isRobotConnected, enableRobotConnection);
    });
}

let maths = null;
let hub = null;
let boostUuid = null;
let motorRotationForwardRatio = 0;
let motorRotationTurnRatio = 0;

let boostStatus = 0;                        // 0 - stopped | 1 - forward | 2 - rotating
let inMotion = false;                       // When robot is moving

let nextDistance = 0;
let nextRotation = 0;
let motorCounter = 0;

let arStatus = {};                          // AR STATUS

let pathData = [];                          // List of paths with checkpoints
let activeCheckpointName = null;            // Current active checkpoint
const groundPlaneScaleFactor = 1000;        // In mm
let lastPositionAR = {x: 0, y: 0};          // Last position of the robot in AR
let lastDirectionAR = {x: 0, y: 0};         // Last direction of the robot in AR
let currentPositionBoost = {x: 0, y: 0};    // Current position of the robot
let currentOrientationBoost = 0;            // Current orientation of the robot
let initPositionBoost = {x: 0, y: 0};       // Initial position of the robot
let initOrientationBoost = 0;               // Initial orientation of the robot when the user tracks it with the phone
let initOrientationAR = 0;                  // Initial orientation of the robot in AR when the user tracks it with the phone
let initialSync = false;

function startHardwareInterface() {
    
    console.log('LEGO-BOOST: Start Robotic Addon - Allow robot Connection? ', enableRobotConnection);

    server.enableDeveloperUI(true);
    server.removeAllNodes(objectName, 'kineticAR'); // We remove all existing nodes from the Frame
    
    maths = new CustomMaths();

    console.log('LEGO-BOOST: Setting default tool to motion');
    server.setTool(objectName, 'kineticAR', 'motion', __dirname);   // Set motion tool as the default tool for lego-boost

    server.addNode(objectName, "kineticAR", "kineticNode1", "storeData");     // Node for realtime checkpoint updates
    server.addNode(objectName, "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode(objectName, "kineticAR", "kineticNode3", "storeData");     // Node for receiving AR status
    server.addNode(objectName, "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path
    
    server.addPublicDataListener(objectName, "kineticAR", "kineticNode3","ARstatus",function (data){

        // When robot is first tracked, server receives AR location data

        arStatus = data;

        lastPositionAR.x = data.robotInitPosition['x']/groundPlaneScaleFactor;
        lastPositionAR.y = data.robotInitPosition['z']/groundPlaneScaleFactor;

        lastDirectionAR.x = data.robotInitDirection['x'];
        lastDirectionAR.y = data.robotInitDirection['z'];

        initOrientationBoost = currentOrientationBoost;                         // Get orientation at this moment in time
        initOrientationAR =  (-1) * maths.signed_angle([1,0], [lastDirectionAR.x, lastDirectionAR.y]) * 180 / Math.PI;
        initPositionBoost.x = currentPositionBoost.x;
        initPositionBoost.y = currentPositionBoost.y;
        initialSync = true;

        console.log("LEGO-BOOST: Last Position AR: ", lastPositionAR);              //  3D position data. Ex: { x: -332.3420, y: 482.1173, z: 1749.54107 }
        console.log("LEGO-BOOST: Last Direction AR: ", lastDirectionAR);            //  2D vector. Ex: { x: -0.84, y: -0.00424 }

    });

    server.addPublicDataListener(objectName, "kineticAR", "kineticNode4","ClearPath",function (data) {

        console.log("LEGO-BOOST:   -   -   -   Frame has requested to clear path: ", data);

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

                            console.log('LEGO-BOOST: NEW ' + frameCheckpoint.name + ' | position: ', frameCheckpoint.posX, frameCheckpoint.posZ);

                            server.moveNode(objectName, "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.3,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, frameCheckpoint.posY * 2, 1
                            ], true);
                            
                            //console.log('LEGO-BOOST: ************** Add read listener to ', frameCheckpoint.name);
                            
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

        //console.log("LEGO-BOOST: Current PATH DATA in SERVER: ", JSON.stringify(pathData));

        server.pushUpdatesToDevices(objectName);

    });

    if (enableRobotConnection){
        
        console.log('LEGO-BOOST: Connecting to hardware');

        hub = new Hub();

        hub.on('connected', function (uuid) {
            console.log('LEGO-BOOST: I found a device with uuid: ' + uuid);

            boostUuid = uuid;

            exports.settings.isRobotConnected.value = true;
            server.pushSettingsToGui('lego-boost', exports.settings);

            /** Uncomment this to experiment with ratios and motor rotations for your wheels **/
            //setTimeout(setspeed, 1000);
            function setspeed(){

                // 16 - back wheels
                // 2 - rear helix
                // 0 - back wheel A
                // 1 - back wheel B
                // 3 - Head

                hub.setMotorDegrees(1500, boostSpeed, 16, boostUuid);
            }
            
            if (wheelType === 0){
                
                let p_wheel = 2*Math.PI*(wheelDiameter/2);
                motorRotationForwardRatio = 360/p_wheel;        // motorRotation = 360 degrees / perimeter of wheel

                let p_turn = 2*Math.PI*(wheelSeparation/2);
                motorRotationTurnRatio = p_turn / p_wheel;      // How many rotations for one turn

                /* Perimeter wheel Formula: 2*Math.PI*(wheelDiameter/2) meters => 1 motor rotation
                *   For lego boost: 0.099746 m => 1 motor rotation
                *   For lego boost: 0.066675 m of wheelSeparation. 0.20947 perimeter turn
                */
            
            } else if (wheelType === 1){
                
                /* big wheels */
                let wheelLength = 0.2286; // 9 inches = 0.2286 m

                motorRotationTurnRatio = 873/360;
                motorRotationForwardRatio = 670/wheelLength;
                
            }
            
        });

        hub.on('disconnected', function (uuid) {
            console.log('LEGO-BOOST: I removed a device with uuid: '+uuid);

            exports.settings.isRobotConnected.value = false;
            server.pushSettingsToGui('lego-boost', exports.settings);
        });

        hub.on('motor', function (motorRotation, port, uuid) {

            console.log('LEGO-BOOST: PORT: ' + port + ' --- motorRotation.absoluteDeg: ' + motorRotation.absoluteDeg);
            
            motorCounter = 0;   // This is used to know when robot stops moving
            
        });
    }
    updateEvery(0, 100);
}

function nodeReadCallback(data, checkpointIdx, pathIdx){

    // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint
    // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

    console.log('LEGO-BOOST: NODE ', checkpointIdx, ' path: ', pathIdx, ' received ', data);

    let checkpointTriggered = pathData[pathIdx].checkpoints[checkpointIdx];

    if (data.value === 1){

        if (!checkpointTriggered.active){

            console.log('LEGO-BOOST: Checkpoint has changed from not active to active: ', checkpointTriggered.name);
            
            activeCheckpointName = checkpointTriggered.name;
            checkpointTriggered.active = 1;

            server.writePublicData(objectName, "kineticAR", "kineticNode1", "CheckpointTriggered", checkpointIdx);         // Alert frame of new checkpoint goal

            // TODO: COMPUTE MOVEMENT FOR BOOST

            let boostMovement = computeBoostMovementTo(checkpointTriggered.posX, checkpointTriggered.posZ);
            
        } else {
            console.log('LEGO-BOOST: WARNING: This checkpoint was already active!');
        }

    } else if (data.value === 0){

        if (checkpointTriggered.active){

            console.log('LEGO-BOOST: Checkpoint has changed from active to not active: ', checkpointTriggered.name);

            if (inMotion){          // The node has been deactivated in the middle of the move mission.
                
                console.log('LEGO-BOOST: Mission interrupted');

                // TODO: STOP BOOST

            } else {                // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint
                
                console.log('LEGO-BOOST: Checkpoint reached: ', checkpointTriggered.name);
                checkpointTriggered.active = 0;

                server.writePublicData(objectName, "kineticAR", "kineticNode1", "CheckpointStopped", checkpointIdx);       // Tell frame checkpoint has been reached

                let nextCheckpointToTrigger = null;

                if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                      // Next checkpoint in same path
                    nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                    console.log('LEGO-BOOST: Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                    
                    server.write(objectName, "kineticAR", nextCheckpointToTrigger.name, 1);

                } else {                                                                            // We reached end of path

                    activeCheckpointName = null;
                    
                    // Do something here after end of path reached...

                }
            }
        }
    }
}

function computeBoostMovementTo(newCheckpointX, newCheckpointY){

    let lastDirectionTo = [lastDirectionAR.x, lastDirectionAR.y];

    let from = [lastPositionAR.x, lastPositionAR.y];
    let to = [newCheckpointX / groundPlaneScaleFactor, newCheckpointY / groundPlaneScaleFactor];

    nextDistance = maths.distance(from, to);                                   // Distance that the robot has to travel to get to the next point

    let newDirectionVector = [to[0] - from[0], to[1] - from[1]];                    // newDirection = to - from

    let angleBetween = maths.signed_angle(newDirectionVector, lastDirectionTo);     // Angle between direction vectors
    
    nextRotation = maths.radians_to_degrees(angleBetween);                 // Angle that the robot has to turn to go to next coordinate in deg

    lastDirectionAR.x = newDirectionVector[0];
    lastDirectionAR.y = newDirectionVector[1];

    lastPositionAR.x = to[0];
    lastPositionAR.y = to[1];
    
    inMotion = false;
    motorCounter = 0;
    boostStatus = 2;    // First, rotate towards next checkpoint
    
}

let nextMotorRotation = 0;

/**
 * @desc UPDATE method
 */
function updateEvery(i, time) {
    setTimeout(() => {
        
        // TODO: Send realtime position ??

        if (enableRobotConnection){
            switch (boostStatus) {
                case 0:
                    // Robot stopped. Do nothing
                    break;
                case 1:
                    // Activate two motor wheels

                    nextMotorRotation = nextDistance * motorRotationForwardRatio;
                    
                    console.log('LEGO-BOOST: MOVE FORWARD ', nextDistance, ' meters | nextAbsoluteMotorRotation: ', nextMotorRotation);
                    
                    hub.setMotorDegrees(nextMotorRotation, boostSpeed, 16, boostUuid);

                    inMotion = true;
                    boostStatus = 3;
                    
                    break;
                case 2:
                    
                    if (nextRotation > 0)
                    {
                        
                        nextMotorRotation = nextRotation * (motorRotationTurnRatio + wheelA_driftOffset);

                        console.log('LEGO-BOOST: ROTATE LEFT! ' + nextRotation + ' degrees | next Motor Rotation: ' + nextMotorRotation + ' degrees.');
                        
                        hub.setMotorDegrees(nextMotorRotation, (-1) * boostSpeed, 0, boostUuid);
                        hub.setMotorDegrees(nextMotorRotation, boostSpeed, 1, boostUuid);
                        
                    } else {
                        
                        nextMotorRotation = nextRotation * (motorRotationTurnRatio + wheelB_driftOffset);

                        console.log('LEGO-BOOST: ROTATE RIGHT! ' + nextRotation + ' degrees | next Motor Rotation: ' + nextMotorRotation + ' degrees.');
                        
                        hub.setMotorDegrees(nextMotorRotation, (-1) * boostSpeed, 1, boostUuid);
                        hub.setMotorDegrees(nextMotorRotation, boostSpeed, 0, boostUuid);

                    }

                    inMotion = true;
                    boostStatus = 4;
                    
                    break;
                    
                case 3:
                    
                    // Moving forward
                    motorCounter += 1;

                    if (motorCounter > 10){  // Motor has stopped. Boost stopped moving forward. We reached checkpoint
                        
                        console.log('LEGO-BOOST: MOTOR HAS STOPPED');
                        
                        boostStatus = 0;
                        inMotion = false;
                        motorCounter = 0;
                        
                        if (activeCheckpointName !== null) {     // robot has finished mission. Send a 0 to current checkpoint
                            server.write(objectName, "kineticAR", activeCheckpointName, 0);
                        }
                    }
                    
                    break;
                case 4:
                    
                    // Turning
                    motorCounter += 1;
                    console.log('LEGO-BOOST: Rotating...', motorCounter);
                    
                    if (motorCounter > 10){  // Motor has stopped. Boost stopped turning, now MOVE FORWARD
                        
                        console.log('LEGO-BOOST: MOTOR HAS STOPPED');
                        
                        motorCounter = 0;
                        inMotion = false;
                        boostStatus = 1;
                    }
                    
                    break;
                default:
                    break;
            }
        }
        
        updateEvery(++i, time);
    }, time)
}

server.addEventListener("initialize", function () {
    if (exports.enabled) startHardwareInterface();
});
server.addEventListener("shutdown", function () {
});



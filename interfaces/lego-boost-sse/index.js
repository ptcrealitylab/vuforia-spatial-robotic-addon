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
var server = require('../../../../libraries/hardwareInterfaces');
var nodeUtilities = require('../../../../libraries/nodeUtilities.js');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = settings('enabled');
exports.configurable = true;

const Hub = require('wedoboostpoweredup');
const { CustomMaths } = require('./customMaths');

let worldObjectId = '';

const parameters = {
    objectName : 'legoBoost',
    boostSpeed: 10,                 // (0 - 100) motor power
    wheelType : 0,
    wheelDiameter: 0,
    wheelSeparation: 0,
    wheelA_driftOffset: 0,
    wheelB_driftOffset: 0,
    isRobotConnected: false,
    enableRobotConnection: true
};

let maths = null;
let hub = null;
let boostUuid = null;
let motorRotationForwardRatio = 0;
let motorRotationTurnRatio = 0;
let motorCounter = 0;
let boostStatus = 0;                        // 0 - stopped | 1 - forward | 2 - rotating

let pathData = [];                          // List of paths with checkpoints
let inMotion = false;                       // When robot is moving
let nextDistance = 0;
let nextRotation = 0;
let nextMotorRotation = 0;

let pathPointTriggered = null;
let currentIndexInPath = null;
const scaleFactor = 1000;        // In mm
let lastPositionAR = {x: 0, y: 0};          // Last position of the robot in AR
let lastDirectionAR = {x: 0, y: 0};         // Last direction of the robot in AR

// These settings will be exposed to the webFrontend to potentially be modified
if (exports.enabled) {

    setup();

    console.log('LEGO-BOOST: Settings loaded: ', parameters.objectName, parameters.isRobotConnected, parameters.enableRobotConnection);

    server.setHardwareInterfaceSettings('lego-boost-sse', exports.settings, null, function(successful, error) {
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
                value: settings('objectName', 'legoBoost'),
                type: 'text',
                disabled: false,
                default: 'legoBoost',
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
    parameters.enableRobotConnection = exports.settings.enableRobotConnection.value;
    parameters.isRobotConnected = exports.settings.isRobotConnected.value;
    parameters.wheelDiameter = exports.settings.wheelDiameter.value;
    parameters.wheelSeparation = exports.settings.wheelSeparation.value;
    parameters.wheelA_driftOffset = exports.settings.wheelA_driftOffset.value;
    parameters.wheelB_driftOffset = exports.settings.wheelB_driftOffset.value;
    parameters.boostSpeed = exports.settings.boostSpeed.value;
    parameters.wheelType = exports.settings.wheelType.value;

    server.addEventListener('reset', function() {   // reload the settings from settings.json when you get a 'reset' message
        settings = server.loadHardwareInterface(__dirname);
        setup();

        console.log('LEGO-BOOST: Settings loaded: ', parameters.objectName, parameters.wheelType, parameters.wheelDiameter, parameters.wheelSeparation, parameters.wheelA_driftOffset, parameters.wheelB_driftOffset, parameters.isRobotConnected, parameters.enableRobotConnection);
    });
}


function startHardwareInterface() {

    console.log('LEGO-BOOST: Start Robotic Addon - Allow robot Connection? ', parameters.enableRobotConnection);
    server.enableDeveloperUI(true);

    console.log('LEGO-BOOST: Setting default tool to mission');
    server.setTool(parameters.objectName, 'kineticAR', 'mission', __dirname);   // Set mission tool as the default tool for lego-boost

    maths = new CustomMaths();
    
    server.addReadListener(parameters.objectName, 'kineticAR', 'mission', function(data) {            // Add listener to node
        //console.log('Data from Mission Node', data);

        //console.log(data);
        if (data.mode === 'c' && data.unit === 'path') {
            parseData(data);
        }
        
    });
    
    console.log('Adding storage listener: ', parameters.objectName);
    server.addPublicDataListener(parameters.objectName, 'kineticAR', 'storage', 'calibration', function (data) {
        
        console.log('received data from mission tool: ', data);

        lastPositionAR.x = data.position.x/scaleFactor;
        lastPositionAR.y = data.position.y/scaleFactor;

        lastDirectionAR.x = data.direction.x;
        lastDirectionAR.y = data.direction.y;
        
    });

    if (parameters.enableRobotConnection){

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

                hub.setMotorDegrees(1500, parameters.boostSpeed, 16, boostUuid);
            }

            if (parameters.wheelType === 0){

                let p_wheel = 2*Math.PI*(parameters.wheelDiameter/2);
                motorRotationForwardRatio = 360/p_wheel;        // motorRotation = 360 degrees / perimeter of wheel

                let p_turn = 2*Math.PI*(parameters.wheelSeparation/2);
                motorRotationTurnRatio = p_turn / p_wheel;      // How many rotations for one turn

                /* Perimeter wheel Formula: 2*Math.PI*(wheelDiameter/2) meters => 1 motor rotation
                *   For lego boost: 0.099746 m => 1 motor rotation
                *   For lego boost: 0.066675 m of wheelSeparation. 0.20947 perimeter turn
                */

            } else if (parameters.wheelType === 1){

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

            console.log('LEGO-BOOST: PORT: ' + port + ' ---  motorRotation.absoluteDeg: ' + motorRotation.absoluteDeg);

            motorCounter = 0;   // This is used to know when robot stops moving

        });

        updateEvery(0, 100);
    }
}

function parseData(data) {
    worldObjectId = data.value.worldObject;
    let pathEnvelopeId = data.value.address.tool;
    let pathMode = data.value.mode; // "PATH" (in future could be "OPTIONS", "NAVIGATION", etc)
    let path = data.value.path;

    pathData = [];
    
    path.forEach(function (pathPoint) {
        let pathPointId = pathPoint.address.tool;
        let pathPointObjectId = pathPoint.address.object;
        
        pathPoint.points.forEach(function (point) {
            pathData.push({
                id: pathPointId,
                objectId: pathPointObjectId,
                speed: point.speed,
                x: point.matrix[12] / point.matrix[15],
                y: (-1)*point.matrix[13] / point.matrix[15],
                z: point.matrix[14] / point.matrix[15]
            });
        });
    });
    
    /* Coordinate sync:
    groundplane x = pathPoint.x
    groundplane z = - pathPoint.y */
    
    console.log('pathData: ', pathData);

    path.forEach(function (pathPoint) {
        nodeUtilities.searchNodeByType('node', pathPoint.address.object, pathPoint.address.tool, pathPoint.address.node, addNodeListener);
    });
}

function addNodeListener(pathPointObjectKey, pathPointToolKey, pathPointNodeKey) {

    console.log('search node: ', pathPointObjectKey, pathPointToolKey, pathPointNodeKey);
    
    // Find the names instead of IDs
    
    let pathPointObjectName = server.getObjectNameFromObjectId(pathPointObjectKey);
    let pathPointToolName = server.getToolNameFromToolId(pathPointObjectKey, pathPointToolKey);
    let pathPointNodeName = server.getNodeNameFromNodeId(pathPointObjectKey, pathPointToolKey, pathPointNodeKey);
    
    console.log('addReadListener: ', pathPointObjectName, pathPointToolName, pathPointNodeName);
    
    server.addReadListener(pathPointObjectName, pathPointToolName, pathPointNodeName, function (data) {
        
        console.log('path point callback: ', data);

        let index = pathData.indexOf(pathData.find(pd => pd.id === pathPointToolKey));
        
        console.log('PathPoint triggered in path: ', index);
        
        if (data.value === 1){

            pathPointTriggered = pathPointToolName;
            currentIndexInPath = index;
            
            // The node for this Path Point has been activated
            // Send robot to this Path Point
            // Compute next boost movement
            
            let boostMovement = computeBoostMovementTo(pathData[index].x, pathData[index].y);
            
        } else if (data.value === 0) {
            
            // The node for this Path Point has been deactivated
            if (pathPointTriggered === pathPointToolName) {
                
                // We reached this path point, we need to go to the next path point in path

                if (index + 1 < pathData.length){                      // Next checkpoint in same path

                    // We need to find the id for the node on the next path point to trigger it
                    nodeUtilities.searchNodeByType('node', pathData[index + 1].objectId, pathData[index + 1].id, null, function (objectKey, toolKey, newNodeKey){
                        
                        console.log('Found node in next pathpoint: ', objectKey, toolKey, newNodeKey);

                        let objectName = server.getObjectNameFromObjectId(objectKey);
                        let toolName = server.getToolNameFromToolId(objectKey, toolKey);
                        let newNodeName = server.getNodeNameFromNodeId(objectKey, toolKey, newNodeKey);
                        
                        server.write(objectName, toolName, newNodeName, 1);
                    });

                } else {    // We reached end of path
                    
                    console.log('REACHED END OF PATH');

                    pathPointTriggered = null;
                    currentIndexInPath = null;

                    // Do something here after end of path reached...

                }
            }
        }
    });
}


function updateEvery(i, time) {
    setTimeout(() => {

        // TODO: Send realtime position ??

        if (parameters.enableRobotConnection){
            switch (boostStatus) {
            case 0:
                // Robot stopped. Do nothing
                break;
            case 1:
                // Activate two motor wheels

                nextMotorRotation = nextDistance * motorRotationForwardRatio;

                console.log('LEGO-BOOST: MOVE FORWARD ', nextDistance, ' meters | nextAbsoluteMotorRotation: ', nextMotorRotation);

                hub.setMotorDegrees(nextMotorRotation, parameters.boostSpeed, 16, boostUuid);

                inMotion = true;
                boostStatus = 3;

                break;
            case 2:

                if (nextRotation > 0)
                {

                    nextMotorRotation = nextRotation * (motorRotationTurnRatio + parameters.wheelA_driftOffset);

                    console.log('LEGO-BOOST: ROTATE LEFT! ' + nextRotation + ' degrees | next Motor Rotation: ' + nextMotorRotation + ' degrees.');

                    hub.setMotorDegrees(nextMotorRotation, (-1) * parameters.boostSpeed, 0, boostUuid);
                    hub.setMotorDegrees(nextMotorRotation, parameters.boostSpeed, 1, boostUuid);

                } else {

                    nextMotorRotation = nextRotation * (motorRotationTurnRatio + parameters.wheelB_driftOffset);

                    console.log('LEGO-BOOST: ROTATE RIGHT! ' + nextRotation + ' degrees | next Motor Rotation: ' + nextMotorRotation + ' degrees.');

                    hub.setMotorDegrees(nextMotorRotation, (-1) * parameters.boostSpeed, 1, boostUuid);
                    hub.setMotorDegrees(nextMotorRotation, parameters.boostSpeed, 0, boostUuid);

                }

                inMotion = true;
                boostStatus = 4;

                break;

            case 3:

                // Moving forward
                motorCounter += 1;

                if (motorCounter > 10){  // Motor has stopped. Boost stopped moving forward. We reached checkpoint

                    console.log('LEGO-BOOST: MOTOR HAS STOPPED. Forward finished. send 0 to current pathpoint');

                    boostStatus = 0;
                    inMotion = false;
                    motorCounter = 0;

                    if (pathPointTriggered !== null) {     // robot has finished motion. Send a 0 to current pathpoint
                        
                        console.log('pathPointTriggered: ', pathPointTriggered);
                        console.log('worldobjectId and tool id: ', worldObjectId, pathData[currentIndexInPath].id);
                        
                        nodeUtilities.searchNodeByType('node', pathData[currentIndexInPath].objectId, pathData[currentIndexInPath].id, null, function (objectKey, toolKey, newNodeKey){
                            
                            console.log('LEGO-BOOST: Node id: ', newNodeKey);
                            
                            let objectName = server.getObjectNameFromObjectId(objectKey);
                            let toolName = server.getToolNameFromToolId(objectKey, toolKey);
                            let newNodeName = server.getNodeNameFromNodeId(objectKey, toolKey, newNodeKey);
                            console.log('LEGO-BOOST: Node: ', objectName, toolName, newNodeName);

                            console.log('LEGO-BOOST: Set current path point to 0');
                            
                            // Set node to 0
                            server.write(objectName, toolName, newNodeName, 0);
                        
                            console.log('LEGO-BOOST: done');
                        });
                    }
                }

                break;
            case 4:

                // Turning
                motorCounter += 1;
                console.log('LEGO-BOOST: Rotating...', motorCounter);

                if (motorCounter > 10){  // Motor has stopped. Boost stopped turning, now MOVE FORWARD

                    console.log('LEGO-BOOST: MOTOR HAS STOPPED. Now move forward');

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

function computeBoostMovementTo(newPathPointX, newPathPointY){

    let lastDirectionTo = [lastDirectionAR.x, lastDirectionAR.y];
    
    let from = [lastPositionAR.x, lastPositionAR.y];
    let to = [newPathPointX/scaleFactor, newPathPointY/scaleFactor];

    console.log('from: ', from);
    console.log('to: ', to);

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

server.addEventListener("initialize", function () {
    if (exports.enabled) startHardwareInterface();
});
server.addEventListener("shutdown", function () {
});



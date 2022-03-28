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
 * Created by Anna Fuste on 01/24/22.
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
var settings = server.loadHardwareInterface(__dirname);

const express = require('express');
const router = express.Router();

const { RestInterface } = require('./restInterface');
const { WebSocketInterface } = require('./websocketInterfaceMIR');
const { WebsocketRemoteOperator } = require('./websocketRemoteOperator');
const { SocketInterface } = require('./socketClientUR');
const { CustomMaths } = require('./customMaths');


exports.enabled = settings('enabled');
exports.configurable = true;

let objectName = 'MIR-UR';
let mirHostIP = '10.10.10.5';
let mirPort = 39320; // or 9090;
let urHostIP = '10.10.10.85';
let urPort = 30001;
let scaleFactor = 1000;

let enableMIRConnection = true;     // For debugging purposes, deactivate from browser if you just want to develop on the interface without the robot connection
let isMIRConnected = false;
let enableURConnection = true;     // For debugging purposes, deactivate from browser if you just want to develop on the interface without the robot connection
let isURConnected = false;

let maths;

if (exports.enabled) {               // These settings will be exposed to the webFrontend to potentially be modified

    setup();

    //console.log('MIR: Settings loaded: ', objectName, mirHostIP, mirPort, isMIRConnected, enableMIRConnection);

    server.setHardwareInterfaceSettings('MIR100-UR3E', exports.settings, null, function(successful, error) {
        if (error) {
            console.log('MIR100-UR3E: error persisting settings', error);
        }
    });

    function setup() {

        /**
         * These settings will be exposed to the webFrontend to potentially be modified
         */
        exports.settings = {
            mirIp: {
                value: settings('mirIp', '10.10.10.5'),
                type: 'text',
                disabled: false,
                default: '10.10.10.5',
                helpText: 'The IP address of the MIR100 you want to connect to.'
            },
            mirPort: {
                value: settings('mirPort', 9090),
                type: 'number',
                disabled: false,
                default: 9090,
                helpText: 'The port of the MIR100 Gateway.'
            },
            urIp: {
                value: settings('urIp', '10.10.10.85'),
                type: 'text',
                disabled: false,
                default: '10.10.10.85',
                helpText: 'The IP address of the UR3E you want to connect to.'
            },
            urPort: {
                value: settings('urPort', 30001),
                type: 'number',
                disabled: false,
                default: 30001,
                helpText: 'The port of the UR3E Gateway.'
            },
            objectName: {
                value: settings('objectName', 'MIR-UR'),
                type: 'text',
                disabled: false,
                default: 'MIR-UR',
                helpText: 'The name of the object that connects to this hardware interface.'
            },
            isMIRConnected: {
                value: settings('isMIRConnected', false),
                type: 'boolean',                                                // Variable type
                disabled: true,                                                 // If this variable should be editable or not
                default: false,                                                 // Default value assigned to this variable
                helpText: 'Is the robot currently connected?'                   // Text that will appear on the web frontend
            },
            enableMIRConnection: {
                value: settings('enableMIRConnection', true),                   // Variable type
                type: 'boolean',                                                // Default value assigned to this variable
                disabled: false,                                                // If this variable should be editable or not
                default: true,
                helpText: 'Do you want to enable the connection of the robot?'  // Text that will appear on the web frontend
            },
            isURConnected: {
                value: settings('isURConnected', false),
                type: 'boolean',                                                // Variable type
                disabled: true,                                                 // If this variable should be editable or not
                default: false,                                                 // Default value assigned to this variable
                helpText: 'Is the robot currently connected?'                   // Text that will appear on the web frontend
            },
            enableURConnection: {
                value: settings('enableURConnection', true),                   // Variable type
                type: 'boolean',                                                // Default value assigned to this variable
                disabled: false,                                                // If this variable should be editable or not
                default: true,
                helpText: 'Do you want to enable the connection of the robot?'  // Text that will appear on the web frontend
            }
        };
    }

    objectName = exports.settings.objectName.value;
    mirHostIP = exports.settings.mirIp.value;
    mirPort = parseInt(exports.settings.mirPort.value);
    urHostIP = exports.settings.urIp.value;
    urPort = parseInt(exports.settings.urPort.value);
    enableMIRConnection = exports.settings.enableMIRConnection.value;
    isMIRConnected = exports.settings.isMIRConnected.value;
    enableURConnection = exports.settings.enableURConnection.value;
    isURConnected = exports.settings.isURConnected.value;

    server.addEventListener('reset', function() {   // reload the settings from settings.json when you get a 'reset' message
        settings = server.loadHardwareInterface(__dirname);
        setup();

        console.log('MIR100-UR3E: Settings loaded: ', objectName, mirHostIP, mirPort, isMIRConnected, enableMIRConnection, urHostIP, urPort, isURConnected, enableURConnection);
    });
}

let websocketMIR, socketUR, restinterface, websocketRemoteOperator;

function startHardwareInterface() {

    maths = new CustomMaths();
    
    if (enableMIRConnection) connectWebsocketMIR();

    if (enableURConnection) connectSocketUR();

    websocketRemoteOperator = new WebsocketRemoteOperator();    // Connect to the Remote Operator websocket to receive messages with the robot's poses from Unity

    websocketRemoteOperator.eventEmitter.on('newJointData', function(){
        if (socketUR) socketUR.computeJointSpeed(websocketRemoteOperator.currentJointAngles);
    });
    
    restinterface = new RestInterface();

    updateEvery(0, 100);
}

let mirStatus = {position: {x: 62.693, y: 12.344}, orientation: 11.222};       // Initial position of the robot in her MIR map
let arStatus = {position: {x:0,y:0}, direction:{x:0,y:-1}};      // AR STATUS. y is z

/**
 * @desc Compute the position from the MIR robot map into the AR coordinate system
 */
function positionFromMIRToAR(newPosition, newDirectionAngle)
{
    let newARPosition = {x:0, y:0, z:0};

    if (newDirectionAngle < 0) newDirectionAngle += 360;                                                    // newDirectionAngle between 0 - 360

    let initialAngleMIR = mirStatus.orientation;
    if (initialAngleMIR < 0) initialAngleMIR += 360;                                                        // initialAngleMIR between 0 - 360
    let initialRobotDirectionVectorMIR = [Math.cos(maths.degrees_to_radians(initialAngleMIR)),              // MIR space
        Math.sin(maths.degrees_to_radians(initialAngleMIR))];

    let from = [mirStatus.position.x, mirStatus.position.y];
    let to = [newPosition.x, newPosition.y];

    let newDistance = maths.distance(from, to);                                                             // Distance between points

    let newDir = [to[0] - from[0], to[1] - from[1]];                                                        // newDirection = to - from
    let newDirectionRad = maths.signed_angle(initialRobotDirectionVectorMIR, newDir);                       // Angle between initial direction and new direction
    
    let _initialOrientation_AR = maths.signed_angle([arStatus.direction.x, arStatus.direction.y], [1,0]);   // Initial AR direction

    if (_initialOrientation_AR < 0) _initialOrientation_AR += 2*Math.PI;                                    // _initialOrientation_AR between 0 - 360
    
    let newAngleDeg = maths.radians_to_degrees(_initialOrientation_AR) + maths.radians_to_degrees(newDirectionRad);

    newARPosition.x = (arStatus.position.x/scaleFactor) + (newDistance * Math.cos(maths.degrees_to_radians(newAngleDeg)));
    newARPosition.y = - ((- arStatus.position.y/scaleFactor) + (newDistance * Math.sin(maths.degrees_to_radians(newAngleDeg))));

    
    console.log('MIR initial orientation: ', initialAngleMIR);
    console.log('MIR new orientation: ', newDirectionAngle);
    let angleDifference = newDirectionAngle - initialAngleMIR;                                              // Angle difference between current and initial MIR orientation

    console.log('Angle difference: ', angleDifference);
    console.log('Initial AR orientation: ', maths.radians_to_degrees(_initialOrientation_AR));
    
    let newARAngle = maths.radians_to_degrees(_initialOrientation_AR) + angleDifference;
    
    if (newARAngle > 360) newARAngle -= 360;
    
    console.log('New AR Angle: ', newARAngle);
    
    newARPosition.z = maths.degrees_to_radians(newARAngle);

    return newARPosition;
}

function sendRealtimeMIRPosition(){
    
    //console.log('current robot position: ', websocketMIR.currentRobotPosition);
    //console.log('current robot angle: ', websocketMIR.currentYaw());
    
    // Get MIR position in Remote Operator
    let newVirtualPosition = positionFromMIRToAR(websocketMIR.currentRobotPosition, websocketMIR.currentYaw());
    
    //console.log('New Virtual Position', newVirtualPosition);
    
    let ip = 'localhost';
    let port = 8080;
    
    //let objectId = server.getObjectIdFromObjectName(objectName);
    let objectId = 'MIRUR_ufva2zpinam';
    
    let worldObject = server.getWorldObjectForObject(objectId);
    
    let newPosX = newVirtualPosition.x * scaleFactor;    // red in remote operator
    let newPosY = 0;    // height in remote operator
    let newPosZ = newVirtualPosition.y * scaleFactor;    // blue in remote operator

    //let newPosX = 1000;        // red in remote operator
    //let newPosY = 0;     // height in remote operator
    //let newPosZ = 0;        // blue in remote operator
    
    // Rotation in Y axis
    let rotationInRadians = newVirtualPosition.z;
    //let rotationInRadians = Math.PI/2;
    
    let worldId = '';
    let newMatrix = [
        Math.cos(rotationInRadians), 0, -Math.sin(rotationInRadians), 0,
        0, 1, 0, 0,
        Math.sin(rotationInRadians), 0, Math.cos(rotationInRadians), 0,
        newPosX, newPosY, newPosZ, 1
    ];
    
    // TODO: Send over websocket
    
    var urlEndpoint = 'http://' + ip + ':' + port + '/object/' + objectId + "/matrix";
    
    if (worldObject){
        let content = {
            matrix: newMatrix,
            worldId: worldObject.objectId,
            lastEditor: ''
        };

        restinterface.postData(urlEndpoint, content);
            //.then(res => console.log(res))          // JSON-string from `response.json()` call
            //.catch(error => console.error(error));
    }
}

/**
 * @desc Connect to websocket. If it fails, try to connect again. If success, continue with rest api requests
 */
function connectWebsocketMIR(){

    websocketMIR = new WebSocketInterface(mirHostIP, mirPort);

    websocketMIR.eventEmitter.on('ok', function(){
        exports.settings.isMIRConnected.value = true;
        server.pushSettingsToGui('MIR100-UR3E', exports.settings);
        
    }, false);
    websocketMIR.eventEmitter.on('ko', function(){
        exports.settings.isMIRConnected.value = false;
        server.pushSettingsToGui('MIR100-UR3E', exports.settings);
        connectWebsocketMIR();  // Try again until success
    }, false);
}

function connectSocketUR(){
    
    socketUR = new SocketInterface(urHostIP, urPort);

    socketUR.eventEmitter.on('ok', function(){
        exports.settings.isURConnected.value = true;
        server.pushSettingsToGui('MIR100-UR3E', exports.settings);
    }, false);
    socketUR.eventEmitter.on('ko', function(){
        exports.settings.isURConnected.value = false;
        server.pushSettingsToGui('MIR100-UR3E', exports.settings);
        connectSocketUR();  // Try again until success
    }, false);
    
    socketUR.eventEmitter.on('ur_play', function(){
        
        console.log('\x1b[36m%s\x1b[0m', "UR3E: Started Moving");
        
    }, false);

    socketUR.eventEmitter.on('ur_stop', function(){

        console.log('\x1b[36m%s\x1b[0m', "UR3E: Changed to stopped");

    }, false);

    socketUR.eventEmitter.on('ur_error', function(){
        console.log('\x1b[36m%s\x1b[0m', "UR3E: Something is wrong with the robot ☹");
    }, false);

    socketUR.eventEmitter.on('ur_ready', function(){
        
        console.log('\x1b[32m%s\x1b[0m', "UR3E: the robot is ready! 💟");

        //if (socket.isRobotOK && enableURconnection) socket.steer();

    }, false);
}

/**
 * @desc UPDATE method
 */
function updateEvery(i, time) {
    setTimeout(() => {
        if (enableMIRConnection) sendRealtimeMIRPosition();

        updateEvery(++i, time);
    }, time)
}

server.addEventListener("initialize", function () {
    if (exports.enabled) startHardwareInterface();
});
server.addEventListener("shutdown", function () {
});

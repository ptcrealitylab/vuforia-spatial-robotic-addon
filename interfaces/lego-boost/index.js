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

const { CustomMaths } = require('./customMaths');

const interval = 5;
const { Hub } = require('wedoboostpoweredup');
let hub = null;

exports.enabled = settings('enabled');
exports.configurable = true;

let objectName = '';
let isRobotConnected = false;
let enableRobotConnection = false;     // For debugging purposes, deactivate from browser if you just want to develop on the interface without the robot connection

if (exports.enabled) {               // These settings will be exposed to the webFrontend to potentially be modified

    setup();
    
    function setup() {
        
        /**
         * These settings will be exposed to the webFrontend to potentially be modified
         */
        exports.settings = {
            objectName: {
                value: settings('objectName'),
                type: 'text',
                disabled: false,
                helpText: 'The name of the object that connects to this hardware interface.'
            },
            isRobotConnected: {
                value: settings('isRobotConnected'),
                type: 'boolean',                                                // Variable type
                default: false,                                                 // Default value assigned to this variable
                disabled: true,                                                 // If this variable should be editable or not
                helpText: 'Is the robot currently connected?'                   // Text that will appear on the web frontend
            },
            enableRobotConnection: {
                value: settings('enableRobotConnection'),                         // Variable type
                type: 'boolean',                                                // Default value assigned to this variable
                disabled: false,                                                // If this variable should be editable or not
                helpText: 'Do you want to enable the connection of the robot?'  // Text that will appear on the web frontend
            }
        };
    }
    
    objectName = exports.settings.objectName.value;
    enableRobotConnection = exports.settings.enableRobotConnection.value;
    isRobotConnected = exports.settings.isRobotConnected.value;

    server.addEventListener('reset', function() {   // reload the settings from settings.json when you get a 'reset' message
        settings = server.loadHardwareInterface(__dirname);
        setup();
    });
}

console.log('LEGO-BOOST: Settings loaded: ', objectName, isRobotConnected, enableRobotConnection);

let maths = null;

let inMotion = false;                       // When robot is moving
let boostStatus = {};                       // TODO: BOOST STATUS ??
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
    
    console.log('LEGO-BOOST: Allow robot Connection? ', enableRobotConnection);

    server.enableDeveloperUI(true);
    server.removeAllNodes(objectName, 'kineticAR'); // We remove all existing nodes from the Frame
    
    maths = new CustomMaths();

    console.log('LEGO-BOOST: Setting default tool to motion');
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

        initOrientationBoost = currentOrientationBoost;                         // Get orientation at this moment in time
        initOrientationAR =  (-1) * maths.signed_angle([1,0], [lastDirectionAR.x, lastDirectionAR.y]) * 180 / Math.PI;
        initPositionBoost.x = currentPositionBoost.x;
        initPositionBoost.y = currentPositionBoost.y;
        initialSync = true;

        console.log("LAST POSITION AR: ", lastPositionAR);              //       { x: -332.3420, y: 482.1173, z: 1749.54107 }
        console.log("LAST DIRECTION AR: ", lastDirectionAR);            //       { x: -0.84, y: -0.00424 }

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

        console.log("LEGO-BOOST: Current PATH DATA in SERVER: ", JSON.stringify(pathData));

        server.pushUpdatesToDevices(objectName);

    });

    if (enableRobotConnection){
        hub = new Hub("lego", interval);
    }
    updateEvery(0, 100);
}

function nodeReadCallback(data, checkpointIdx, pathIdx){

    // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint
    // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

    console.log('LEGO-BOOST: NODE ', checkpointIdx, ' path: ', pathIdx, ' received ', data);

    let checkpointTriggered = pathData[pathIdx].checkpoints[checkpointIdx];

    if (data.value === 1){

        if (!checkpointTriggered.active){   // Checkpoint has changed from not active to active. We have to send robot here

            console.log('LEGO-BOOST: Checkpoint has changed from not active to active: ', checkpointTriggered.name);
            
            activeCheckpointName = checkpointTriggered.name;
            checkpointTriggered.active = 1;             // This checkpoint gets activated

            // TODO: COMPUTE MOVEMENT FOR BOOST

            let boostMovement = computeBoostMovement(checkpointTriggered.posX, checkpointTriggered.posZ, checkpointTriggered.orientation);
            
            inMotion = true;
        } else {
            console.log('LEGO-BOOST: WARNING: This checkpoint was already active!');
        }

    } else if (data.value === 0){   // If node receives a 0

        if (checkpointTriggered.active){

            console.log('LEGO-BOOST: Checkpoint has changed from active to not active: ', checkpointTriggered.name);

            if (inMotion){      // The node has been deactivated in the middle of the move mission. We need to delete the mission from the mission queue
                
                console.log('LEGO-BOOST: Mission interrupted');

                // TODO: STOP BOOST


            } else {        // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint
                
                console.log('LEGO-BOOST: Checkpoint reached: ', checkpointTriggered.name);
                checkpointTriggered.active = 0; // This checkpoint gets deactivated

                let nextCheckpointToTrigger = null;

                if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                      // Next checkpoint in same path
                    nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                    console.log('LEGO-BOOST: Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                    
                    server.write(objectName, "kineticAR", nextCheckpointToTrigger.name, 1);

                } else {                                                                            // We reached end of path

                    activeCheckpointName = null;

                }
            }
        }
    }
}


// TODO: compute BOOST movement
function computeBoostMovement(newCheckpointX, newCheckpointY, checkpointOrientation){
    
}

/**
 * @desc UPDATE method
 */
function updateEvery(i, time) {
    setTimeout(() => {
        
        // TODO: Send realtime position ??
        
        updateEvery(++i, time);
    }, time)
}

server.addEventListener("initialize", function () {
    console.log('LEGO-BOOST: VST Server has been initialized.');
    if (exports.enabled) startHardwareInterface();
});
server.addEventListener("shutdown", function () {
});



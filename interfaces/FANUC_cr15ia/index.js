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

const { SocketInterface } = require('./socketClient');
const { CustomMaths } = require('./customMaths');

exports.enabled = settings('enabled');

let enableFANUCconnection = true;
let maths = null;

const hostIP = "10.10.10.31";  // FANUC IP
const port = 59002;

let objectName = 'FANUC';
let fanuc_mission_interrupted = false;
let inMotion = false;                   // When robot is moving
let pathData = [];                      // List of paths with checkpoints
let activeCheckpointName = null;        // Current active checkpoint

// FANUC SOCKET
let socket = null;

function startHardwareInterface() {
    
    console.log('FANUC: enable connection: ', enableFANUCconnection);

    server.enableDeveloperUI(true);
    server.removeAllNodes(objectName, 'kineticAR');   // We remove all existing nodes from the Frame

    console.log('FANUC: Setting default tool to motion');
    server.setTool(objectName, 'kineticAR', 'motion', __dirname);
    
    maths = new CustomMaths();

    if (enableFANUCconnection){
        
        socket = new SocketInterface(hostIP, port);

        socket.eventEmitter.on('fanuc_play', function(){
            console.log('FANUC started moving');
        }, false);

        socket.eventEmitter.on('fanuc_stop', function(){

            console.log("FANUC: CHANGED TO STOPPED");

            inMotion = false;

            // FANUC has finished mission. Send a 0 to current checkpoint

            console.log("FANUC: Setting active checkpoint to 0", activeCheckpointName);

            server.write(objectName, "kineticAR", activeCheckpointName, 0);

        }, false);

        socket.eventEmitter.on('fanuc_error', function(){
            console.log('\x1b[36m%s\x1b[0m', "FANUC: Something is wrong with the robot ☹");
        }, false);

        socket.eventEmitter.on('fanuc_ready', function(){
            console.log('\x1b[32m%s\x1b[0m', "FANUC: the robot is ready! 💟 ");
        }, false);
    }

    server.addNode(objectName, "kineticAR", "kineticNode1", "storeData");     // Node for checkpoint stop feedback
    server.addNode(objectName, "kineticAR", "kineticNode2", "storeData");     // Node for the data path. Follow Checkpoints
    server.addNode(objectName, "kineticAR", "kineticNode4", "storeData");     // Node for cleaning the path

    server.addPublicDataListener(objectName, "kineticAR", "kineticNode4","ClearPath",function (data) {

        console.log("FANUC:   -   -   -   Frame has requested to clear path: ", data);
        
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

        // We go through array of paths
        data.forEach(framePath => {

            let pathExists = false;

            pathData.forEach(serverPath => {

                if (serverPath.index === framePath.index){   // If this path exists on the server, proceed to update checkpoints
                    pathExists = true;

                    // Foreach checkpoint received from the frame
                    framePath.checkpoints.forEach(frameCheckpoint => {

                        let exists = false;
                        
                        // Check against each checkpoint stored on the server
                        serverPath.checkpoints.forEach(serverCheckpoint => {

                            if (serverCheckpoint.name === frameCheckpoint.name){
                                // Same checkpoint. Check if position has changed and update
                                exists = true;

                                if (serverCheckpoint.posX !== frameCheckpoint.posX) serverCheckpoint.posX = frameCheckpoint.posX;
                                if (serverCheckpoint.posY !== frameCheckpoint.posY) serverCheckpoint.posY = frameCheckpoint.posY;
                                if (serverCheckpoint.posZ !== frameCheckpoint.posZ) serverCheckpoint.posZ = frameCheckpoint.posZ;
                                if (serverCheckpoint.posXFANUC !== frameCheckpoint.posXFANUC) serverCheckpoint.posXFANUC = frameCheckpoint.posXFANUC;
                                if (serverCheckpoint.posYFANUC !== frameCheckpoint.posYFANUC) serverCheckpoint.posYFANUC = frameCheckpoint.posYFANUC;
                                if (serverCheckpoint.posZFANUC !== frameCheckpoint.posZFANUC) serverCheckpoint.posZFANUC = frameCheckpoint.posZFANUC;
                                if (serverCheckpoint.orientation !== frameCheckpoint.orientation) serverCheckpoint.orientation = frameCheckpoint.orientation;

                                // <node>, <frame>, <Node>, x, y, scale, matrix
                                server.moveNode(objectName, "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.3,[
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, 0, frameCheckpoint.posY * 1.6, 1
                                ], true);
                                server.pushUpdatesToDevices(objectName);
                            }
                        });

                        // If the checkpoint is not in the server, add it and add the node listener.
                        if (!exists){
                            serverPath.checkpoints.push(frameCheckpoint);

                            server.addNode(objectName, "kineticAR", frameCheckpoint.name, "node");

                            console.log('FANUC: NEW ' + frameCheckpoint.name + ' | position: ', frameCheckpoint.posX, frameCheckpoint.posY, frameCheckpoint.posZ);

                            // <node>, <frame>, <Node>, x, y, scale, matrix
                            server.moveNode(objectName, "kineticAR", frameCheckpoint.name, frameCheckpoint.posX, frameCheckpoint.posZ, 0.3,[
                                1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, frameCheckpoint.posY * 1.6, 1
                            ], true);

                            server.pushUpdatesToDevices(objectName);

                            console.log('FANUC: ************** Add read listener to ', frameCheckpoint.name);

                            // Add listener to node
                            server.addReadListener(objectName, "kineticAR", frameCheckpoint.name, function(data){

                                let indexValues = frameCheckpoint.name.split("_")[1];
                                let pathIdx = parseInt(indexValues.split(":")[0]);
                                let checkpointIdx = parseInt(indexValues.split(":")[1]);
                                nodeReadCallback(data, checkpointIdx, pathIdx);

                            });
                        }
                    });
                }
            });

            if (!pathExists){   // If the path doesn't exist on the server, add it to the server path data

                pathData.push(framePath);

            }
        });

        //console.log("FANUC: Current PATH DATA in SERVER: ", JSON.stringify(pathData));

    });
}

function nodeReadCallback(data, checkpointIdx, pathIdx){

    // if the value of the checkpoint node changed to 1, we need to send the robot to that checkpoint
    // if the value of the checkpoint node changed to 0, the robot just reached the checkpoint and we can trigger other stuff

    console.log('NODE ', checkpointIdx, ' path: ', pathIdx, ' received ', data);

    let checkpointTriggered = pathData[pathIdx].checkpoints[checkpointIdx];

    if (data.value === 1){

        if (!checkpointTriggered.active){

            console.log('FANUC: Checkpoint has changed from not active to active: ', checkpointTriggered.name);
            
            activeCheckpointName = checkpointTriggered.name;                                                            
            checkpointTriggered.active = 1;                                                                             // This checkpoint gets activated

            /** Send FANUC to position in millimiters **/
            let offsetZ = 0.170;
            if (socket.isRobotOK && enableFANUCconnection) socket.moveFANUCto(checkpointTriggered.posXFANUC, checkpointTriggered.posYFANUC, offsetZ + checkpointTriggered.posZFANUC, 0, Math.PI, 0);

            inMotion = true;
            
            server.writePublicData(objectName, "kineticAR", "kineticNode1", "CheckpointTriggered", checkpointIdx);         // Alert frame of new checkpoint goal

        } else {
            console.log('FANUC: WARNING - This checkpoint was already active!');
        }

    } else if (data.value === 0){   // If node receives a 0

        if (checkpointTriggered.active){

            console.log('FANUC: Checkpoint has changed from active to not active: ', checkpointTriggered.name);

            if (inMotion){

                // The node has been deactivated in the middle of the motion
                console.log('FANUC: Mission interrupted');

                // TODO: STOP FANUC

                fanuc_mission_interrupted = true;

            } else {

                // Checkpoint has changed from active to not active, robot just got here. We have to trigger next checkpoint

                console.log('Checkpoint reached: ', checkpointTriggered.name);
                checkpointTriggered.active = 0;                                                                         // This checkpoint gets deactivated

                server.writePublicData(objectName, "kineticAR", "kineticNode1", "CheckpointStopped", checkpointIdx);       // Tell frame checkpoint has been reached

                let nextCheckpointToTrigger = null;

                if (checkpointIdx + 1 < pathData[pathIdx].checkpoints.length){                                          // Next checkpoint in same path
                    nextCheckpointToTrigger = pathData[pathIdx].checkpoints[checkpointIdx + 1];

                    console.log('Next checkpoint triggered: ', nextCheckpointToTrigger.name);
                    server.write(objectName, "kineticAR", nextCheckpointToTrigger.name, 1);

                } else {                                                                                                // We reached end of path

                    activeCheckpointName = null;

                    if (socket.isRobotOK && enableFANUCconnection) socket.send('+350.00:+000.00:+230.00'); // We send default position to get Fanuc back to origin pos

                }
            }
        }
    }
}

server.addEventListener("reset", function () {

});

server.addEventListener("shutdown", function () {

});

server.addEventListener("initialize", function () {
    
    if (exports.enabled){
        console.log('FANUC: Server has been initialized.');
        startHardwareInterface();
    } 
});

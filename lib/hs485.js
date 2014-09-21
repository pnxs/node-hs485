"use strict"

var Crc16 = require("./crc16");
var physical = require("./physical");
var frame = require("./frame");
var request = require("./request");

var Frame = frame.Frame;

var protocol = {
    START_SHORT: 0xFE,
    START_LONG: 0xFD,
    ESCAPE: 0xFC
};
    
var receiveStates = {
    IDLE: 0,
    DST: 1,
    CTRL: 2,
    SRC: 3,
    LEN: 4,
    DATA: 5,
    DONE: 6
};

function hs485parser()
{
    //console.log("create hs485parser");
    var data = [];
    var frame = new Frame();
    var mode = receiveStates.IDLE;
    var escaped = false;
    var frameStart = false;
    var addrLength = 0;
    var receiveCnt = 0;
    var emitter = undefined;
    var crc16 = undefined;

    var startFrame = function(start) {
        crc16 = new Crc16;
        receiveCnt = 0;
        if(start == protocol.START_LONG) {
            addrLength = 4;
        } else {
            addrLength = 1;
        }
        frame.start = start;
        crc16.update([start]);
    }

    var changeState = function(newState) {
        //console.log("changeState state from " + mode + " to " + newState);
        mode = newState;
        receiveCnt = 0;
    }

    var hasSrcAddr = function(b) {
        if ((b & 1) == 0 || (b & 3) == 1) {
            if (b & 8) {
                return true;
            }
        }
        return false;
    }

    var parse = function(b) {
        if (b == protocol.START_SHORT || b == protocol.START_LONG) {
            frameStart = b;
        }
        else {
            frameStart = 0;
        }

        // Handle escaping
        if (b == protocol.ESCAPE) {
            escaped = true;
            return;
        }
        if (escaped) {
            b = b | 0x80;
            escaped = false;
        }

        if (crc16) {
            crc16.update([b]);
        }
        receiveCnt++;

        switch(mode) {
            case receiveStates.IDLE:
                if (frameStart) {
                    //console.log("received framestart");
                    startFrame(frameStart);
                    changeState(receiveStates.DST);
                    frame.dst_addr = 0;
                }
                break;
            case receiveStates.DST:
                //console.log("receive dst");
                frame.dst_addr = (frame.dst_addr << 8) | b;
                if (receiveCnt == addrLength) {
                    changeState(receiveStates.CTRL);
                }
                break;
            case receiveStates.CTRL:
                //console.log("receive ctrl");
                frame.ctrlByte = b;
                if (hasSrcAddr(b)) {
                    frame.src_addr = 0;
                    changeState(receiveStates.SRC);
                } else {
                    changeState(receiveStates.LEN);
                }
                break;
            case receiveStates.SRC:
                //console.log("receive src");
                frame.src_addr = (frame.src_addr << 8) | b;
                if (receiveCnt == addrLength) {
                    changeState(receiveStates.LEN);
                }
                break;
            case receiveStates.LEN:
                //console.log("receive len" + b);
                frame.size = b;
                frame.data = [];
                changeState(receiveStates.DATA);
                break;
            case receiveStates.DATA:
                //console.log("receive data");
                frame.data.push(b);
                if (receiveCnt == frame.size) {
                    changeState(receiveStates.DONE);
                    var crc = frame.data.splice(-2);

                    if (crc16.crc == 0) {
                        emitter(frame);
                    } else {
                        console.log("crc fail");
                    }

                }
                break;
            case receiveStates.DONE:
                console.log("reached done state, do nothing");
                break;
        }
//        console.log("parse: "+ b);

    }

    return function(_emitter, buffer) {
        //console.log("hs485parser buffer: " + buffer);
        emitter = _emitter;
        buffer.forEach(parse);
    };
}

function sendIframe(frame, resultCb) {
}

function Hs485Manager() {
}

Hs485Manager.prototype.discoverModules = function(cb) {
    // Start discover of modules
    var fakeDevicelist = [];
    cb(fakeDevicelist);
}

Hs485Manager.prototype.getActorState = function(addr, actor, resultCb) {
    // Retreive state from actor and call callback

    resultCb(0);
}

exports.Crc16 = Crc16;
exports.parser = hs485parser;
exports.physical = physical;
exports.request = request;

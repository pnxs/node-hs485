"use strict";

var frame = require("./frame");
var Crc16 = require("./crc16");
//var winston = require("winston");
var Frame = frame.Frame;
var EventEmitter = require("events").EventEmitter;
var util = require('util');

var receiveStates = {
    IDLE: 0,
    DST: 1,
    CTRL: 2,
    SRC: 3,
    LEN: 4,
    DATA: 5,
    DONE: 6
};

var protocol = {
    START_SHORT: 0xFE,
    START_LONG: 0xFD,
    ESCAPE: 0xFC
};

function hs485parser()
{
    var data = [];
    var frame = new Frame();
    var mode = receiveStates.IDLE;
    var escaped = false;
    var frameStart = false;
    var addrLength = 0;
    var receiveCnt = 0;
    var emitter;
    var crc16;

    var startFrame = function(start) {
        crc16 = new Crc16();
        receiveCnt = 0;
        if(start === protocol.START_LONG) {
            addrLength = 4;
        } else {
            addrLength = 1;
        }
        frame.start = start;
        crc16.update([start]);
    };

    var changeState = function(newState) {
        //console.log("changeState state from " + mode + " to " + newState);
        mode = newState;
        receiveCnt = 0;
    };

    var hasSrcAddr = function(b) {
        if ((b & 1) === 0 || (b & 3) === 1) {
            if (b & 8) {
                return true;
            }
        }
        return false;
    };

    var parse = function(b) {
        if (b === protocol.START_SHORT || b === protocol.START_LONG) {
            frameStart = b;
            changeState(receiveStates.IDLE);
        }
        else {
            frameStart = 0;
        }

        // Handle escaping
        if (b === protocol.ESCAPE) {
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
                if (receiveCnt === addrLength) {
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
                if (receiveCnt === addrLength) {
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
                if (receiveCnt === frame.size) {
                    changeState(receiveStates.IDLE);
                    var crc = frame.data.splice(-2);
                    frame.dataSize = frame.size - 2;

                    if (crc16.crc === 0) {
                        emitter.emit('data', frame);
                    } else {
                        console.log("crc fail");
                    }

                }
                break;
            case receiveStates.DONE:
                console.log("reached done state, do nothing");
                break;
        }
        //console.log("parse: "+ b);

    };

    return function(_emitter, buffer) {
        var buf = [];
        for(var i=0; i<buffer.length;i++) {
            buf.push(Number(buffer[i]));
        }
        //console.log("hs485parser buffer: " + buf);
        emitter = _emitter;
        buf.forEach(parse);
    };
}

function Hs485Pci(device, serialPort) {
    if (serialPort === undefined) {
        var serial = require("serialport");
        this.serialPort = new serial.SerialPort(device, {
            baudrate: 19200,
            parity: 'even',
            parser: hs485parser()
        });
    }
    else {
        this.serialPort = new serialPort(device, {
            baudrate: 19200,
            parity: 'even',
            parser: hs485parser()
        });
    }
}

util.inherits(Hs485Pci, EventEmitter);

Hs485Pci.prototype.init = function() {
    var self = this;
    var sp = this.serialPort;

    //winston.info("Opening serialport...");

    sp.on("open", function() {
        //winston.info("Port opened");
        sp.on("data", function(data) {
            self.emit("frame", data);
        });
        self.emit("open");
    });
};

Hs485Pci.prototype.sendRaw = function(data) {
    //var escapedData = escapeFrame(data);
    var escapedData = escapeFrame(data, 1);
    //console.log("sendRaw frame:" + escapedData);
    this.serialPort.write(escapedData, function(err) {
        //console.log("discovery write returns: " + err);
    });
};

Hs485Pci.prototype.send = function(frame) {
    var escapedData = escapeFrame(frame.serialize(), 1);
    //console.log("send frame:" + escapedData);
    this.serialPort.write(escapedData, function(err) {
        //console.log("discovery write returns: " + err);
    });
};

function escapeFrame(data, begin) {
    var len = data.length,
        result = [],
        i, d;

    if (begin === undefined) {
        begin = 0;
    }
    for (i = 0; i < begin; i++) {
        result.push(data[i]);
    }


    for (i = begin; i < len; i++) {
        d = data[i];
        if (d === 0xfd || d === 0xfe || d === 0xfc) {
            result.push(0xfc, d & 0x7f);
        } else {
            result.push(d);
        }
    }

    return result;
}

exports.Hs485Pci = Hs485Pci;
exports.parser = hs485parser;
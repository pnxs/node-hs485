"use strict";

var physical = require("./physical");
var frame = require("./frame");
var Frame = frame.Frame;
var FrameType = frame.FrameType;
var request = require("./request");

var protocol = {
    START_SHORT: 0xFE,
    START_LONG: 0xFD,
    ESCAPE: 0xFC
};

var State = {
    Idle: 0,
    RequestSent: 1,
    ReplyReceived: 2,
    AckSent: 3
};

function moduleType2String(type) {
    switch(type) {
        case 0: return "HS485 D";
        case 1: return "HS485 S";
        case 2: return "HS485 RS";
        case 3: return "HS485 ZKL";
        case 4: return "JCU10 TFS";
        case 5: return "HS485 IO4UP";
        case 7: return "HS485 IO127";
        case 8: return "HS485 LX1";
        default: return "Unknown (" + type + ")";
    }
}


function toUint32(a)
{
    var r = a[0] << 24;
    r |= a[1] << 16;
    r |= a[2] << 8;
    r |= a[3];
    return r;
}

function Hs485Manager(device, serialPort) {
    this.hs485pci = new physical.Hs485Pci(device, serialPort);
    this.serialPort = this.hs485pci.serialPort;
    this.inDiscovery = false;
    this.requestQueue = [];
    this.sendState = State.Idle;
    this.retryCount = 0;
    this.address = 0;
}

Hs485Manager.prototype.init = function() {
    var self = this;

    self.hs485pci.on("open", function() {
        self.hs485pci.on("frame", function(data) {
            self.handleData(data);
        });

        if (self.ready !== undefined) {
            self.ready();
        }
    });

    this.hs485pci.init();

};

Hs485Manager.prototype.handleData = function(frame) {
    //console.log("data received: " + JSON.stringify(frame));
    if (this.inDiscovery) {
        if (frame.type() === FrameType.Hs485Pci && frame.dst_addr === 0 && frame.data.length === 5)
        {
            if (frame.data[1] === 0xff)
            {
                this.discoverFinished(this.deviceList);
                this.inDiscovery = false;
            }
            this.deviceList.push(toUint32(frame.data.slice(1,5)));
        }
    }
    else if (this.currentRequest !== undefined) {
        this.currentResponse = frame;

        //console.log("process received data: " + JSON.stringify(frame));
        this.sendState = State.ReplyReceived;

        if (frame.type() === FrameType.IFrame) {
            // Send ACK
            var ack = new Frame(FrameType.Ack);
            ack.setSourceAddress(this.address); // fill in our address
            ack.setDestinationAddress(frame.src_addr);
            ack.setReceiveSequence(frame.sendSequence());
            this.hs485pci.send(ack);
            this.sendState = State.AckSent;
        }
        this.currentRequest[1](this.currentResponse);
        this.currentRequest = undefined;

        this.processRequests();
    }
};

Hs485Manager.prototype.timeout = function(state) {
    if (state === this.sendState) {
        // process timeout
        if (this.retryCount > 0) {
            if (this.currentRequest !== undefined) {
                this.hs485pci.send(this.currentRequest[0]);
                this.retryCount -= 1;
                setTimeout(this.timeout(State.RequestSent), 500);
            } else {
                //console.log("timeout() currentRequest is undefined");
            }
        }
        else {
            console.log("retry count reached");
        }
    }
};

Hs485Manager.prototype.discoverModules = function(cb) {
    this.inDiscovery = true;
    this.discoverFinished = cb;
    this.deviceList = [];

    this.hs485pci.sendRaw([0xfe, 0x04, 0x00, 0xae, 0xd0]);
};

/*
  uint32_t Dst-Address
  bool     Force-Sync
  list     Data

  Returns:
  Ok (from ACK)
  Ok with Data

  -> Send Iframe
  <- Recv ACK

  -> Send Iframe
  <- Recv Iframe
  -> Send Ack

  Higher level Commands:
  set actor
  get actor state

  get moduletype and hw rev.
  get firmware version

  reset module

  read config

  write eeprom
  read eeprom

  Events:
  key event
*/

Hs485Manager.prototype.queueRequest = function(frame, cb) {
    this.requestQueue.push([frame, cb]);

    this.processRequests();
};

Hs485Manager.prototype.processRequests = function() {
    var requestQueue = this.requestQueue;

    if (this.currentRequest === undefined && requestQueue.length > 0) {
        this.currentRequest = requestQueue.splice(0,1)[0];
        this.currentResponse = undefined;

        //console.log("Start request " + JSON.stringify(this.currentRequest[0]));
        this.hs485pci.send(this.currentRequest[0]);
        this.sendState = State.RequestSent;
        this.retryCount = 3;
        setTimeout(this.timeout(State.RequestSent), 500);
    }
};

// Hs485 commands

Hs485Manager.prototype.getModuleVersion = function(moduleAddr, cb) {
    var versionReq = new Frame();
    versionReq.setSourceAddress(this.address);
    versionReq.setDestinationAddress(moduleAddr);
    versionReq.setData(['h']);

    this.queueRequest(versionReq, function(frame) {
        var moduleVersion = {};
        moduleVersion.hwType = frame.data[0];
        moduleVersion.hwName = moduleType2String(moduleVersion.hwType);
        moduleVersion.hwVersion = frame.data[1];
        cb(moduleVersion);
    });
};

Hs485Manager.prototype.getActorState = function(moduleAddr, actorNr, cb) {
    var versionReq = new Frame();
    versionReq.setSourceAddress(this.address);
    versionReq.setDestinationAddress(moduleAddr);
    versionReq.setData(['S', actorNr]);

    this.queueRequest(versionReq, function(frame) {
        var actorState = {};
        actorState.address = moduleAddr;
        actorState.actorNr = frame.data[0];
        actorState.state = frame.data[1];
        cb(actorState);
    });
};

Hs485Manager.prototype.getBrightness = function(moduleAddr, cb) {
    var versionReq = new Frame();
    versionReq.setSourceAddress(this.address);
    versionReq.setDestinationAddress(moduleAddr);
    versionReq.setData(['L']);

    this.queueRequest(versionReq, function(frame) {
        var brightness = {};
        console.log("Brightness:" + JSON.stringify(frame));
        //cb(actorState);
    });
};


exports.physical = physical;
exports.request = request;
exports.Manager = Hs485Manager;
exports.frame = frame;
exports.protocol = protocol;

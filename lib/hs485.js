"use strict";

var physical = require("./physical");
var frame = require("./frame");
var request = require("./request");

var protocol = {
    START_SHORT: 0xFE,
    START_LONG: 0xFD,
    ESCAPE: 0xFC
};
    
function toUint32(a)
{
    var r = a[0] << 24;
    r |= a[1] << 16;
    r |= a[2] << 8;
    r |= a[3];
    return r;
}

function Discovery(manager) {
    this.manager = manager;
    this.deviceList = [];
}

Discovery.prototype.sendRequest = function() {
    // Start discover of modules
    var manager = this.manager;
    //var self = this;
    manager.serialPort.write([0xfe, 0x04, 0x00, 0xae, 0xd0], function(err) {
        //console.log("discovery write returns: " + err);
    });
};

Discovery.prototype.handleData = function(msg) {
//  console.log("Discovery handleData" + msg);

    if (msg.start === protocol.START_SHORT && msg.dst_addr === 0)
    {
        if (msg.size === 7 && msg.data[0] === 0x80)
        {
            if (msg.data[1] === 0xff)
            {
                this.finishCallback(this.deviceList);
            }
            this.deviceList.push(toUint32(msg.data.slice(1,5)));
        }
    }
};


function Hs485Manager(device, serialPort) {
    this.hs485pci = new physical.Hs485Pci(device, serialPort);
    this.serialPort = this.hs485pci.serialPort;
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

Hs485Manager.prototype.handleData = function(data) {
//    console.log("data received: " + JSON.stringify(data));
    if (this.pendingRequest !== undefined) {
        this.pendingRequest.handleData(data);
    }

};

Hs485Manager.prototype.discoverModules = function(cb) {
    var discovery = new Discovery(this);
    var self = this;
    discovery.finishCallback = function(dl) {
        self.pendingRequest = undefined;
        cb(dl);
    };

    this.pendingRequest = discovery;
    discovery.sendRequest();
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
Hs485Manager.prototype.iframeRequest = function(iframe) {
    var oldFinishCb = iframe.finished;
    var self = this;
    iframe.finished = function() {
        self.pendingRequest = undefined;
        oldFinishCb();
    };

    iframe.manager = this;
    this.pendingRequest = iframe;
    this.serialPort.write(iframe.serialize(), function(err) {
        //console.log("discovery write returns: " + err);
    });
};

Hs485Manager.prototype.getActorState = function(addr, actor, resultCb) {
    // Retreive state from actor and call callback

    resultCb(0);
};


exports.physical = physical;
exports.request = request;
exports.Manager = Hs485Manager;
exports.frame = frame;
exports.protocol = protocol;

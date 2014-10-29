"use strict"

var util = require("./util");
var toUint32 = util.toUint32;
var fromUint32 = util.fromUint32;
var Crc16 = require("./crc16");

var frameType = {
    Unknown: 0,
    IFrame: 1,
    Ack: 2,
    Hs485Pci: 3,
    Discovery: 4
};

function Frame() {
    this.start = undefined;
    this.dst_addr = undefined;
    this.ctrlByte = undefined;
    this.src_addr = undefined;
    this.size = undefined;
    this.data = [];
}

Frame.prototype.isIFrame = function() {
    return ((this.ctrlByte & 1) == 0);
}

Frame.prototype.isAck = function() {
    return ((this.ctrlByte & 3) == 1);
}

function IFrame() {
    this.sendSeq = 0;
    this.recvSeq = 0;
    this.syncBit = 0;
    this.lastPacket = 1;
    this.hasSrc = false;
}

function AckFrame() {
    this.recvSeq = 0;
    this.hasSrc = false;
}

AckFrame.prototype.binCtrlByte = function() {
    return (this.recvSeq & 3) << 5 |
           (1 << 4) |
           (this.hasSrc & 1) << 3 |
           1;
}

AckFrame.prototype.serialize = function() {
    var data = []
    data.push(0xfd); // start
    data = data.concat(fromUint32(this.dst_addr));
    data.push(this.binCtrlByte()); // ctrl byte
    data = data.concat(fromUint32(this.src_addr));

    data.push(2);
    
    var crc16 = new Crc16;
    crc16.update(data);
    crc16.update([0,0]);

    data.push(crc16.crc >> 8 & 0xff);
    data.push(crc16.crc & 0xff);

    return data;
}

IFrame.prototype.binCtrlByte = function() {
    return (this.syncBit & 1) << 7 |
           (this.recvSeq & 3) << 5 |
           (this.lastPacket & 1) << 4 |
           (this.hasSrc & 1) << 3 |
           (this.sendSeq & 3) << 1;
}

IFrame.prototype.serialize = function() {
    var data = []
    data.push(0xfd); // start
    data = data.concat(fromUint32(this.dst_addr));
    data.push(this.binCtrlByte()); // ctrl byte
    data = data.concat(fromUint32(this.src_addr));

    data.push(this.size);
    data = data.concat(this.data);

    var crc16 = new Crc16;
    crc16.update(data);
    crc16.update([0,0]);

    data.push(crc16.crc >> 8 & 0xff);
    data.push(crc16.crc & 0xff);

    return data;
}

IFrame.prototype.handleData = function(data) {
//    console.log("HandleData:"+JSON.stringify(data));
    if (data.isIFrame())
    {
        // send ACK
        var ack = new AckFrame;
        ack.recvSeq = data.ctrlByte >> 1 & 3;
        ack.hasSrc = true;
        ack.dst_addr = data.src_addr;
        ack.src_addr = data.dst_addr;

        var soll = [0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8];
 //       console.log("Soll.: " + soll);
//        console.log("Write: " + ack.serialize());

        this.manager.serialPort.write(ack.serialize(), function(err) {
            //console.log("discovery write returns: " + err);
        });
    }

    // request finished
    this.finished();
}


exports.Frame = Frame;
exports.IFrame = IFrame;

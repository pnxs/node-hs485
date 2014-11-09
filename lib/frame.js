"use strict";

var util = require("./util");
var toUint32 = util.toUint32;
var fromUint32 = util.fromUint32;
var Crc16 = require("./crc16");

var FrameType = {
    Unknown: 0,
    IFrame: 1,
    Ack: 2,
    Hs485Pci: 3,
    Discovery: 4
};

function Frame(frameType) {
    this.start = 0;
    this.dst_addr = 0;
    this.ctrlByte = 0x10;
    this.src_addr = undefined;
    this.size = 0;
    this.data = [];
    this.dataSize = 0;

    if (frameType === undefined) {
        frameType = FrameType.IFrame;
    }

    this.setType(frameType);
}

Frame.prototype.type = function() {
    var cb = this.ctrlByte;
    if (this.start === 0xfe && (cb & 0x01) === 0) {
        return FrameType.Hs485Pci;
    }
    else if ((cb & 0x01) === 0) {
        return FrameType.IFrame;
    }
    else if ((cb & 0x03) === 1) {
        return FrameType.Ack;
    }
    else if ((cb & 0x07) === 3) {
        return FrameType.Discovery;
    }
    return FrameType.Unknown;
};

Frame.prototype.setType = function(type) {
    switch(type)
    {
        case FrameType.Hs485Pci:
            this.start = 0xfe;
            this.ctrlByte &= ~(0x01);
            break;
        case FrameType.IFrame:
            this.start = 0xfd;
            this.ctrlByte &= ~(0x01);
            break;
        case FrameType.Ack:
            this.start = 0xfd;
            this.ctrlByte &= ~(0x03);
            this.ctrlByte |= 0x01;
            break;
        case FrameType.Discovery:
            this.start = 0xfd;
            this.ctrlByte &= ~(0x07);
            this.ctrlByte |= 0x03;
            break;
    }
};

Frame.prototype.setDestinationAddress = function(addr) {
    this.dst_addr = addr;
};

Frame.prototype.setSourceAddress = function(addr) {
    this.ctrlByte |= 0x08;
    this.src_addr = addr;
};

Frame.prototype.setSendSequence = function(n) {
    this.ctrlByte &= ~(0x03 << 1);
    this.ctrlByte |= (n & 0x03) << 1;
};

Frame.prototype.setReceiveSequence = function(n) {
    this.ctrlByte &= ~(0x03 << 5);
    this.ctrlByte |= (n & 0x03) << 5;
};

Frame.prototype.setSyncBit = function(state) {
    if (state) {
        this.ctrlByte |= 0x80;
    } else {
        this.ctrlByte &= ~0x80;
    }
};

Frame.prototype.sendSequence = function() {
    return (this.ctrlByte >> 1) & 0x03;
};

Frame.prototype.hasSourceAddress = function() {
    return (this.ctrlByte & 0x08) === 0x08;
};

Frame.prototype.lastPacket = function() {
    return (this.ctrlByte & 0x10) === 0x10;
};

Frame.prototype.receiveSequence = function() {
    return (this.ctrlByte >> 5) & 0x03;
};

Frame.prototype.syncBit = function() {
    return (this.ctrlByte & 0x80) === 0x80;
};

Frame.prototype.setData = function(data) {
    this.data = data;
    this.dataSize = data.length;
};

Frame.prototype.serialize = function() {
    var data = [];

    data.push(this.start);
    if (this.start === 0xfd) {
        data = data.concat(fromUint32(this.dst_addr));
        data.push(this.ctrlByte); // ctrl byte
        data = data.concat(fromUint32(this.src_addr));
    }

    var frameSize = this.dataSize + 2;
    if (this.start === 0xfe) {
        frameSize += 1;
    }

    data.push(frameSize);

    data = data.concat(this.data);

    var crc16 = new Crc16();
    crc16.update(data);
    crc16.update([0,0]);

    data.push(crc16.crc >> 8 & 0xff);
    data.push(crc16.crc & 0xff);

    return data;
};

/*
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
};

AckFrame.prototype.serialize = function() {
    var data = [];
    data.push(0xfd); // start
    data = data.concat(fromUint32(this.dst_addr));
    data.push(this.binCtrlByte()); // ctrl byte
    data = data.concat(fromUint32(this.src_addr));

    data.push(2);
    
    var crc16 = new Crc16();
    crc16.update(data);
    crc16.update([0,0]);

    data.push(crc16.crc >> 8 & 0xff);
    data.push(crc16.crc & 0xff);

    return data;
};

IFrame.prototype.binCtrlByte = function() {
    return (this.syncBit & 1) << 7 |
           (this.recvSeq & 3) << 5 |
           (this.lastPacket & 1) << 4 |
           (this.hasSrc & 1) << 3 |
           (this.sendSeq & 3) << 1;
};

IFrame.prototype.serialize = function() {
    var data = [];
    data.push(0xfd); // start
    data = data.concat(fromUint32(this.dst_addr));
    data.push(this.binCtrlByte()); // ctrl byte
    data = data.concat(fromUint32(this.src_addr));

    data.push(this.size);
    data = data.concat(this.data);

    var crc16 = new Crc16();
    crc16.update(data);
    crc16.update([0,0]);

    data.push(crc16.crc >> 8 & 0xff);
    data.push(crc16.crc & 0xff);

    return data;
};

IFrame.prototype.handleData = function(data) {
//    console.log("HandleData:"+JSON.stringify(data));
    if (data.type() == FrameType.IFrame)
    {
        // send ACK
        var ack = new AckFrame();
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
};



exports.IFrame = IFrame;
*/
exports.Frame = Frame;
exports.FrameType = FrameType;
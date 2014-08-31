"use strict"

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

exports.Frame = Frame;
exports.IFrame = IFrame;

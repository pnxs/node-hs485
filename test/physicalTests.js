"use strict";
var assert = require("assert");
var physical = require("../lib/physical");
var mock = require("../lib/mock");
var FrameType = require("../lib/frame").FrameType;
var Frame = require("../lib/frame").Frame;

describe("Hs485Pci driver", function() {
    var driver;

    beforeEach(function() {
        driver = new physical.Hs485Pci("dummyDevice", mock.MockSerialPort);
    });

    it("Open event", function(done) {
        driver.on("open", function () {
            done();
        });
        driver.init();
    });

    /*
    it("Receive frame", function(done) {
        driver.serialPort.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
            [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]
        ]);

        driver.on("open", function () {
            driver.sendRaw([0xfe, 0x04, 0x00, 0xae, 0xd0]);
        });

        driver.on("frame", function (frame) {
            assert.equal(frame.start, 0xfe);
            assert.equal(frame.size, 7);
            done();
        });

        driver.init();
    });
    */

    it("Parse short IFrame", function(done) {
        driver.on("open", function () {
            driver.serialPort.emitData([0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]);
        });

        driver.on("frame", function (frame) {
            assert.equal(frame.start, 0xfe);
            assert.equal(frame.dataSize, 5);
            assert.equal(frame.type(), FrameType.Hs485Pci);
            done();
        });

        driver.init();
    });

    it("Parse IFrame", function(done) {
        driver.on("open", function () {
            // recv  fd 00000000 1e  000005e9 04 0100   b0e2  Response
            driver.serialPort.emitData([0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]);
        });

        driver.on("frame", function (frame) {
            assert.equal(frame.start, 0xfd);
            assert.equal(frame.dst_addr, 0);
            assert.equal(frame.src_addr, 0x5e9);
            assert.equal(frame.type(), FrameType.IFrame);
            assert.equal(frame.hasSourceAddress(), true);
            assert.equal(frame.sendSequence(), 3);
            assert.equal(frame.receiveSequence(), 0);
            assert.equal(frame.lastPacket(), true);
            assert.equal(frame.syncBit(), false);
            assert.equal(frame.dataSize, 2);
            done();
        });

        driver.init();
    });

    it("Parse Ack", function(done) {
        driver.on("open", function () {
            // write fd 000005e9 79  00000000 02        70c8  ACK
            driver.serialPort.emitData([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8]);
        });

        driver.on("frame", function (frame) {
            assert.equal(frame.start, 0xfd);
            assert.equal(frame.src_addr, 0);
            assert.equal(frame.dst_addr, 0x5e9);
            assert.equal(frame.type(), FrameType.Ack);
            assert.equal(frame.dataSize, 0);
            done();
        });

        driver.init();
    });


    it('Escape function', function() {
        driver.serialPort.expectWrite([0xf0, 0x00, 0xfc, 0x7d], [
            []
        ]);

        driver.sendRaw([0xf0, 0x00, 0xfd]);

        assert.equal(driver.serialPort.expectedWrites.length, 0);
    });

    it("Send Iframe", function() {
        driver.serialPort.expectWrite([0xfd, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x05, 1,2,3, 9, 60], [
            []
        ]);

        var frame = new Frame();
        frame.setType(FrameType.IFrame);
        frame.setSourceAddress(1);
        frame.setData([1,2,3]);

        driver.init();
        driver.send(frame);

        assert.equal(driver.serialPort.expectedWrites.length, 0);
    });

    /*
    it("Send IFrame", function(done) {
        driver.serialPort.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
            [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]
        ]);

        driver.on("open", function () {
            // write fd 000005e9 79  00000000 02        70c8  ACK
            driver.serialPort.emitData([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8]);
        });

        driver.on("frame", function (frame) {
            assert.equal(frame.start, 0xfd);
            assert.equal(frame.src_addr, 0);
            assert.equal(frame.dst_addr, 0x5e9);
            assert.equal(frame.type(), FrameType.Ack);
            assert.equal(frame.dataSize, 0);
            done();
        });

        driver.init();
    });
    */

});

describe("Hs485 parser", function() {
    it("parse short IFrame", function() {
        var emitterCalled = false;
        var p = physical.parser();

        var sollFrame = {
            start: 254,
            dst_addr: 0,
            ctrlByte: 152,
            src_addr: 0,
            size: 7,
            data: [ 128, 0, 0, 5, 78 ],
            dataSize: 5
        };

        var emitter = {};
        emitter.emit = function(ev, data) {
            assert.deepEqual(data, sollFrame);
            emitterCalled = true;
        };

        var data = [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4E, 0x8d, 0x34];

        p(emitter, data.slice(0, 7));
        p(emitter, data.slice(7));

        assert.equal(emitterCalled, true);
    });

    it("parse IFrame", function() {
        var emitterCalled = false;
        var p = physical.parser();

        var sollFrame = {
            start: 0xfd,
            dst_addr: 0x0e30,
            ctrlByte: 0x98,
            src_addr: 0x00,
            size: 6,
            dataSize: 4,
            data: [ 0x73, 0x00, 0x03, 0x01 ]
        };

        var emitter = {};
        emitter.emit = function(ev, data) {
            assert.deepEqual(data, sollFrame);
            emitterCalled = true;
        };

//            var data = [0xfd, 0x00, 0x00, 0x01, 0xda, 0x1a, 0x00, 0x00, 0x02, 0xde, 0x06, 0x4b, 0x01, 0x00, 0x0c, 0xf9, 0x8e ];
        var data = [0xFD, 0x00, 0x00, 0x0E, 0x30, 0x98, 0x00, 0x00, 0x00, 0x00, 0x06, 0x73, 0x00, 0x03, 0x01, 0x14, 0x86];

        p(emitter, data.slice(0, 7));
        p(emitter, data.slice(7));

        assert.equal(emitterCalled, true);
    });
});

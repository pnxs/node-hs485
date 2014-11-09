"use strict";
var assert = require("assert");
var hs485 = require("../");
var mock = require("../lib/mock");

var Frame = hs485.frame.Frame;
var FrameType = hs485.frame.FrameType;

describe("hs485", function() {

    describe("manager", function() {
        it('discover', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            // expect send fe0400aed0
            manager.serialPort.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
                [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4e, 0x8d, 0x34],
                [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0xe9, 0x5c, 0x6e],
                [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]
            ]);

            // push receive: 
            // fe 00 98 00 07 80 00 00 0c 52 de 3c
            // fe 00 98 00 07 80 00 00 12 0a c1 78
            // fe 00 98 00 07 80 00 00 2a 92 17 2c
            // fe 00 98 00 07 80 00 00 2a 99 a7 3a
            // fe 00 98 00 07 80 ff ff ff ff 4a ee (End of discovery)

            manager.ready = function() {
                manager.discoverModules(function(devList) {
                    assert.deepEqual(devList, [1358,1513]);
                    done();
                    //assert.equal(0, manager.pendingRequest);
                });
            };

            manager.init();

        });

        it('IFrame request with response data', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            // example iframe communication
            //          dstaddr  ctl srcaddr  len data  crc
            // write fd 000005e9 98  00000000 04 5301   1f90  Request
            // recv  fd 00000000 1e  000005e9 04 0100   b0e2  Response
            // write fd 000005e9 79  00000000 02        70c8  ACK

            // expect send fe0400aed0
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x98,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x1f,0x90], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                var req = new Frame();

                req.setDestinationAddress(0x5e9);
                req.setSourceAddress(0);

                req.setSendSequence(0);
                req.setReceiveSequence(0);
                req.setSyncBit(true);

                req.setData([0x53, 0x01]);

                manager.queueRequest(req, function(data) {
                    assert.equal(manager.serialPort.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                });
            };

            manager.init();

        });

        it('IFrame request without response data', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x98,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x1f,0x90], [
                [0xfd,0x00,0x00,0x00,0x00,0x19,0x00,0x00,0x05,0xe9,0x02,0x6d,0x08]
            ]);

            manager.ready = function() {
                var req = new Frame();

                req.setDestinationAddress(0x5e9);
                req.setSourceAddress(0);

                req.setSendSequence(0);
                req.setReceiveSequence(0);
                req.setSyncBit(true);

                req.setData([0x53, 0x01]);

                manager.queueRequest(req, function(data) {
                    assert.equal(manager.serialPort.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                });
            };

            manager.init();

        });

        it('IFrame request with disturbed response data', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x98,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x1f,0x90], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xff], // Bad CRC in first time
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2] // Module will retry because it received no ACK from us
            ]);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                var req = new Frame();

                req.setDestinationAddress(0x5e9);
                req.setSourceAddress(0);

                req.setSendSequence(0);
                req.setReceiveSequence(0);
                req.setSyncBit(true);

                req.setData([0x53, 0x01]);

                manager.queueRequest(req, function(data) {
                    assert.equal(manager.serialPort.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                });
            };

            manager.init();

        });

        it('IFrame request with disturbed request data', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            // This first request is not answered, we simulate a bad transfer from us to the destination module
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x3c,0x9e], [
                []
            ]);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x3c,0x9e], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);


            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                var req = new Frame();

                req.setDestinationAddress(0x5e9);
                req.setSourceAddress(0);

                req.setSendSequence(0);
                req.setReceiveSequence(0);
                req.setSyncBit(false);

                req.setData([0x53, 0x01]);

                manager.queueRequest(req, function(data) {
                    assert.equal(manager.serialPort.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                });
            };

            manager.init();

        });

        it('Two IFrame requests', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x3c,0x9e], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x3c,0x9e], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                var req = new Frame();

                req.setDestinationAddress(0x5e9);
                req.setSourceAddress(0);

                req.setSendSequence(0);
                req.setReceiveSequence(0);
                req.setSyncBit(false);

                req.setData([0x53, 0x01]);

                manager.queueRequest(req, function(data) {
                    //console.log("received first iframe callback");
                });

                manager.queueRequest(req, function(data) {
                    //console.log("received second iframe callback");
                    assert.equal(manager.serialPort.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                });
            };

            manager.init();
        });

        it('GetModuleVersion', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x03,'h',0x54,0x8e], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                manager.getModuleVersion(0x5e9, function(version) {
                    assert.equal(version.hwType, 0x01);
                    assert.equal(version.hwVersion, 0x00);
                    assert.equal(version.hwName, "HS485 S");
                    done();
                });
            };

            manager.init();
        });

        it('GetActorState', function(done) {
            var manager = new hs485.Manager("/dev/ttyS1", mock.MockSerialPort);

            var f = new Frame();
            f.setDestinationAddress(0);
            f.setSourceAddress(0x5e9);
            f.setData([1,1]);
            console.log("Send back:" + f.serialize());

            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x18,0x00,0x00,0x00,0x00,0x04,'S', 1,0xF0,0x52], [
                [253,0,0,0,0,24,0,0,5,233,4,1,1,135,52]
            ]);
            manager.serialPort.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                manager.getActorState(0x5e9, 1, function(actor) {
                    assert.equal(actor.address, 0x5e9);
                    assert.equal(actor.actorNr, 1);
                    assert.equal(actor.state, 1);
                    done();
                });
            };

            manager.init();
        });

    });
});

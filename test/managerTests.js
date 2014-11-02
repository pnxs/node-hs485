"use strict";
var assert = require("assert");
var hs485 = require("../");
//var util = require("util");

describe("hs485", function() {

    describe("manager", function() {
        it('discover', function(done) {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even',
                parser: hs485.parser()
            });

            var manager = new hs485.Manager("/dev/ttyS1", sp);

            // expect send fe0400aed0
            sp.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
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
        it('iframe1', function(done) {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even',
                parser: hs485.parser()
            });

            var manager = new hs485.Manager("/dev/ttyS1", sp);

            // example iframe communication
            //          dstaddr  ctl srcaddr  len data  crc
            // write fd 000005e9 98  00000000 04 5301   1f90  Request
            // recv  fd 00000000 1e  000005e9 04 0100   b0e2  Response
            // write fd 000005e9 79  00000000 02        70c8  ACK

            // expect send fe0400aed0
            sp.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x98,0x00,0x00,0x00,0x00,0x04,0x53,0x01,0x1f,0x90], [
                [0xfd,0x00,0x00,0x00,0x00,0x1e,0x00,0x00,0x05,0xe9,0x04,0x01,0x00,0xb0,0xe2]
            ]);
            
            sp.expectWrite([0xfd,0x00,0x00,0x05,0xe9,0x79,0x00,0x00,0x00,0x00,0x02,0x70,0xc8], [
                []
            ]);

            manager.ready = function() {
                var req = new hs485.frame.IFrame;
                req.start = hs485.protocol.START_LONG;
                req.dst_addr = 0x5e9;
                req.ctrlByte = 0x98;
                req.src_addr = 0;
                req.size = 4;
                req.data = [0x53,0x01];

                req.sendSeq = 0;
                req.recvSeq = 0;
                req.syncBit = 1;
                req.lastPacket = 1;
                req.hasSrc = true;

                req.finished = function() {
                    assert.equal(sp.expectedWrites.length, 0, "Not all expectedWrites where received");
                    done();
                };

                manager.iframeRequest(req);
            };

            manager.init();

        });
    });
});

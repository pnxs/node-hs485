"use strict"
var assert = require("assert");
var hs485 = require("../");
var util = require("util");

describe("hs485", function() {

    describe("manager", function() {
        it('discover', function() {
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
                [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee],
            ]);

            // push receive: 
            // fe 00 98 00 07 80 00 00 0c 52 de 3c
            // fe 00 98 00 07 80 00 00 12 0a c1 78
            // fe 00 98 00 07 80 00 00 2a 92 17 2c
            // fe 00 98 00 07 80 00 00 2a 99 a7 3a
            // fe 00 98 00 07 80 ff ff ff ff 4a ee (End of discovery)

            manager.discoverModules(function(devList) {
                assert.deepEqual(devList, [1358,1513]);
                //assert.equal(0, manager.pendingRequest);
            });


        });
    });
});

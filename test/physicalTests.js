"use strict";
var assert = require("assert");
var hs485 = require("../");
var physical = require("../lib/physical");

describe("Hs485Pci driver", function() {
    it("Open event", function(done) {
        var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
            baudrate: 19200,
            parity: 'even',
            parser: hs485.parser()
        });

        var driver = new physical.Hs485Pci("", sp);

        driver.on("open", function () {
            done();
        });

        driver.init();
    });


    it("Receive frame event", function(done) {
        var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
            baudrate: 19200,
            parity: 'even',
            parser: hs485.parser()
        });

        sp.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
            [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]
        ]);

        var driver = new physical.Hs485Pci("", sp);

        driver.on("open", function () {
            driver.send([0xfe, 0x04, 0x00, 0xae, 0xd0]);
        });

        driver.on("frame", function (frame) {
            done();
        });

        driver.init();
    });
});
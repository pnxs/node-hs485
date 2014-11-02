"use strict";
var assert = require("assert");
var physical = require("../lib/physical");
var mock = require("../lib/mock");

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


    it("Receive frame event", function(done) {
        driver.serialPort.expectWrite([0xfe, 0x04, 0x00, 0xae, 0xd0], [
            [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0xff, 0xff, 0xff, 0xff, 0x4a, 0xee]
        ]);

        driver.on("open", function () {
            driver.sendRaw([0xfe, 0x04, 0x00, 0xae, 0xd0]);
        });

        driver.on("frame", function (frame) {
            done();
        });

        driver.init();
    });
});

"use strict"
var assert = require("assert");
var hs485 = require("../");
var util = require("util");

describe("MockSerialPort", function() {
    describe("Constructor", function() {
        it('SerialPort compablity', function() {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even',
                parser: hs485.parser()
            });

            sp.on("open", function() {
                console.log("openeded");
            });
        });

        it('receive data', function() {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even',
                parser: hs485.parser()
            });

            sp.expectWrite("abce", ['Hallo', 'Welt']);

            sp.on("open", function() {
                console.log("openeded");

                sp.on("data", function(data) {
                    console.log("data received: " + data.length);
                });
                
                sp.write("abce", function(err, results) {
                    console.log("sp write err=" + err + " results " + results);
                });
            });
            
            assert.equal(sp.expectedWrites.length, 0, "Not all expectedWrites where received");
        });
    });
});

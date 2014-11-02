"use strict";
var assert = require("assert");
var hs485 = require("../");
//var util = require("util");

describe("MockSerialPort", function() {
    describe("Constructor", function() {
        it('SerialPort compablity', function() {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even',
                parser: hs485.parser()
            });

            var opened = false;

            sp.on("open", function() {
                opened = true;
            });

            assert.equal(true, opened, "'open' was not called");
        });

        it('receive data', function() {
            var sp = new hs485.mock.MockSerialPort("/dev/ttyS1", {
                baudrate: 19200,
                parity: 'even'
                //parser: hs485.parser()
            });

            sp.expectWrite("abce", [[1,2,3], [4,5,6]]);

            var opened = false;
            var timesDataCalled = 0;
            var writeDone = false;

            sp.on("open", function() {
                opened = true;

                sp.on("data", function(data) {
                    timesDataCalled++;
                });
                
                sp.write("abce", function(err, results) {
                    assert.equal(err, 0);
                    assert.equal(results, 0);
                    writeDone = true;
                });
            });

            assert.equal(opened, true, "open was not called");
            assert.equal(timesDataCalled, 2);
            assert.equal(writeDone, true);
            
            assert.equal(sp.expectedWrites.length, 0, "Not all expectedWrites where received");
        });
    });
});

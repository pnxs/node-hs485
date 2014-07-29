"use strict"
var assert = require("assert");
var hs485 = require("../");
var util = require("util");

describe("Array", function() {
    describe("#indexOf()", function() {
        it('should return -1 when val not present', function() {
            assert.equal(-1, [1,2,3].indexOf(5));
            assert.equal(-1, [1,2,3].indexOf(0));
        });

    });
});

describe("hs485", function() {
    describe("myAdd", function() {
        it('should add a+b', function() {
            assert.equal(hs485.myAdd(1,2), 3);
        });
    });

    describe("Crc16", function() {
        it('test Crc16', function() {
            var c = new hs485.Crc16();

           assert.equal(c.update([0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4E, 0x00, 0x00]), 0x8d34);
           c.init();
           assert.equal(c.update([0xfe, 0x04, 0x01, 0x00, 0x00]), 0xbed2);
        });
    });

    describe("parser", function() {
        it("test parser", function() {
            var emitterCalled = false;
            var p = hs485.parser();
                
            var sollFrame = { 
                start: 254,
                dst_addr: 0,
                ctrlByte: 152,
                src_addr: 0,
                size: 7,
                data: [ 128, 0, 0, 5, 78, 0, 0 ] 
            };

            var emitter = function(data) {
                assert.deepEqual(data, sollFrame);
                emitterCalled = true;
            }

            var data = [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4E, 0x00, 0x00];

            p(emitter, data.slice(0, 7));
            p(emitter, data.slice(7));

            assert.equal(emitterCalled, true);
        });
    });
});

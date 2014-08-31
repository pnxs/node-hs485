"use strict"
var assert = require("assert");
var hs485 = require("../");
var util = require("util");

describe("hs485", function() {
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
                data: [ 128, 0, 0, 5, 78 ] 
            };

            var emitter = function(data) {
                assert.deepEqual(data, sollFrame);
                emitterCalled = true;
            }

            var data = [0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4E, 0x8d, 0x34];

            p(emitter, data.slice(0, 7));
            p(emitter, data.slice(7));

            assert.equal(emitterCalled, true);
        });
        
        it("test parser2", function() {
            var emitterCalled = false;
            var p = hs485.parser();
                
            var sollFrame = { 
                start: 0xfd,
                dst_addr: 0x0e30,
                ctrlByte: 0x98,
                src_addr: 0x00,
                size: 6,
                data: [ 0x73, 0x00, 0x03, 0x01 ] 
            };

            var emitter = function(data) {
                assert.deepEqual(data, sollFrame);
                emitterCalled = true;
            }

//            var data = [0xfd, 0x00, 0x00, 0x01, 0xda, 0x1a, 0x00, 0x00, 0x02, 0xde, 0x06, 0x4b, 0x01, 0x00, 0x0c, 0xf9, 0x8e ];
            var data = [0xFD, 0x00, 0x00, 0x0E, 0x30, 0x98, 0x00, 0x00, 0x00, 0x00, 0x06, 0x73, 0x00, 0x03, 0x01, 0x14, 0x86];

            p(emitter, data.slice(0, 7));
            p(emitter, data.slice(7));

            assert.equal(emitterCalled, true);
        });
    });
});

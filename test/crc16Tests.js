"use strict";
var assert = require("assert");

var Crc16 = require("../lib/crc16");

describe("Crc16", function() {
    it('test Crc16', function() {
        var c = new Crc16();

        assert.equal(c.update([0xfe, 0x00, 0x98, 0x00, 0x07, 0x80, 0x00, 0x00, 0x05, 0x4E, 0x00, 0x00]), 0x8d34);
        c.init();
        assert.equal(c.update([0xfe, 0x04, 0x01, 0x00, 0x00]), 0xbed2);
    });
});
"use strict";
var assert = require("assert");
var frame = require("../lib/frame");
var FrameType = frame.FrameType;
var Frame = frame.Frame;

describe("Frame", function() {
    it("Serialize IFrame", function() {
        var f = new Frame();
        f.setType(FrameType.IFrame);
        f.setSourceAddress(1);

        var data = f.serialize();

        assert.deepEqual(data, [0xfd, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x02, 149, 222]);
    });

    it("Serialize IFrame with Data", function() {
        var f = new Frame();
        f.setType(FrameType.IFrame);
        f.setSourceAddress(1);
        f.setData([1,2,3]);

        var data = f.serialize();

        assert.deepEqual(data, [0xfd, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00, 0x00, 0x00, 0x01, 0x05, 1,2,3, 9, 60]);
    });
});
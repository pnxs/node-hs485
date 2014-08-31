"use strict"

function decodeFrame(frame) {

    if (frame.ctrlByte & 1 == 0) {
        // IFrame
        console.log("IFrame");
    } else if (frame.ctrlByte & 3 == 1) {
        // ACK
        console.log("ACK");
    } else if (frame.ctrlByte & 7 == 3) {
        // Discovery
        console.log("Discovery");
    }

}

function escapeFrame(data) {
    var len = data.length;
    var result = []

    for (var i = 0; i < len; i++) {
        var d = data[i];
        if (d == 0xfd || d == 0xfe || d == 0xfc) {
            result.push(0xfc, d & 0x7f);
        } else {
            result.push(d);
        }
    }

    return result;
}

exports.escapeFrame = escapeFrame;

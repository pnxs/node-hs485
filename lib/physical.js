"use strict"

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

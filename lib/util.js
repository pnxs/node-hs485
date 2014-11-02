"use strict";

function toUint32(a)
{
    var r = a[0] << 24;
    r |= a[1] << 16;
    r |= a[2] << 8;
    r |= a[3];
    return r;
}

function fromUint32(v)
{
    return [
        (v >> 24) & 0xff,
        (v >> 16) & 0xff,
        (v >> 8) & 0xff,
        v & 0xff
    ];
}

exports.toUint32 = toUint32;
exports.fromUint32 = fromUint32;

"use strict";

function Crc16() {
    this.crc = 0xffff;
}

Crc16.prototype.init = function() {
    this.crc = 0xffff;
};

Crc16.prototype.update = function (data) {
    var len = data.length;

    for (var i = 0; i < len; i++) {
        var ch = data[i];
        for(var bit = 0; bit < 8; bit++) {
            var flag = (this.crc & 0x8000) !== 0;
            this.crc <<= 1;
            if (ch & 0x80) {
                this.crc |= 1;
            }
            ch <<= 1;
            if (flag) {
                this.crc ^= 0x1002;
            }
        }
        this.crc &= 0xffff;
    }

    return this.crc;
};

Crc16.prototype.getHiLo = function() {
    return [(this.crc >> 8) & 0xff, this.crc & 0xff];
};
    
module.exports = Crc16;

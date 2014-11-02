"use strict";
var assert = require("assert");

function MockSerialPort(device, attrs) {
    this.device = device;
    this.attrs = attrs;

    this.expectedWrites = [];

    this.dataHandler = [];
}

MockSerialPort.prototype.expectWrite = function(data, returns) {
    this.expectedWrites.push({data: data, returns: returns});
    //console.log("MockSerialPort add expected write of " + data);
};

MockSerialPort.prototype.on = function(event, func) {
    //console.log("MockSerialPort on " + event);

    if (event === "open") {
        func();
    }

    if (event === "data") {
        this.dataHandler.push(func);
    }
};

MockSerialPort.prototype.emit = function(event, data) {
    if (event === "data") {
        this.dataHandler[0](data);
    }
};

MockSerialPort.prototype.write = function(data, func) {
    var self = this;
    //console.log("MockSerialPort write: " + data);
    //console.log("length: " + this.expectedWrites.length);

    if (this.expectedWrites.length === 0) {
        throw new assert.fail("no write expected");
    }

    if (JSON.stringify(data) === JSON.stringify(this.expectedWrites[0].data)) {
        func(0, 0);

        var returns = this.expectedWrites[0].returns;
        self.expectedWrites = self.expectedWrites.splice(1);

        var parser = this.attrs.parser;
        if (parser !== undefined) {
            returns.forEach(function(ret) {
                parser(self, ret);
            });
        } else {
            returns.forEach(function(ret) {
                self.dataHandler.forEach(function(dh) {
                    dh(ret);
                });
            });
        }
    }
};

exports.MockSerialPort = MockSerialPort;

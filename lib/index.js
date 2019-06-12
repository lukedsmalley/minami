"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var docopt_1 = require("docopt");
var create_1 = require("./create");
var doc = "\nMinami 1.0\n\nUsage: minami (-h | --help | --version)\n       minami create\n";
var args = docopt_1.docopt(doc, { version: 'Minami 1.0' });
var handlers = {
    create: create_1.create
};
handlers[Object.keys(handlers).filter(function (handler) { return args[handler]; })[0]]()
    .catch(function (err) { return console.log("Operation failed due to " + err + "\n" + err.stack); });

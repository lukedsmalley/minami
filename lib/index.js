"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var docopt_1 = require("docopt");
var create_1 = require("./create");
var doc = "\nMinami 1.0\n\nUsage: minami create <path>\n\nOptions:\n  -h --help      Print usage information\n  -v --version   Print application version\n";
var args = docopt_1.docopt(doc, { version: 'Minami 1.0' });
var awaitable = Promise.resolve();
if (args.create) {
    awaitable = create_1.create(args['<path>']);
}
else {
    console.log(doc);
}
awaitable.catch(function (err) { return console.log("Operation failed due to " + err + "\n" + err.stack); });

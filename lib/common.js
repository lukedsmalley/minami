"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
function exec() {
    var params = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        params[_i] = arguments[_i];
    }
    var path;
    var args = [];
    var env = {};
    for (var _a = 0, params_1 = params; _a < params_1.length; _a++) {
        var param = params_1[_a];
        if (param instanceof Array)
            args.push.apply(args, param.map(function (p) { return p.toString; }));
        else if (typeof param === 'object')
            Object.assign(env, param);
        else
            args.push(param.toString());
    }
    if (args.length < 1)
        throw 1;
    path = args.shift();
    return new Promise(function (resolve, reject) {
        var subprocess = child_process_1.spawn(path, args, { env: Object.assign({}, process.env, env) });
        var stdoutBuffer;
        var stderrBuffer;
        subprocess.once('close', function (code) {
        });
    });
}
exports.exec = exec;

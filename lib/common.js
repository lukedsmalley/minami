"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var chalk_1 = __importDefault(require("chalk"));
function $() {
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
        console.log(chalk_1.default.gray([path].concat(args).join(' ')));
        var subprocess = child_process_1.spawn(path, args, { env: Object.assign({}, process.env, env) });
        var output = '';
        subprocess.stdout.on('data', function (data) {
            output += data;
            process.stdout.write(data);
        });
        subprocess.stderr.on('data', function (data) {
            output += data;
            process.stderr.write(data);
        });
        subprocess.once('close', function (code) {
            if (code !== 0) {
                reject(code);
            }
            else {
                resolve(output);
            }
        });
    });
}
exports.$ = $;

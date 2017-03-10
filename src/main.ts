import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';
import * as minimist from 'minimist';
import * as parseurl from 'parseurl';
import * as express from 'express';
import * as cors from 'cors';
import * as compression from 'compression';
import * as responseTime from 'response-time';
import * as serveFavicon from 'serve-favicon';
import log from './log';
import ls from './ls';
const death = require('death');

const parameters = minimist(process.argv.slice(2), {
    "default": {
        port: '[[PORT]]',
        root: '.',
    }
});

if (parameters["h"] == true || parameters["help"] == true)
{
    let command = 'Usage: node "' + path.basename(__filename) + '" [options]\n\n';
    command += 'Options:\n';
    command += '  --port number       set server port, default is [[PORT]]\n';
    command += '  --root path         set file system root directory, default is \'.\'\n';
    command += '  -h, --help          print this usage';
    console.log(command);
}
else
{
    let corsopt = {maxAge: 900, optionsSuccessStatus: 200};
    let route = express();
    route.disable("x-powered-by");
    route.set('etag', false);
    route.options('*', cors(corsopt));
    route.use(cors(corsopt));
    route.use(responseTime());
    route.use(function(req, res, next)
    {
        let realip = req.headers["X-Real-IP"];
        if (realip)
            req.ip = realip;
        next();
    });
    route.use(function(req, res, next)
    {
        let url = parseurl(req);
        if (url != undefined && url.pathname != undefined)
            log.trace(decodeURIComponent(url.pathname));
        next();
    });
    let favicon = path.resolve(parameters.root, "favicon.ico");
    let hasfavicon = fs.existsSync(favicon);
    if (hasfavicon)
        route.use(serveFavicon(favicon));
    route.use(compression());
    route.use(ls(parameters.root));
    route.use(express.static(parameters.root, {etag: false, dotfiles: "allow", index: false}));
    route.use(function(req, res)
    {
        res.sendStatus(404);
    });

    let server = http.createServer(route);
    death({uncaughtException: true})(function(signal: string, err: any)
    {
        if (err)
            log.error(err);
        let finish = async function()
        {
            console.log("Stopped '" + signal + "' ...");
            server.close();
            process.exit();
        };
        log.flush().then(finish, finish);
    });
    server.listen(parameters.port, async function()
    {
        console.log("Listening on " + parameters.port);
    });
}
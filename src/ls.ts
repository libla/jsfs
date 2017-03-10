import * as path from 'path';
import * as fs from 'fs';
import * as parseurl from 'parseurl';
import * as escape from 'escape-html';
import * as express from 'express';

function ls(root: string, options?: ls.Options)
{
    root = path.resolve(root) + path.sep;
    let favicon = false;
    if (options != undefined && options.favicon != undefined)
        favicon = options.favicon;
    else
        favicon = fs.existsSync(path.join(root, "favicon.ico"));
    return function(req: express.Request, res: express.Response, next: express.NextFunction)
    {
        if (req.method !== 'GET' && req.method !== 'HEAD')
        {
            res.setHeader('Allow', 'GET, HEAD');
            return res.sendStatus(405);
        }
        let url = parseurl(req);
        if (url != undefined && url.pathname != undefined)
        {
            let pathname = decodeURIComponent(url.pathname);
            if (pathname[pathname.length - 1] == '/' && !path.isAbsolute(pathname.substring(1)))
            {
                let rootpath = path.join(root, pathname);
                if (rootpath.substring(0, root.length) == root)
                {
                    return fs.stat(rootpath, function(error, stat)
                    {
                        if (!error && stat.isDirectory())
                        {
                            return fs.readdir(rootpath, function(error, files)
                            {
                                let filenames = new Array<{name: string; size?: number}>();
                                let count = files.length;
                                let finish = () =>
                                {
                                    if (pathname != '/')
                                        filenames.unshift({name: ".."});
                                    let html = "<!DOCTYPE html>";
                                    html += '<html>';
                                    html += '<head>';
                                    html += '<meta charset="utf-8">';
                                    if (favicon)
                                    {
                                        html += '<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />';
                                        html += '<link rel="icon" type="image/x-icon" href="/favicon.ico" />';
                                    }
                                    html += '<title>';
                                    html += pathname;
                                    html += '</title>';
                                    html += '<style type="text/css">';
                                    html += '.path {float:left}';
                                    html += '.size {float:right}';
                                    html += '</style>';
                                    html += '</head>';
                                    html += '<body>';
                                    html += '<h1 style="text-align:center">';
                                    html += pathname;
                                    html += '</h1>';
                                    html += '<hr />';
                                    html += '<div style="margin:0 auto; min-width:400px; max-width:800px; width:60%">';
                                    html += '<ul>';
                                    for (let i = 0, j = filenames.length; i < j; ++i)
                                    {
                                        html += '<li>';
                                        html += '<a href="';
                                        html += escape(path.normalize(pathname + filenames[i].name).split(path.sep).join('/'));
                                        html += '"';
                                        if (filenames[i].size != undefined)
                                        {
                                            html += ' target="_blank" download="';
                                            html += filenames[i].name;
                                            html += '"';
                                        }
                                        html += '>';
                                        html += '<span class="path">';
                                        html += filenames[i].name;
                                        html += '</span>';
                                        html += '</a>';
                                        let size = filenames[i].size;
                                        if (size != undefined)
                                        {
                                            html += '<span class="size">';
                                            let text = "";
                                            while (true)
                                            {
                                                let mod: number = size % 1000;
                                                if (mod == size)
                                                {
                                                    text = mod + text;
                                                    break;
                                                }
                                                if (mod >= 100)
                                                    text = mod + text;
                                                else if (mod >= 10)
                                                    text = "0" + mod + text;
                                                else
                                                    text = "00" + mod + text;
                                                size = (size - mod) / 1000;
                                                text = "," + text;
                                            }
                                            html += text;
                                            html += '</span>';
                                        }
                                        html += '</li>';
                                    }
                                    html += '</ul>';
                                    html += '</div>';
                                    html += '</body>';
                                    html += '</html>';
                                    res.send(html);
                                };
                                if (count == 0)
                                    return finish();
                                for (let i = 0; i < count; ++i)
                                {
                                    fs.stat(path.join(rootpath, files[i]), function(error, stat)
                                    {
                                        if (!error)
                                            filenames.push(stat.isDirectory() ? {name: files[i] + '/'} : {name: files[i], size: stat.size});
                                        if (--count == 0)
                                        {
                                            filenames.sort(function(a, b)
                                            {
                                                if (a.size == undefined)
                                                {
                                                    if (b.size != undefined)
                                                        return -1;
                                                }
                                                else
                                                {
                                                    if (b.size == undefined)
                                                        return 1;
                                                }
                                                return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
                                            });
                                            finish();
                                        }
                                    });
                                }
                            });
                        }
                        next();
                    });
                }
            }
        }
        next();
    }
}

module ls
{
    export interface Options
    {
        favicon?: boolean;
        [name: string]: any;
    }
}

export default ls;
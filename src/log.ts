module log
{
    let Exception = Error;
    let immediately = new Promise<void>(resolve => resolve());

    export enum Level
    {
        Debug,
        Trace,
        Warning,
    }

    export interface Handler
    {
        text: (level: Level, fmt: string, text: string) => void;
        error: (fmt: string, error: Error) => void;
        flush: () => Promise<void>;

        [others: string]: any;
    }

    export let isDebug: boolean = true;

    class DefaultHandler implements Handler
    {
        text(level: Level, fmt: string, text: string)
        {
            if (level == Level.Warning)
                console.warn(fmt + text);
            else
                console.log(fmt + text);
        }

        error(fmt: string, error: Error)
        {
            console.error(fmt + error.stack);
        }

        flush()
        {
            return immediately;
        }
    }

    let handler: Handler | undefined = new DefaultHandler();
    export function set(): void
    export function set(handler: Handler): void
    export function set(text: (level: Level, text: string) => void, error: (error: Error) => void, bind?: any): void
    export function set(a?: any, b?: any, bind?: any)
    {
        if (b == undefined)
        {
            handler = a;
        }
        else
        {
            if (bind == undefined)
                handler = {text: a, error: b, flush: () => immediately};
            else
                handler = {text: (level, text) => a.call(bind, level, text), error: error => b.call(bind, error), flush: () => immediately};
        }
    }

    export function error(text: string): void
    export function error(error: Error): void
    export function error(x: any): void
    {
        if (handler != undefined)
        {
            let e = typeof x == "string" ? new Exception(x) : (x instanceof Exception ? x as Error : undefined);
            if (e != undefined)
                handler.error(GetLogFormat(), e);
        }
    }

    export function warning(text: string)
    {
        Write(Level.Warning, text);
    }

    export function trace(text: string)
    {
        Write(Level.Trace, text);
    }

    export function debug(text: string)
    {
        if (isDebug)
            Write(Level.Debug, text);
    }

    export function flush()
    {
        if (handler != undefined)
            return handler.flush();
        return immediately;
    }

    function Write(level: Level, text: string)
    {
        if (handler != undefined)
        {
            try
            {
                handler.text(level, GetLogFormat(), text);
            }
            catch (e)
            {
                error(e);
            }
        }
    }

    function AddWidthInt(width: number, value: number, fill: string = "0")
    {
        let measure = 10;
        let digit = 1;
        while (value >= measure)
        {
            measure *= 10;
            ++digit;
        }
        let s = "";
        for (let i = digit; i < width; ++i)
            s += fill;
        s += value.toString();
        return s;
    }

    let builder: Array<string>;
    function GetLogFormat()
    {
        let date = new Date();
        if (builder)
        {
            builder[1] = AddWidthInt(4, date.getFullYear());
            builder[3] = AddWidthInt(2, date.getMonth());
            builder[5] = AddWidthInt(2, date.getDay());
            builder[7] = AddWidthInt(2, date.getHours());
            builder[9] = AddWidthInt(2, date.getMinutes());
            builder[11] = AddWidthInt(2, date.getSeconds());
            builder[13] = AddWidthInt(3, date.getMilliseconds());
        }
        else
        {
            builder = new Array<string>();
            builder.push('[');
            builder.push(AddWidthInt(4, date.getFullYear()));
            builder.push('-');
            builder.push(AddWidthInt(2, date.getMonth()));
            builder.push('-');
            builder.push(AddWidthInt(2, date.getDay()));
            builder.push(' ');
            builder.push(AddWidthInt(2, date.getHours()));
            builder.push(':');
            builder.push(AddWidthInt(2, date.getMinutes()));
            builder.push(':');
            builder.push(AddWidthInt(2, date.getSeconds()));
            builder.push('.');
            builder.push(AddWidthInt(3, date.getMilliseconds()));
            builder.push(']');
        }
        return builder.join("");
    }
}

export default log;
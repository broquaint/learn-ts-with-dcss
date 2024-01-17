import { Application, Context, Status } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const app = new Application();
app.use(async(ctx: Context) => {
    // Reading it every time isn't optimal but that isn't germane to our purposes.
    const logfile = await Deno.readFile("./webzook-0.30.logfile");;
    if(ctx.request.headers.has('range')) {
        // Ok range could be garbage but this isn't exposed to The Internet.
        const [_, fromStr, toStr] = ctx.request.headers.get('range')!.match(/\w+=(\d+)-(\d+)/)!
        const [from, to] = [Math.max(0, Number(fromStr)), Math.min(logfile.length, Number(toStr))]
        ctx.response.body = logfile.slice(from, to)
        ctx.response.status = Status.PartialContent
    }
    else {
        ctx.response.body = logfile
    }
});

await app.listen({ port: 8008 });

import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const app = new Application();
app.use(async(ctx) => {
    // Reading it every time isn't optimal but that isn't germane to our purposes.
    const logfile = await Deno.readFile("./webzook-0.30.logfile");
    ctx.response.body = logfile;
});

await app.listen({ port: 8008 });
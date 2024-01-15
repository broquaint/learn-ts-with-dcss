import { Application, Status } from "https://deno.land/x/oak@v12.6.1/mod.ts";

function winsFromLogfile(logfileString: string) {
  return logfileString.split(/\n/)
    .map(logline => {
      return logline.split(/\b:\b/).reduce((acc, s) => {
        const p = s.split(/\b=\b/);
        return {...acc, [p[0]]: p[1]};
      }, {})
    })
    .filter(game => game.tmsg.startsWith('escaped with the Orb'))
    .slice(0, 3)
}

const app = new Application();

app.use(async (ctx) => {
  try {
    const response = await fetch('http://localhost:8008/');
    const logfileString = await response.text();
    const recentWins = winsFromLogfile(logfileString);
    ctx.response.body = recentWins;
  }
  catch {
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = `Failed to fetch logfiles, come back later.`;
  }
});

await app.listen({ port: 8000 });

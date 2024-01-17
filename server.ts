import { Application, Status } from "https://deno.land/x/oak@v12.6.1/mod.ts";

type LogGame = { tmsg: string }

async function fetchLogLength(url: string) : Promise<number> {
  const response = await fetch(url, {method: 'HEAD'})
  return Number(response.headers.get('content-length'))
}

function makeKey(url: string) {
  return ['logfile', url]
}

async function recordOffset(url: string, offset: number) : Promise<number> {
  await kv.set(makeKey(url), offset)
  return offset
}

async function fetchPos(url: string) : Promise<number> {
  const key = makeKey(url)
  const result = await kv.get(key)
  if(result.value !== null) {
    return Number(result.value);
  }
  else {
    // Grab 10~ games if we don't have an existing offset.
    const logLength = await fetchLogLength(url)
    const offset = Number(logLength) - 8192
    return offset;
  }
}

async function fetchTailData(logfileUrl: string, offset: number) : Promise<string> {
  const logLength = await fetchLogLength(logfileUrl)
  // Maybe wants to be a sum type or some such?
  if(offset === logLength)
    return ''
  const response = await fetch(logfileUrl, { headers: { Range: `bytes=${offset}-${logLength}`}});
  await recordOffset(logfileUrl, logLength)
  return await response.text()
}

function processTailData(tailData: string) : LogGame[] {
  const lines = tailData.split(/\n/)
  // If the first line isn't valid (e.g the initial fetch) drop it.
  if(!lines[0].match(/^v=0[.]\d\d[.-]/))
    lines.shift()
  // The logs always end in a newline so the final element will be an empty string.
  if(lines.length > 0 && lines[lines.length - 1] === '')
    lines.pop()
 
  return lines.map(logline => {
    return logline.split(/\b:\b/).reduce((acc, s) => {
      const p = s.split(/\b=\b/);
      return {...acc, [p[0]]: p[1]};
    }, {tmsg: ''});
  })
}

function filterWinningGames(games: LogGame[]) : LogGame[] {
  return games.filter(game => game.tmsg.startsWith('escaped with the Orb'))
}

// Globals—gotta love 'em!
const app = new Application();
const kv  = await Deno.openKv();

app.use(async (ctx) => {
  try {
    const logfileUrl = 'http://localhost:8008/';
    const pos = await fetchPos(logfileUrl);
    const tailData = await fetchTailData(logfileUrl, pos)
    if(tailData === '') {
      ctx.response.body = []
    }
    else {
      const recentGames = processTailData(tailData)
      const winningGames = filterWinningGames(recentGames)
  
      ctx.response.body = winningGames;
    }
  }
  catch (err) {
    console.error('Request context was: ', ctx)
    console.error('Oh dear, there was a problem: ', err)
    ctx.response.status = Status.InternalServerError;
    ctx.response.body = `Failed to fetch logfiles, come back later.`;
  }
});

await app.listen({ port: 8000 }); 

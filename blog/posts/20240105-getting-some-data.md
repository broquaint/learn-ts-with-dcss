# Recap

This is part 2 in a series on learning things and writing about the
experience. Today will, probably, cover TypeScript, Deno and their
attendant ecosystems.

# Data from data place

What we need now are two things: a server where the raw data (DCSS
logfiles) and a server that exposes the wins from those logs. The
former already exists but instead of hitting live systems while we
build this thing let's not abuse the kindness of those hosts and, as
ever, keep testing self–contained.

Firstly it seems my naive approach to the Deno standard library,
treating it like a fancy `node`, was flawed and there are in fact
[sensible ways][] of reading files. Phew!

```
ctx.response.body = await Deno.readFile("./webzook-0.30.logfile");
```

That's the crux of the test server for now.

Next we need to fetch that data ... and then keep track of it. The
latter is where the complexity will _actually_ lie but it's mostly
making some sensible decisions up front and then kicking the tires of
those assumptions once things are running.

Let's put that aside for just a moment and get the data fetching
setup. This is pleasantly straightforward:

```
function winsFromLogfile(logfileString: string) : object {
  return { todo: 'actual data' };
}

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
```

Arguably it does a little more than is strictly necessary at this
point but I've found that a little error handling early on can save
some hair pulling later on. And, lucklily for me, that worked off the
bat (it's that TypeScript productivity boost and definitely not
decades of experience!):

```
$ curl http://localhost:8000/
{"todo":"actual data"}
# And with the logfile data server disabled'
$ curl http://localhost:8000/
Failed to fetch logfiles, come back later.
```

[sensible ways]: https://docs.deno.com/deploy/api/runtime-fs#denoreadfile

# That type of thing

Now we just write some code to take the well structured text and turn
it into some well structured objects, something like this should be fine:

```typescript
function winsFromLogfile(logfileString: string) {
  return logfileString.split(/\n/)
    .map(logline => {
      return logline.split(/\b:\b/).reduce((acc, s) => {
        const p = s.split(/\b=\b/);
        return {...acc, [p[0]]: p[1]};
      }, {})
    })
    .filter(game => game.tmsg..startsWith('escaped with the Orb'))
    .slice(0, 3)
}
```

It was not fine, dear reader—the red squiggles have found me out for the filthy JavaScript
heathen that I am:

```
Element implicitly has an 'any' type because expression of type '"tmsg"' can't be used to index type '{}'.
  Property 'tmsg' does not exist on type '{}'.deno-ts(7053)
```

And so it begins! My experience with types in other languages
suggests that TypeScript doesn't know what to make of `game` in the
`filter` call, specifically accessing the `tmsg` of an object that the
type checker only knows to be empty.
I think in your Javas and Rusts the fact that we're
only dealing with strings would mean the parametric method signatures
would keep the type info flowing, but not here. Also this is my first
encounter with [object types][] which appear to be a progressive way
of typing the otherwise open objects of JavaScript.

Given we are only interested in a single property of the object we can
define a type:

```typescript
type LogGame = { tmsg: string }
```

Then provide the relevant type hints in the code like so:

```typescript
function winsFromLogfile(logfileString: string) : LogGame[] {
  return logfileString.split(/\n/)
    .map(logline => {
      return logline.split(/\b:\b/).reduce((acc, s) => {
        const p = s.split(/\b=\b/);
        return ({...acc, [p[0]]: p[1]});
      }, {tmsg: ''});
    })
    .filter(game => game.tmsg.startsWith('escaped with the Orb'))
    .slice(0, 3)
}
```

Cool! We don't even need to provide any explicit type hints—TypeScript
is clever enough to infer that we have a `LogGame` object in the
control flow _purely_ from the presence of the `{tmsg: ''}` in the
seed argument of `reduce` ([its signature][]).

[object types]: https://www.typescriptlang.org/docs/handbook/2/objects.html
[its signature]: https://github.com/microsoft/TypeScript/blob/f97c3fd3771d0459b59b954747f284821d1be492/src/lib/es5.d.ts#L1253

# Double take single type

Actually, squinting at that error message again:

<pre>
Element implicitly has an 'any' type because expression of <em>type '"tmsg"'</em> can't be used to <em>index type '{}'</em>.
  Property <em>'tmsg'</em> does not exist on <em>type '{}'.deno-ts(7053)</em>
</pre>

The pennies are being to drop—the _lookup_ being done in the `filter`
is on an [index type][] (aka _Indexed Access Type_) and the error
relates to the bare object being based into `reduce` so we don't need
an object type, we just need to give TypeScript enough information to
access `tmsg` at the appropriate point.

Let's try that code one more time:
```typescript
function winsFromLogfile(logfileString: string) {
  return logfileString.split(/\n/)
    .map(logline => {
      return logline.split(/\b:\b/).reduce((acc, s) => {
        const p = s.split(/\b=\b/);
        return {...acc, [p[0]]: p[1]};
      }, {tmsg: ''});
    })
    .filter(game => game.tmsg.startsWith('escaped with the Orb'))
    .slice(0, 3)
}

```

So in fact the original JavaScript–naive code was 7 characters shy of
being correct:
```diff
-      }, {})
+      }, {tmsg: ''});
```

And there ends my first encounter with TypeScripts fabled type
checker. It has earned my respect and trust.

[index type]: https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html

# Here, have a byte

With that functionality code now in place let's see the data!

```
§ curl -s http://localhost:8000/ | jq .
[
  {
    "tmsg": "escaped with the Orb",
    "v": "0.30-b1",
    "vlong": "0.30-b1-7-gcb88a99046",
    "lv": "0.1",
    "vsavrv": "Git::0.30-b1-7-gcb88a99046",
    "vsav": "34.253",
    "tiles": "1",
    "name": "Coo1",
    ...
```

We have winning games! Let's condense that a bit and pick out a couple
of fields:
```
§ curl -s http://localhost:8000/ | jq '.[] | [.name,.char,.tmsg]'
[
  "Coo1",
  "MiFi",
  "escaped with the Orb"
]
[
  "Coo1",
  "AtDe",
  "escaped with the Orb"
]
[
  "LifeFF",
  "FoFi",
  "escaped with the Orb"
]
```

We can see 3 wins, as expected, where `Coo1` had a win with a
[Minotaur][] [Fighter][] then an [Armataur][] [Delver][] and `LifeFF`
won with a [Formicid][] Fighter. Well done those players!

The easy part is now done, now for the more interesting part—following
the logfile, a la [tail -f][], so we can extract _recent_ wins. What
does it mean to "follow" the Resource of a Uniform **Resource**
Locator? Much like `tail -f` we're interested in the end of that
resource, specifcally we want the N most recent games. But given there
isn't (yet) a way to make such a request we turn to our old friend
"heuristics"!

What we can do is look at some logfile data, calculate some basic
numbers and then see if we can find a sensible number.

<pre>
§ perl -MList::Util=max,min,sum -nE 'push @r, length($_) } { say sprintf "Avg line length %.2f, min %d, max %d, total %d", sum(@r)/@r, min(@r), max(@r), scalar @r' cao-logfile29
Avg line length <strong>605.88</strong>, min <strong>440</strong>, max <strong>1443</strong>, total 132626
</pre>

So on a reasonable data set, the games played on the CAO server on
version 0.29 of DCSS the average line length was **605.88** but the
maximum was **1443**. As we're just building a tool for learning
purposes I think finger in the air estimate of `1024` characters (aka bytes\*) per
game should be fine. Now we can request the last 8 games by simply
requesting 8 kilobytes of data (for which there are likely to be
various sympathies in the various systems we interact with) and we'll
be somewhere in the right ball park:

```
§ tail -c $((1024 * 8)) cao-logfile29 | wc -l
      14
```

Ok, that's 6 more than we need, but what's a few bytes between friends?

\* I know these aren't equivalent but it will suffice for our purposes.

[Minotaur]: http://crawl.chaosforge.org/Minotaur
[Fighter]: http://crawl.chaosforge.org/Fighter
[Armataur]: http://crawl.chaosforge.org/Armataur
[Delver]: http://crawl.chaosforge.org/Delver
[Formicid]: http://crawl.chaosforge.org/Formicid
[tail -f]: https://man7.org/linux/man-pages/man1/tail.1.html

# Keeping up with the values

With all that in mind we can now implement the actual tailing on the
logfile and producing any winning games. Having [done this before][] I
know that we can request an arbitrary chunk of data from a resource by
using the [Range][] header. The implementation of this on the
`logfile-server.ts` is quite straightforward:

```typescript
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
```

Again all very much like plain ol' JavaScript but we have the "I
promise it's not null" operator `!` (not unlike the [bang-bang][] operator
in Kotlin) for methods that return nullable values. In this case it's
fine to have an unhandled runtime error as this service is only for
testing the _other_ service. If it had any more responsibility then it
would warrant more delicate handling of `null`s.

Now we can fetch a chunk of data, that `1024 * 8` aka `8192` bytes,
from the server like so:

```
LOG_LENGTH="$(curl -s -I http://localhost:8008/ | perl -ne print $1 if /content-length: (\d+)/')"
curl -s -H "Range: bytes=$(($LOG_LENGTH - 8192))-$LOG_LENGTH" http://localhost:8008/ | wc -l
      14
```

It does require the extra hoop jump of getting the size of the logfile
and lucky for us [oak][] supports `HEAD` requests out of the
box.

To keep apply some brevity to this post I've gone and
[implemented the tailing][] so I'll just call out the interesting
parts then wrap up.

Firstly the `LogGame` type is reinstated as we need to operate on the
same object type in multiple places i.e

```typescript
type LogGame = { tmsg: string }

function processTailData(tailData: string) : LogGame[] {
    /* Largely the same as winsFromLogfile from above */
}

function filterWinningGames(games: LogGame[]) : LogGame[] {
  return games.filter(game => game.tmsg.startsWith('escaped with the Orb'))
}
```

The type parameterised `Promise` is needed for the `async` functions
(rather like `Result<T, E>` is needed for functions returning
[recoverable errors][]):

```typescript
async function fetchLogLength(url: string) : Promise<number> {
  const response = await fetch(url, {method: 'HEAD'})
  return Number(response.headers.get('content-length'))
}
```

That's about it really! The only other fun new thing is the use of
[Deno KV][] for keeping track of state. But because we're using it like
the glorified SQLite DB it is under the hood (for local usage) it's
not worth covering here, looking at the code is left as an exercise to
the reader.

# Wrap up

Now we have something that can follower the tail of a single DCSS
logfile and produced any winning games, as JSON, that have been added
to it. That's nice!

```
§ curl -s http://localhost:8000/ | jq '.[] | [.name,.char,.tmsg]'
[
  "Tulse",
  "FeSu",
  "escaped with the Orb"
]
[
  "meamsosmart",
  "PaFi",
  "escaped with the Orb"
]
[
  "Tulse",
  "FeSu",
  "escaped with the Orb"
]
```

And indeed won two games with a pair of Felid Summoners, once with
[Jivya][] and another with [Gozag][]!

[done this before]: https://github.com/broquaint/net-http-follow_tail/blob/master/lib/net/http/follow_tail.rb#L69-L74
[Range]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
[bang-bang]: https://kotlinlang.org/docs/null-safety.html#the-operator
[oak]: https://oakserver.github.io/oak/
[implemented the tailing]: https://github.com/broquaint/learn-ts-with-dcss/commit/5ea25c6d1ce1126909bc1d3b6b2d1ab8c0c37b47#diff-1ba718c1eb8aa39cd20c2562d92523068c734d75f54655e97d652b992d9b4259R3
[Deno KV]: https://docs.deno.com/kv/manual
[Jivya]: http://crawl.akrasiac.org/rawdata/Tulse/morgue-Tulse-20231129-160240.txt
[Gozag]: http://crawl.akrasiac.org/rawdata/Tulse/morgue-Tulse-20240111-122448.txt

# Intro

When trying to learn something new often the hardest problem to solve
is finding the right questions to ask. Here I sit wanting to create a
simple web server in TypeScript, in order to have some experience with
the language, and I'm stumbling at the first hurdle—where do I
start?

Having committed to using Deno, as it supports TypeScript and
wanting to use it since it was first announced, I'm faced with the
question of which libraries to use. Do I use a TypeScript first
library? An existing established JavaScript library and pray for
straightforward interoperability? I could roll my own but now I'm
solving an already well solved problem and not starting at the one to
hand. Instead of equivovating—let's jump in!

# The options

First up I begin with searching for "deno web server" and find that I
have the following URL in my history as suggested by Firefox:

  https://deno.com/blog/the-future-and-past-is-server-side-rendering
  
Well that's a good a place to start as any (you can see my approach is
very scientific). In their example they use a library called [oak][]
which appears to have the `.ts` TypeScript extension so that's a few
boxes checked already. Let's see how that goes in practice.

Firstly we grab their stock "Hello, World!" example, stick it in a
file and see what `deno` does.
```
$ pbpaste > server.ts
$ deno run --allow-net server.ts
Warning Implicitly using latest version (v12.6.1) for https://deno.land/x/oak/mod.ts

# In another terminal ...
$ curl http://localhost:8000/
Hello world!
```

Excellent, this looks like a good place to start! It seems sometimes
the best place to start is with your browser history.

[oak]: https://oakserver.github.io/oak/

# Back to basics

Ordinarily I would use trusty ol' Emacs for writing code but in this
instance I'm trying learn new things so it's finally time to use
[Code][] (what a name!) in anger. Downloading and getting it running
is fine and Deno also has [docs specifically for Code][]. But! It makes the
classic doc blunder of using one name in the docs, `vscode_deno`, and
then not using that same name in the extension itself ._^

Now the first thing I must do is "enable a workspace" which is not a
concept I currently possess (although I can likely muddle through with
similar concepts from other editors/runtimes/etc) ... ok following the
instructions produces an error about a _lack_ of workspace. A few
steps back are going to be necessary here.

An educated guess suggests this is to do with Code, rather than Deno,
so let's try those docs. Nothing in the top level of the docs ... ok,
the concept isn't essential or well advertised. In that case let's
just try stuff in Code ... opening a _folder_ instead of a _file_ has
allowed the relevant magic to happen. The squiggly red has now
disappeared and the coding can begin in earnest!

[Code]: https://code.visualstudio.com/
[docs specifically for Code]: https://docs.deno.com/runtime/manual/references/vscode_deno/

# Actual requirements

What's really needed is something that fetches the most recent games
from the various Dungeon Crawl servers. Then something else that
figures out which are the winning games. Then a final piece to expose
that information. Sounds like a job for a library! Or at least a
dedicated [module][] as I believe they're called in
JavaScript-land. Having [some experience][] in this area I'm ready to dive
right in, to writing TypeScript, which is basically JavaScript right?

Firstly we need some data to work with so let's what we have to work
with. The logfiles for the crawl servers are handily [defined already][]
so we put together a URL for a nearby server for the latest version
and see what it looks like:

```
$ curl -I https://webzook.net/soup/0.30/logfile
HTTP/1.1 200 OK
Date: Thu, 04 Jan 2024 08:42:05 GMT
Server: Apache/2.4.57 (Unix) OpenSSL/3.0.2
Last-Modified: Thu, 04 Jan 2024 08:07:29 GMT
ETag: "7d7c1f-60e1a3916919e"
Accept-Ranges: bytes
Content-Length: 8223775
```

Ok so that's about 8MB which isn't something we want to fetch on a
regular basis. But let's fetch it once and have a look at the data!

```
§ wget -O webzook-0.30.logfile https://webzook.net/soup/0.30/logfile
...
2024-01-04 15:50:31 (662 KB/s) - ‘webzook-0.30.logfile’ saved [8223775/8223775]
§ tail -1 webzook-0.30.logfile
v=0.30-b1:vlong=0.30-b1-7-gcb88a99046:lv=0.1:vsavrv=Git::0.30-b1-7-gcb88a99046:vsav=34.253:tiles=1:name=FDmntl:race=Spriggan:cls=Brigand:char=SpBr:xl=2:sk=Stealth:sklev=6:title=Sneak:place=D::2:br=D:lvl=2:absdepth=2:hp=0:mhp=14:mmhp=14:mp=3:mmp=3:bmmp=3:str=7:int=12:dex=16:ac=3:ev=16:sh=0:start=20240003183332S:dur=1730:turn=898:aut=6576:kills=23:status=lethally poisoned (0 -> -13):gold=44:goldfound=44:goldspent=0:scrollsused=0:potionsused=0:sc=25:ktyp=pois:killer=a goblin:dam=3:sdam=3:tdam=3:end=20240004080729S:seed=5894012356088655548:tmsg=succumbed to a goblin's poison
```

Super! Some colon–delimited key=value pairs, that should be easy
enough to work all things being equal. Now does Code provide a REPL
for poking about with ... it seems like [not?][]. At a glance it
suggests TypeScript REPLs aren't commonly used, so let's hope there's
a JavaScript REPL or we'll be running `deno` from a terminal.

It seems the line–based paradigm is out and live coding is in, cool,
that works too. It looks like [JavaScript REPL][] is the extension of
choice and I'm happy to go with that. It works and is nice but, as my
first experience of writing code with Code (that name!) shows that the
editor is a little too eager to flag every little issue the very
moment it occurs. I believe that can be configured ... bumping up some
delays makes it seem less aggressive but only marginally. At any rate
it's working nicely and I can easily build a map that shows what
happened in the game.

```
const logline = `v=0.30-b1:vlong=0.30-b1-7-gcb88a99046:lv=0.1:vsavrv=Git::0.30-b1-7-gcb88a99046:vsav=34.253:tiles=1:name=FDmntl:race=Spriggan:cls=Brigand:char=SpBr:xl=2:sk=Stealth:sklev=6:title=Sneak:place=D::2:br=D:lvl=2:absdepth=2:hp=0:mhp=14:mmhp=14:mp=3:mmp=3:bmmp=3:str=7:int=12:dex=16:ac=3:ev=16:sh=0:start=20240003183332S:dur=1730:turn=898:aut=6576:kills=23:status=lethally poisoned (0 -> -13):gold=44:goldfound=44:goldspent=0:scrollsused=0:potionsused=0:sc=25:ktyp=pois:killer=a goblin:dam=3:sdam=3:tdam=3:end=20240004080729S:seed=5894012356088655548:tmsg=succumbed to a goblin's poison`;
const pairs = logline.split(/\b:\b/);
const result = pairs.reduce((acc: Object, s) => {
  const p = s.split(/\b=\b/);
  return {...acc, [p[0]]: p[1]};
}, {});

{ absdepth: '2',
  ac: '3',
  aut: '6576',
  bmmp: '3',
  br: 'D',
  char: 'SpBr',
  cls: 'Brigand',
  dam: '3',
  dex: '16',
  dur: '1730',
  end: '20240004080729S',
  ev: '16',
  goldfound: '44',
  goldspent: '0',
  hp: '0',
  int: '12',
  killer: 'a goblin',
  kills: '23',
  ktyp: 'pois',
  lv: '0.1',
  lvl: '2',
  mhp: '14',
  mmhp: '14',
  mmp: '3',
  mp: '3',
  name: 'FDmntl',
  place: 'D::2',
  potionsused: '0',
  race: 'Spriggan',
  sc: '25',
  scrollsused: '0',
  sdam: '3',
  seed: '5894012356088655548',
  sh: '0',
  sk: 'Stealth',
  sklev: '6',
  start: '20240003183332S',
  status: 'lethally poisoned (0 -> -13):gold',
  str: '7',
  tdam: '3',
  tiles: '1',
  title: 'Sneak',
  tmsg: 'succumbed to a goblin\'s poison',
  turn: '898',
  v: '0.30-b1',
  vlong: '0.30-b1-7-gcb88a99046',
  vsav: '34.253',
  vsavrv: 'Git::0.30-b1-7-gcb88a99046',
  xl: '2' }
```

Now we just pull out the field which shows the game ended in a
win. That field is not technically present in fact. Luckily, as I say,
I've been here before and [happen to know][] that if the `ending` field
begins `escaped with the Orb` then it's a winner (these days we
have a handy [API doc][] too!). So know we can filter for winning
games based on that info, so let's see how many winning games there
have been for 0.30 on webzook.net.

[module]: https://docs.deno.com/runtime/manual/basics/modules/
[some experience]: https://github.com/broquaint/soup-stash/blob/master/script/keeping-up-with-the-logs
[defined already]: https://github.com/crawl/sequell/blob/master/config/sources.yml
[not?]: https://code.visualstudio.com/Docs/languages/typescript
[JavaScript REPL]: https://marketplace.visualstudio.com/items?itemName=achil.vscode-javascript-repl
[happen to know]: https://github.com/broquaint/soup-stash/blob/master/lib/soupstash/ingestlogfile/transformer.rb#L87C57-L87C77
[API doc]: https://github.com/crawl/sequell/blob/master/docs/listgame.md

# Data please

So we read from the file using a `node` adjacent API like `io` right?
Right? Only if you like _deprecated_ libraries!

XXX io screenshot goes here

If I want to do something as innocent as read lines from a file what
should I be doing?

XXX readLines screenshot goes here

It should be a _squints suspiciously_ a *Web* _Streams_ API. No. No I
dont' think so. The sweet embrace of deprecation warnings it is!

XXX failure to use readLines screenshot goes here

Apparently not. And even if it were it seems the API is like something
a [90s Java library author][] [might have written][] (hey look
[slurping all lines at once][] landed in Java 8!).

Ok here I admit defeat and just pull out an elegant tool for more a
civilized age:

```
$ perl -nE '$tot++; $wins++ if /tmsg=escaped with the Orb/ } { say sprintf "%d wins out of a total %d games which is a win percentage of %.2f", $wins, $tot, ($wins / $tot * 100)' webzook-0.30.logfile 
103 wins out of a total 13485 games which is a win percentage of 0.76
```

That's some nice data and means we have something useful to work with
(no surprise there!). And here is a good point to call it a day and
think back on what was learnt.


[might have written]: https://deno.land/std@0.210.0/io/mod.ts?s=readLines#Examples
[90s Java library author]: https://docs.oracle.com/javase/8/docs/api/
[slurping all lines at once]: https://docs.oracle.com/javase/8/docs/api/java/nio/file/Files.html#readAllLines-java.nio.file.Path-

# Going foreword

Today I learnt:

- A little about Deno: it mostly just works but it's io interface is a
  little wanting
- A little more about Code: how to create+open a workspace, run some
  TypeScript in situ, configuring some things
- That the DCSS logfile data is pleasantly stable
- There are too many static site blogging options (and it's too boring
  to bother blogging about)

That's a good start! Tomorrow I want to be pulling data from a server
directly and getting a feed of wins.

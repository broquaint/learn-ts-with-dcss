This is a quick post to record how I resolved an issue with dependency
my [Clojure-based website][].

## Lick of polish, taste of errors

My intention was to give the web server that runs my website a bit of
a refresh and the most obvious place to start was updating
dependencies because who know what CVEs lurk in my increasingly
ancient deps ([upwards of 12 years][] at the time of
writing!). Therefore I look at my `project.clj`:


```clojure
(defproject broquaint "0.1.4"
  :description "The broquaint.com website"
  :url "http://broquaint.com/"
  :dependencies [[org.clojure/clojure "1.5.1"]
                 [ring/ring-jetty-adapter "1.1.8"]
                 [compojure "1.1.5"]
                 ;; broquaint.github-repos deps vv
                 [ring/ring-json "0.1.2"]
                 [clj-http "0.7.8"] ;; Needed otherwise tentacles blows up
                 [irresponsible/tentacles "0.6.6"]
                 [org.clojure/core.cache "0.6.3"]]
  :plugins [[lein-ring "0.8.2"]]
  :ring {:handler broquaint.handler/app :port 3080}
  :profiles
  {:dev {:dependencies [[ring-mock "0.1.3"]]}}
  :main broquaint.handler)
```

And just bump everything that isn't the latest—which is everything—by
manually looking each one up in [clojars][] and using that version. So
far so naïve. Then I boot up the server and see this:

```
$ lein repl
SLF4J: No SLF4J providers were found.
SLF4J: Defaulting to no-operation (NOP) logger implementation
SLF4J: See https://www.slf4j.org/codes.html#noProviders for further details.
Execution error (ClassNotFoundException) at jdk.internal.loader.BuiltinClassLoader/loadClass (BuiltinClassLoader.java:602).
org.eclipse.jetty.server.nio.SelectChannelConnector

Full report at:
/var/folders/kx/3_brysfx697fv_t0hc2j27g00000gn/T/clojure-15386040129606800638.edn
```

Hrm. Ok, that is _no bueno_, so let's look at the report and see if
there's an obvious smoking gun:

```clojure
 {:via
  [{:type clojure.lang.Compiler$CompilerException,
    :message
    "Syntax error macroexpanding at (/private/var/folders/kx/3_brysfx697fv_t0hc2j27g00000gn/T/form-init8515964480172387038.clj:1:125).",
    :data
    {:clojure.error/phase :execution,
     :clojure.error/line 1,
     :clojure.error/column 125,
     :clojure.error/source
     "/private/var/folders/kx/3_brysfx697fv_t0hc2j27g00000gn/T/form-init8515964480172387038.clj"},
    :at [clojure.lang.Compiler load "Compiler.java" 7665]}
   {:type java.lang.ExceptionInInitializerError,
    :at [java.lang.Class forName0 "Class.java" -2]}
   {:type java.lang.ClassNotFoundException,
    :message "org.eclipse.jetty.server.nio.SelectChannelConnector",
    :at
    [jdk.internal.loader.BuiltinClassLoader
     loadClass
     "BuiltinClassLoader.java"
     602]}],
  :trace
  [[jdk.internal.loader.BuiltinClassLoader
    loadClass
    "BuiltinClassLoader.java"
    602]
   [jdk.internal.loader.ClassLoaders$AppClassLoader
    loadClass
    "ClassLoaders.java"
    178]
   [java.lang.ClassLoader loadClass "ClassLoader.java" 521]
   [java.lang.Class forName0 "Class.java" -2]
   [java.lang.Class forName "Class.java" 333]
   [ring.adapter.jetty$loading__4910__auto__ invoke "jetty.clj" 1]
   …
   ]}
```

Nothing obvious but it does point in the direction of
`ring.adapter.jetty` and its attempt to load the
`org.eclipse.jetty.server.nio.SelectChannelConnector` class. My first
thought is—_should_ it be trying to load that class? A quick internet
search [suggests that particular class][] was used in an earlier version
of jetty, circa v8 perhaps, but no longer (thanks for the pointer [Gray][]!). The
implication now is that I'm using an older version of
`ring.adapter.jetty` somehow, which is odd since I just updated the
dep.

Ok let's sanity check the deps:
```
$ lein deps :tree
…
 [ring/ring-core "1.11.0"]
   [commons-io "2.15.0"]
   [crypto-equality "1.0.1"]
   [crypto-random "1.2.1"]
     [commons-codec "1.15"]
   [org.apache.commons/commons-fileupload2-core "2.0.0-M1"]
   [org.ring-clojure/ring-websocket-protocols "1.11.0"]
   [ring/ring-codec "1.2.0"]
 [ring/ring-jetty-adapter "1.11.0"]
   [org.eclipse.jetty.websocket/websocket-jetty-server "11.0.18"]
     [org.eclipse.jetty.websocket/websocket-jetty-api "11.0.18"]
     [org.eclipse.jetty.websocket/websocket-jetty-common "11.0.18"]
       [org.eclipse.jetty.websocket/websocket-core-common "11.0.18"]
     [org.eclipse.jetty.websocket/websocket-servlet "11.0.18"]
       [org.eclipse.jetty.websocket/websocket-core-server "11.0.18"]
     [org.eclipse.jetty/jetty-servlet "11.0.18"]
       [org.eclipse.jetty/jetty-security "11.0.18"]
     [org.eclipse.jetty/jetty-webapp "11.0.18"]
       [org.eclipse.jetty/jetty-xml "11.0.18"]
   [org.eclipse.jetty/jetty-server "11.0.18"]
     [org.eclipse.jetty.toolchain/jetty-jakarta-servlet-api "5.0.2"]
     [org.eclipse.jetty/jetty-http "11.0.18"]
       [org.eclipse.jetty/jetty-util "11.0.18"]
     [org.eclipse.jetty/jetty-io "11.0.18"]
     [org.slf4j/slf4j-api "2.0.5"]
   [org.ring-clojure/ring-jakarta-servlet "1.11.0"]
…
```

That sure is the latest and greatest. Two more sanity checks then—when
did `ring.adapter.jetty` stop using
`o.e.j.s.n.SelectChannelConnector`? I clone the [ring][] repo and apply
the log pickaxe:

```
$ git log -SSelectChannelConnector
commit ddcee56386c24f33455d53cb46c57b2cd6104e8e
Author: James Reeves <jreeves@weavejester.com>
Date:   Sat May 9 14:58:35 2015 +0100

    Update Jetty adapter to Jetty 9 (fixes #183)
…
```

Sure enough `ring` is a post v8 jetty, as you can see in [that
commit][], so something else is pulling in anolder jetty. But what?

[Clojure-based website]: https://github.com/broquaint/broquaint.com
[upwards of 12 years]: https://github.com/broquaint/broquaint.com/blame/fe1ede395bd80dce3b895b3ef1ae348bf79dad9c/project.clj
[clojars]: https://clojars.org/
[suggests that particular class]: https://stackoverflow.com/a/22965041
[Gray]: https://stackoverflow.com/users/179850/gray
[ring]: https://github.com/ring-clojure/ring
[that commit]: https://github.com/ring-clojure/ring/commit/ddcee56386c24f33455d53cb46c57b2cd6104e8e

## The classpath war

The `ClassNotFoundException` isn't coming from nowhere, the JVM
doesn't throw exceptions just for the heck of it (but one _does_
wonder sometimes). The dependencies in `project.clj` are
sufficiently modern that the error, logically, shouldn't occur.
Therefore old dependencies _are_ being loaded—but where and why⁉️

Really here I am beginning at the end: looking at the
classpath. What's in a classpath you might ask? I'll let
[someone else answer that properly][], but the gist is that it's a list of
paths that the JVM will look in when loading classes. Which means
somewhere in those paths will be an older version of
`ring.adapter.jetty` lurking in wait. And how do we look at the
classpath in Clojure? Well another quick search pointed me towards
[java.classpath][] and, with some judicious commenting and a good
portion of luck, I got a REPL running and could see what's what:

```
(#object[java.io.File 0x9b4b205  "/Users/dbrook/dev/broquaint.com/test"]
 #object[java.io.File 0x73f04ba4 "/Users/dbrook/dev/broquaint.com/src"]
 #object[java.io.File 0x398dae3e "/Users/dbrook/dev/broquaint.com/dev-resources"]
 #object[java.io.File 0x716ba94f "/Users/dbrook/dev/broquaint.com/resources"]
 #object[java.io.File 0x5d6319fd "/Users/dbrook/dev/broquaint.com/target/classes"]
 #object[java.io.File 0x2c3fd49e "/Users/dbrook/.m2/repository/org/apache/httpcomponents/httpcore/4.4.14/httpcore-4.4.14.jar"]
 …
 )
```

And then the penny dropped: the old class was being picked up from a
now very outdated build. A quick `lein clean` and it was in working
order:
```
$ lein clean
$ lein ring server
Java HotSpot(TM) 64-Bit Server VM warning: Options -Xverify:none and -noverify were deprecated in JDK 13 and will likely be removed in a future release.
SLF4J: No SLF4J providers were found.
SLF4J: Defaulting to no-operation (NOP) logger implementation
SLF4J: See https://www.slf4j.org/codes.html#noProviders for further details.
WARNING: random-uuid already refers to: #'clojure.core/random-uuid in namespace: ring.middleware.refresh, being replaced by: #'ring.middleware.refresh/random-uuid
Started server on port 3080
```

Noisy output aside everything was once again in order.

[someone else answer that properly]: https://blogs.oracle.com/javamagazine/post/how-the-jvm-locates-loads-and-runs-libraries
[java.classpath]: https://github.com/clojure/java.classpath

## Time stands still for no tool

Perhaps that outcome will not come as a surprise to anyone who works
with Clojure daily. I think in my case the surprise shouldn't have
been surprising, that's hindsight for you, because I hadn't worked
with clojure tooling proper in many moons (oh I've spun up a few toy
repos, like [advent of code solutions][]) and so simply wasn't
cogniscent of the fact deps from old builds would be picked up. If I
were a daily, or even vaguely regular, user of these tools then I
wouldn't have so obliviously footgunned myself.

At any rate I can now move on with giving this old website a bit of
love and return to the _regular_ learning related posts.

[advent of code solutions]: https://github.com/broquaint/advent-of-code-2022-clj

# Anathema

Yet another task runner. So if you're reading this, the package is published but
not considered stable, or something I would hitch your wagon to just yet.

I don't want to hastily commit to supporting a task runner before I've tried to
use it myself for a while, but if you're still curious about why one would
write a task runner, here's a quick rundown:

## I don't like the plugin ecosystem

That's basically it, nearly all task runners have a plethora of dependency
plugins required to make them usable. All I want is a task runner that fulfils
these requirements:

- doesn't require technology specific plugins to make it usable
- doesn't force you to couple the build process for technologies together to
  make it usable (ala bundlers like Webpack and Fusebox)
- makes the actual process of running the tasks reliable and easy to debug

So with those concepts in mind, my goal is not syntax reduction, blazing red hot
performance, or a reduction in the need to configure tools. This is a build tool
for people who want it to do what they told it to do, when they told it to do
it, without relying on hundreds of extra dependencies in order to make it
happen.

In short:

# no plugins
# no forced coupling
# nice development experience

If you got this far, and you want to try it out despite its unfinished nature:

```
yarn add -D anathema
```

Add the following to your package.json:
```
{
  "scripts": {
    "anathema": "anathema --config/anathema.js"
  }
}
```

And run it with:
```
yarn anathema <taskname>
```
It'll default to running `default` if you don't provide one.

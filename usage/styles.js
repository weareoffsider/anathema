var anathema = require('./config')
var less = require('less')
var postcss = require('postcss')
var autoprefixer = require('autoprefixer')

anathema.watcher(
  "styles",
  "usage/src/**/*.{less,lass}",
  ["styles:post"],
  { runOnStart: true }
)
anathema.task("styles:less", function (task) {
  return task.src("usage/src/app.less")
    .transform(
      (file) => less.render(file.data, {strictMath: true}),
      (file, out) => {
        file.data = out.css
        file.name = file.name.replace('.less', '.less.css')
      }
    )
    .output('usage/out')
})

anathema.task("styles:post", ["styles:less"], function (task) {
  return task.src("usage/out/app.less.css")
    .transform(
      (file) => postcss([autoprefixer]).process(file.data, {from: undefined}),
      (file, out) => {
        file.data = out.css
        file.name = file.name.replace('.less.css', '.final.css')
      }
    )
    .output('usage/out')
})

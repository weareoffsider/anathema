var anathema = require('./config')
var less = require('less')
var postcss = require('postcss')
var autoprefixer = require('autoprefixer')

anathema.watcher(
  "styles",
  "usage/src/**/*.less",
  ["styles"]
)
anathema.task("styles", function (task) {
  return task.src("usage/src/app.less")
    .transform(
      (file) => less.render(file.data, {strictMath: true}),
      (file, out) => postcss([autoprefixer]).process(out.css, {from: undefined}),
      (file, out) => {
        file.data = out.css
        file.name = file.name.replace('.less', '.css')
      }
    )
    .output('usage/out')
})

var anathema = require('./config')
var pug = require('pug')

anathema.watcher(
  "containers",
  "usage/src/**/*.pug",
  ["containers"],
  { runOnStart: true }
)
anathema.task("containers", function (task) {
  return task.src("usage/src/**/*.pug")
    .transform(
      (file) => pug.render(file.data),
      (file, out) => {
        file.data = out
        file.name = file.name.replace('.pug', '.html')
      }
    )
    .output('usage/out')
})

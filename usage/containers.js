var anathema = require('./config')
var pug = require('pug')

anathema.watcher(
  "containers",
  "usage/src/**/*.pug",
  ["containers"]
)
anathema.task("containers", function (task) {
  console.log("pug doing things")
  return task.src("usage/src/**/*.pug")
    .transform(
      (file) => pug.render(file.data),
      (file, out) => {
        console.log("pug well into it")
        file.data = out
        file.name = file.name.replace('.pug', '.html')
      }
    )
    .output('usage/out')
})

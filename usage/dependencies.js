var anathema = require('./config')

anathema.task("dependencies", function (task) {
  return task.src(anathema.config.production
    ? [
        "node_modules/react/umd/react.production.min.js",
        "node_modules/redux/dist/redux.min.js",
      ]
    : [
        "node_modules/react/umd/react.development.js",
        "node_modules/redux/dist/redux.js",
      ]
    )
    .concatenate("dependencies.js")
    .output('usage/out')
})

var anathema = require('./config')
var webpack = require('webpack')


const scriptsMonitor = anathema.monitor("webpack")

anathema.task("scripts", function (task) {
  const WEBPACK_CONFIG = {
    mode: "development",
    entry: anathema.rootDirectory + "/usage/src/app.js",
    output: {
      filename: "app.pkg.js",
      path: anathema.rootDirectory + "/usage/out/",
    }
  }

  const compiler = webpack(WEBPACK_CONFIG)

  if (task.runContext.dashboard) {
    compiler.watch({}, (err, stats) => { 
      if (err) {
        return scriptsMonitor.reportFailure(err)
      }

      if (stats.hasErrors()) {
        return scriptsMonitor.reportFailure(
          stats.toString({
            all: false, errors: true, colors: true, chunks: false
          })
        )
      }

      scriptsMonitor.reportSuccess(
        stats.toString({colors: true}),
        stats.endTime - stats.startTime
      )
    })
    return Promise.resolve(true)
  } else {
    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => { 
        if (err) {
          return reject(err)
        }

        if (stats.errors) {
          return reject(stats.errors)
        }

        resolve(stats)
      })
    })
  }
})

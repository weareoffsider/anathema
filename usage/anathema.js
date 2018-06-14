var anathema = require('./config')
const LocalWebServer = require('local-web-server')

require('./styles.js')
require('./containers.js')
require('./dependencies.js')

var del = require('del')

anathema.task('clean', function(task) {
  return del([anathema.rootDirectory + '/usage/out/**/*'])
    .then((paths) => {
      task.stats.filesMatched = task.stats.filesMatched.concat(paths)
      return true
    })
})

anathema.task('wait', function(task) {
  return new Promise((resolve, reject) => { 
    setTimeout(resolve, 1000)
  })
})

anathema.task('devServer', function(task) {
  const localWebServer = new LocalWebServer()
  const server = localWebServer.listen({
    port: 8080,
    directory: anathema.rootDirectory + "/usage/out",
  })
  console.log("Server running at localhost:8080")
  return Promise.resolve(true)
})

anathema.dashboard("default", function (dashboard) {
  dashboard.initial(['clean', 'wait'])
  dashboard.watch(['styles', 'containers'])
  dashboard.post(['devServer'])
})

module.exports = anathema

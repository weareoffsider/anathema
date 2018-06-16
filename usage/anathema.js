var anathema = require('./config')
const LocalWebServer = require('local-web-server')
const gitRev = require('git-rev')

require('./styles.js')
require('./scripts.js')
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

anathema.task('version-json', function(task) {
  return new Promise((resolve, reject) => {
    gitRev.short((str) => {
      task.srcFromString({
        name: 'version.json',
        data: '{"version": "' + str + '"}',
      }).output('usage/out')
        .then(resolve, reject)
    })
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
  dashboard.task(['clean', 'wait'])
  dashboard.task(['scripts', 'version-json'])
  dashboard.watch(['styles', 'containers'])
  dashboard.monitor(['webpack'])
  dashboard.task(['devServer'])
})

module.exports = anathema

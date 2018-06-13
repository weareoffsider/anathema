var anathema = require('./config')

require('./styles.js')
require('./containers.js')
require('./dependencies.js')

anathema.dashboard("default", function (dashboard) {
  dashboard.watch(['styles', 'containers'])
})

module.exports = anathema

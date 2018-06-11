var anathema = require('./config')

require('./styles.js')
require('./dependencies.js')

anathema.dashboard("default", function (dashboard) {
  dashboard.watch(['styles'])
})

module.exports = anathema

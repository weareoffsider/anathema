var anathema = require('./config')

require('./styles.js')
require('./dependencies.js')

anathema.dashboard("default", function (dashboard) {
  dashboard.addWatch('styles')
  console.log("running dashboard")
})

module.exports = anathema

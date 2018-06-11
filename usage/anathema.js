var anathema = require('./config')

require('./styles.js')
require('./dependencies.js')

anathema.dashboard("default", function (dashboard) {
  console.log("run dash")
})

module.exports = anathema

var {Anathema} = require("../node")
let anathema = new Anathema()

anathema.config = {
  paths: {
    src: 'src',
    out: 'out',
  }
}

module.exports = anathema

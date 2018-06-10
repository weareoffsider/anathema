var anathema = require("../node")
var less = require("less")
var postcss = require("postcss")
var autoprefixer = require("autoprefixer")

anathema.task("styles", function () {
  return anathema.src("src/*.less")
    .transform(
      (file) => less.render(file.data, {strictMath: true}),
      (file, out) => { file.data = out.css }
    )
    .transform(
      (file) => postcss([autoprefixer]).process(file.data, {from: undefined}),
      (file, out) => { file.data = out.css }
    )
    .outputFile('out/app.css')
    // .outputToDir('out')
})

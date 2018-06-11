#!/usr/bin/env node

import * as yargs from 'yargs'
import * as path from 'path'
import {cwd} from 'process'
import * as FindPackageJson from 'find-package-json'
var ora = require('ora')
import chalk from 'chalk'

var finder = FindPackageJson()

const argv = yargs.argv

const workDir = cwd()

let configFile: string

if (argv.config) {
  configFile = path.join(workDir, argv.config)
}

let tasksToRun = ['default']
const anathemaInstance = require(configFile)

if (!anathemaInstance.rootDirectory) {
  anathemaInstance.rootDirectory = path.dirname(finder.next().filename)
}

if (argv._ && argv._.length > 0) {
  tasksToRun = argv._
}

const spinner = ora('Running ' + tasksToRun.join(', ')).start()
console.log('')

Promise.all(tasksToRun.map((name: string) => {
  return anathemaInstance.run(name, {source: "cli"})
})).then((success: any) => {
  spinner.clear()
  spinner.stop()
}, (err: any) => {
  spinner.clear()
  spinner.stop()
  console.log(chalk.red.bold("Anathema encountered a runtime error:"))
  console.log(chalk.red('  ' + err.stack))
})

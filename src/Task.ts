import chalk from 'chalk'
import {src} from './FilePipe'
import {RunContext} from './index'

type MatcherDefinition = string | Array<string>
interface TaskStats {
  result?: string
  error?: any
  beginTimestamp: number
  endTimestamp?: number
  filesMatched: string[]
  filesOutput: string[]
}

export default class Task {
  public name: string
  public rootDirectory: string
  public stats: TaskStats
  public runContext: RunContext

  constructor (name: string, rootDir: string, runContext: RunContext) {
    this.name = name
    this.stats = {
      beginTimestamp: +new Date(),
      filesMatched: [],
      filesOutput: [],
    }
    this.rootDirectory = rootDir
    this.runContext = runContext
  }

  src (matcher: MatcherDefinition) {
    return src(this, this.rootDirectory, matcher)
  }

  reportToString() {
    const lines: string[] = []
    const log = (txt: string) => lines.push(txt)

    if (this.stats.result == "fail") {
      log(chalk.red.bold('Task: ') + chalk.white.bold.underline(this.name))
      log(chalk.red("  Task failed to complete:"))
      log(chalk.red('  ' + (this.stats.error.stack || this.stats.error)))
    } else {
      log(chalk.green.bold('Task: ') + chalk.white.bold.underline(this.name))
      log(chalk.green("  Task complete."))
    }

    if (this.stats.filesMatched.length > 0) {
      log(chalk.cyan('  -> input files'))
      this.stats.filesMatched.forEach((file: string) => {
        const shortPath = file.replace(this.rootDirectory, '')
        log('    - ' + shortPath)
      })
    } else {
      log(chalk.red.bold('  -> no input files were found'))
    }

    if (this.stats.filesOutput.length > 0) {
      log(chalk.cyan('  <- output files'))
      this.stats.filesOutput.forEach((file: string) => {
        const shortPath = file.replace(this.rootDirectory, '')
        log('    - ' + shortPath)
      })
    } else {
      log(chalk.red.bold('  <- no files were output'))
    }

    return lines.join('\n')
  }
}

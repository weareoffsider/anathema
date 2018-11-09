import chalk from 'chalk'
import {src, srcFromString, StringToFileDef} from './FilePipe'
import {IOptions} from 'glob'
import {RunContext} from './index'

type MatcherDefinition = string | Array<string>

export interface TaskEntry {
  name: string
  dependencies: string[]
  func: any
}


export interface TaskStats {
  result?: string
  error?: any
  beginTimestamp: number
  endTimestamp?: number
  filesMatched: string[]
  filesOutput: string[]
  dependencies: Task[]
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
      dependencies: [],
    }
    this.rootDirectory = rootDir
    this.runContext = runContext
  }

  src (matcher: MatcherDefinition, options?: IOptions) {
    return src(this, this.rootDirectory, matcher, options)
  }

  srcFromString (fileDef: StringToFileDef) {
    return srcFromString(this, this.rootDirectory, fileDef)
  }
  
  addDependencyResult (task: Task) {
    this.stats.dependencies.push(task)
  }

  errorSummaryToString() {
    return (
      this.stats.error.stack || this.stats.error || "Unspecified Error"
    ).toString()
  }

  reportToString(indent: string = "", reportAsDependency: boolean = false) {
    const lines: string[] = []
    const log = (txt: string) => lines.push(txt)

    // header
    if (reportAsDependency) {
      if (this.stats.result == "fail") {
        log(chalk.red.bold(indent + 'Dependency: ') + chalk.white.bold.underline(this.name))
      } else {
        log(chalk.green.bold(indent + 'Dependency: ') + chalk.white.bold.underline(this.name))
      }
    } else {
      if (this.stats.result == "fail") {
        log(chalk.red.bold(indent + 'Task: ') + chalk.white.bold.underline(this.name))
      } else {
        log(chalk.green.bold(indent + 'Task: ') + chalk.white.bold.underline(this.name))
      }
    }

    // state line
    if (this.stats.result == "fail") {
      log(chalk.red(indent + "  Task failed to complete:"))
      log(chalk.red(indent + '  ' + (this.stats.error.stack || this.stats.error)))
    } else {
      if (this.stats.dependencies.length > 0) {
        const executedDependencies = this.stats.dependencies.map((t) => t.name)
        log(chalk.green(indent + "  Task completed with dependencies: " + executedDependencies.join(", ")))
      } else {
        log(chalk.green(indent + "  Task completed."))
      }
    }

    if (this.stats.filesMatched.length > 0) {
      log(chalk.cyan(indent + '  -> input files'))
      this.stats.filesMatched.forEach((file: string) => {
        const shortPath = file.replace(this.rootDirectory, '')
        log(indent + '    - ' + shortPath)
      })
    } else {
      log(chalk.red.bold(indent + '  -> no input files were found'))
    }

    if (this.stats.filesOutput.length > 0) {
      log(chalk.cyan(indent + '  <- output files'))
      this.stats.filesOutput.forEach((file: string) => {
        const shortPath = file.replace(this.rootDirectory, '')
        log(indent + '    - ' + shortPath)
      })
    } else {
      log(chalk.red.bold(indent + '  <- no files were output'))
    }
    if (this.stats.dependencies.length > 0) {
      log(indent + '')
      this.stats.dependencies.forEach((task) => {
        log(task.reportToString(indent + "  ", true))
      })
    }

    return lines.join('\n')
  }
}

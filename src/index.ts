import {readFile, readdir, writeFile} from 'fs'
import * as path from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import * as mkdirp from 'mkdirp'
import chalk from 'chalk'
import Dashboard from './Dashboard'
import Task from './Task'

interface RunContext {
  source: string
}

export function reportOnTask(task: Task, status: string, err?: any) {
  const log = console.log

  if (status == "fail") {
    log(chalk.red.bold('Task: ') + chalk.white.bold.underline(task.name))
    log(chalk.red("  Task failed to complete:"))
    log(chalk.red('  ' + err.stack))
  } else {
    log(chalk.green.bold('Task: ') + chalk.white.bold.underline(task.name))
    log(chalk.green("  Task complete."))
  }

  if (task.stats.filesMatched.length > 0) {
    log(chalk.cyan('  -> input files'))
    task.stats.filesMatched.forEach((file: string) => {
      const shortPath = file.replace(task.rootDirectory, '')
      log('    - ' + shortPath)
    })
  } else {
    console.log(chalk.red.bold('  -> no input files were found'))
  }

  if (task.stats.filesOutput.length > 0) {
    console.log(chalk.cyan('  <- output files'))
    task.stats.filesOutput.forEach((file: string) => {
      const shortPath = file.replace(task.rootDirectory, '')
      console.log('    - ' + shortPath)
    })
  } else {
    console.log(chalk.red.bold('  <- no files were output'))
  }

  log('')
}

interface WatchEntry {
  name: string
  matcher: string
  tasks: string[]
}

export default class Anathema {
  public dashboardRegister: {[key: string]: any}
  public taskRegister: {[key: string]: any}
  public watchRegister: {[key: string]: WatchEntry}
  public rootDirectory: string
  public config: any

  constructor (config: any = null) {
    this.taskRegister = {}
    this.watchRegister = {}
    this.dashboardRegister = {}
    this.rootDirectory = null
    this.config = config
  }

  dashboard (name: string, func: any) {
    this.dashboardRegister[name] = func
  }

  watcher (name: string, matcher: string, tasks: string[]) {
    this.watchRegister[name] = {name, matcher, tasks}
  }

  task (name: string, func: any) {
    this.taskRegister[name] = func
  }

  run (name: string, runContext: RunContext) {
    if (this.taskRegister[name]) {
      const func = this.taskRegister[name]
      const task = new Task(name, this.rootDirectory)

      return func(task).then((success: any) => {
        task.stats.endTimestamp = +new Date()
        if (runContext.source == 'cli') {
          reportOnTask(task, "success")
        }
      }, (err: any) => {
        reportOnTask(task, "fail", err)
        throw err
      })
    } else if (this.dashboardRegister[name]) {
      const func = this.dashboardRegister[name]
      const dashboard = new Dashboard(name, this.rootDirectory)

      try {
        func(dashboard)
      } catch (e) {
        return Promise.reject(e)
      }
    } else {
      return Promise.reject(new Error(
        `Task not found: ${name}`
      ))
    }
  }

}


export {
  Anathema,
}








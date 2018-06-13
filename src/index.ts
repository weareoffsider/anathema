import {readFile, readdir, writeFile} from 'fs'
import * as path from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import * as mkdirp from 'mkdirp'
import chalk from 'chalk'
import Dashboard from './Dashboard'
import Task from './Task'
import Watcher, {WatchEntry} from './Watcher'

interface RunContext {
  source: string
  dashboard?: Dashboard
  watcher?: Watcher
}

export function reportOnTask(task: Task, status: string, err?: any) {
  const log = console.log
  log(task.reportToString(status, err))
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

  watcher (name: string, matcher: string, tasks: string[], options: any) {
    this.watchRegister[name] = {name, matcher, tasks, options}
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
        } else if (runContext.source == 'watcher') {
          runContext.watcher.onTaskComplete(task)
        }
      }, (err: any) => {
        reportOnTask(task, "fail", err)
        throw err
      })
    } else if (this.dashboardRegister[name]) {
      const func = this.dashboardRegister[name]

      try {
        return new Promise((resolve, reject) => {
          const dashboard = new Dashboard(
            this,
            name, this.rootDirectory, resolve, reject
          )
          try {
            dashboard.init()
          } catch(e) {
            setTimeout(() => {
              process.exit(0);
            }, 200)
            reject(e)
          }
          func(dashboard)
        })
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








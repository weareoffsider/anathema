import {readFile, readdir, writeFile} from 'fs'
import * as path from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import * as mkdirp from 'mkdirp'
import chalk from 'chalk'
import Dashboard from './Dashboard'
import Task from './Task'
import TaskMonitor from './TaskMonitor'
import Watcher, {WatchEntry} from './Watcher'

interface RunContext {
  source: string
  dashboard?: Dashboard
  watcher?: Watcher
  monitor?: TaskMonitor
}

export function reportOnTask(task: Task) {
  const log = console.log
  log(task.reportToString())
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
        task.stats.result = "success"

        if (runContext.source == 'cli') {
          reportOnTask(task)
        } else if (runContext.source == 'watcher') {
          runContext.watcher.onTaskComplete(task)
        } else if (runContext.source == 'monitor') {
          runContext.monitor.onTaskComplete(task)
        }
      }, (err: any) => {
        task.stats.result = "fail"
        task.stats.error = err
        if (runContext.source == 'cli') {
          reportOnTask(task)
          throw err
        } else if (runContext.source == 'watcher') {
          runContext.watcher.onTaskFail(task)
        } else if (runContext.source == 'monitor') {
          runContext.monitor.onTaskFail(task)
        }
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
          dashboard.run()
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








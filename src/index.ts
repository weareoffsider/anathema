import {readFile, readdir, writeFile} from 'fs'
import * as path from 'path'
import {Minimatch} from 'minimatch'
import {Glob} from 'glob'
import * as mkdirp from 'mkdirp'
import chalk from 'chalk'
import Dashboard from './Dashboard'
import Task, {TaskEntry} from './Task'
import TaskMonitor from './TaskMonitor'
import Watcher, {WatchEntry} from './Watcher'
import CustomMonitor from './CustomMonitor'

export interface RunContext {
  source: string
  parentTask?: Task
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
  public monitorRegister: {[key: string]: CustomMonitor}
  public watchRegister: {[key: string]: WatchEntry}
  public activeDashboard: Dashboard
  public rootDirectory: string
  public config: any

  constructor (config: any = null) {
    this.taskRegister = {}
    this.watchRegister = {}
    this.monitorRegister = {}
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

  monitor (name: string) {
    const cmonitor = new CustomMonitor(this, name)
    this.monitorRegister[name] = cmonitor
    return cmonitor
  }

  task (name: string, dependencies: string[], func: any): void
  task (name: string, func: any): void
  task (...args: any[]) {
    if (args.length > 3) {
      throw new Error("Task creation should have no more than 3 arguments")
    } else if (args.length == 3) {
      const [name, dependencies, func] = args

      this.taskRegister[name] = {name, dependencies, func}
    } else if (args.length == 2) {
      const [name, func] = args

      this.taskRegister[name] = {name, dependencies: [], func}
    } else {
      throw new Error("Task creation needs at least two arguments (name & function)")
    }
  }

  run (name: string, runContext: RunContext) {
    if (this.activeDashboard) {
      runContext.dashboard = this.activeDashboard
    }

    if (this.taskRegister[name]) {
      const taskEntry = this.taskRegister[name]
      const {dependencies, func} = taskEntry
      const task = new Task(name, this.rootDirectory, runContext)

      return Promise.all(dependencies.map((depName: string) => {
        return this.run(depName, {source: "task", parentTask: task})
      })).then(() => {
        return func(task).then((success: any) => {
          task.stats.endTimestamp = +new Date()
          task.stats.result = "success"

          if (runContext.source == 'cli') {
            reportOnTask(task)
          } else if (runContext.source == 'task') {
            runContext.parentTask.addDependencyResult(task)
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
          } else if (runContext.source == 'task') {
            runContext.parentTask.addDependencyResult(task)
            throw err
          } else if (runContext.source == 'watcher') {
            runContext.watcher.onTaskFail(task)
          } else if (runContext.source == 'monitor') {
            runContext.monitor.onTaskFail(task)
          }
        })
      }, (err: any) => {
        task.stats.result = "fail"
        task.stats.error = err
        if (runContext.source == 'cli') {
          reportOnTask(task)
          throw err
        } else if (runContext.source == 'task') {
          runContext.parentTask.addDependencyResult(task)
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
          this.activeDashboard = dashboard
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








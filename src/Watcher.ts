import * as chokidar from 'chokidar'
import chalk from 'chalk'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
import * as debounce from 'debounce'

export interface WatchEntry {
  name: string
  matcher: string
  options: any
  tasks: string[]
}

export default class Watcher {
  private instance: chokidar.FSWatcher
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}

  constructor (
    public anathemaInstance: Anathema,
    public dashboardInstance: Dashboard | null,
    public name: string,
    public rootDirectory: string,
    public matcher: string,
    public tasksToFire: string[],
    public watchOptions: any
  ) {
    this.lastTaskHits = {}
    this.tasksActive = []
    this.instance = chokidar.watch(
      path.join(rootDirectory, matcher),
      watchOptions || {}
    )

    const listener = debounce(this.onFileChange.bind(this), 300)
    this.instance.on('change', listener)
    this.instance.on('unlink', listener)
  }

  outputStatusLine () {
    if (this.tasksActive.length > 0) {
      return (
        this.name + " (" + this.matcher + ") " + 
        "- running " + this.tasksActive.join(", ")
      )
    }

    const hasFailures = Object.keys(this.lastTaskHits).some((key) => {
      return this.lastTaskHits[key].stats.result == "fail"
    })
    const hasSuccess = Object.keys(this.lastTaskHits).some((key) => {
      return this.lastTaskHits[key].stats.result == "success"
    })

    if (hasFailures) {
      return chalk.red(
        this.name + " (" + this.matcher + ") - failed"
      )
    } else if (hasSuccess) {
      const maxTime = Math.max.apply(null, Object.keys(this.lastTaskHits).map((key) => {
        return (
          this.lastTaskHits[key].stats.endTimestamp - 
          this.lastTaskHits[key].stats.beginTimestamp
        )
      }))
      return chalk.green(
        this.name + " (" + this.matcher + ") - success: " + maxTime + "ms"
      )
    } else {
      return (
        this.name + " (" + this.matcher + ")"
      )
    }
  }

  onTaskComplete (task: Task) {
    this.lastTaskHits[task.name] = task
    this.tasksActive = this.tasksActive.filter((k) => k !== task.name)
    this.dashboardInstance.updateAndRender()
  }

  onTaskFail (task: Task) {
    this.lastTaskHits[task.name] = task
    this.tasksActive = this.tasksActive.filter((k) => k !== task.name)
    this.dashboardInstance.addToLog(task.reportToString())
    this.dashboardInstance.updateAndRender()
  }

  onFileChange (path: string) {
    this.tasksToFire.forEach((taskName) => {
      this.tasksActive.push(taskName)
      this.anathemaInstance.run(taskName, {
        source: "watcher",
        watcher: this,
      })
    })
    this.dashboardInstance.updateAndRender()
  }
}

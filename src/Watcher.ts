import * as chokidar from 'chokidar'
import chalk from 'chalk'
import {Widgets, text} from 'blessed'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
import TaskMonitor from './TaskMonitor'
import * as debounce from 'debounce'

export interface WatchEntry {
  name: string
  matcher: string
  options: any
  tasks: string[]
}

export default class Watcher extends TaskMonitor {
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
    public watchOptions: any = {},
  ) {
    super()
  }

  run () {
    this.instance = chokidar.watch(
      path.join(this.rootDirectory, this.matcher),
      this.watchOptions.chokidarOptions || {}
    )
    const listener = debounce(this.onFileChange.bind(this), 300)
    this.instance.on('change', listener)
    this.instance.on('unlink', listener)

    if (this.watchOptions.runOnStart) {
      return this.runTasks()
    }
  }

  outputStatusLine () {
    const escapedMatcher = this.matcher.replace('{', '_open_')
                                       .replace('}', '_close_')
                                       .replace('_open_', '{open}')
                                       .replace('_close_', '{close}')
    if (this.tasksActive.length > 0) {
      return ("{yellow-fg}" +
        this.name + " (" + escapedMatcher + ") " + 
        "- running " + this.tasksActive.join(", ")
      + "{/}")
    }

    const hasFailures = Object.keys(this.lastTaskHits).some((key) => {
      return this.lastTaskHits[key].stats.result == "fail"
    })
    const hasSuccess = Object.keys(this.lastTaskHits).some((key) => {
      return this.lastTaskHits[key].stats.result == "success"
    })

    if (hasFailures) {
      return ("{red-fg}" +
        this.name + " (" + escapedMatcher + ") - failed"
      + "{/}")
    } else if (hasSuccess) {
      const maxTime = Math.max.apply(null, Object.keys(this.lastTaskHits).map((key) => {
        return (
          this.lastTaskHits[key].stats.endTimestamp - 
          this.lastTaskHits[key].stats.beginTimestamp
        )
      }))
      return ("{green-fg}" +
        this.name + " (" + escapedMatcher + ") - success: " + maxTime + "ms"
      + "{/}")
    } else {
      return ("{white-fg}" +
        this.name + " (" + escapedMatcher + ")"
      + "{/}")
    }
  }

  onFileChange (path: string) {
    this.runTasks()
  }
}

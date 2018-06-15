import * as chokidar from 'chokidar'
import chalk from 'chalk'
import {Widgets, text} from 'blessed'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
import TaskMonitor from './TaskMonitor'

export default class RunOnceMonitor extends TaskMonitor {
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}

  constructor (
    public anathemaInstance: Anathema,
    public dashboardInstance: Dashboard | null,
    public rootDirectory: string,
    public tasksToFire: string[],
  ) {
    super()
  }

  outputStatusLine () {
    const name = "Run " + this.tasksToFire.join(', ') + ""
    if (this.tasksActive.length > 0) {
      return ("{yellow-fg}" +
        name + " " + 
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
        name + " - failed"
      + "{/}")
    } else if (hasSuccess) {
      const maxTime = Math.max.apply(null, Object.keys(this.lastTaskHits).map((key) => {
        return (
          this.lastTaskHits[key].stats.endTimestamp - 
          this.lastTaskHits[key].stats.beginTimestamp
        )
      }))
      return ("{green-fg}" +
        name + " - success: " + maxTime + "ms"
      + "{/}")
    } else {
      return ("{white-fg}" +
        name
      + "{/}")
    }
  }


  run () {
    return this.runTasks()
  }
}

import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'

export default class TaskMonitor {
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}
  public anathemaInstance: Anathema
  public dashboardInstance: Dashboard | null
  public tasksToFire: string[]

  constructor () {
    this.lastTaskHits = {}
    this.tasksActive = []
  }

  outputStatusLine () {
    return "{fg-red}Unconfigured monitor{/}"
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

  runTasks () {
    const promise = Promise.all(this.tasksToFire.map((taskName) => {
      this.tasksActive.push(taskName)
      return this.anathemaInstance.run(taskName, {
        source: "monitor",
        monitor: this,
      })
    }))
    this.dashboardInstance.updateAndRender()
    return promise
  }
}

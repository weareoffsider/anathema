import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
const notifier = require('node-notifier')

export default class TaskMonitor {
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}
  public anathemaInstance: Anathema
  public dashboardInstance: Dashboard | null
  public tasksToFire: string[]
  public lastNotifyState: string

  constructor () {
    this.lastTaskHits = {}
    this.tasksActive = []
    this.lastNotifyState = "success"
  }

  notifyFailure (message: string) {
    notifier.notify({
      title: `ERROR: ${this.outputNotifyTitle()}`, message,
      sound: true,
    })
    this.lastNotifyState = "failure"
  }

  notifySuccess () {
    if (this.lastNotifyState != "success") {
      notifier.notify({
        title: this.outputNotifyTitle(), message: "Task successful",
        sound: false,
      })
    }
  }
  
  outputNotifyTitle () {
    return "Unconfigured Monitor"
  }

  outputStatusLine () {
    return "{fg-red}Unconfigured monitor{/}"
  }

  outputTaskData () {
    let content = ""
    Object.keys(this.lastTaskHits).forEach((tk: string) =>{ 
      const task = this.lastTaskHits[tk]
      content += task.reportToString() + "\n\n"
    })
    return content
  }

  onTaskComplete (task: Task) {
    this.lastTaskHits[task.name] = task
    this.tasksActive = this.tasksActive.filter((k) => k !== task.name)
    this.dashboardInstance.updateAndRender()
    this.notifySuccess()
  }

  onTaskFail (task: Task) {
    this.notifyFailure(task.errorSummaryToString())
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

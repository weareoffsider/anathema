import * as chokidar from 'chokidar'
import chalk from 'chalk'
import {Widgets, text} from 'blessed'
import * as path from 'path'
import {Anathema} from './index'
import Dashboard from './Dashboard'
import Task from './Task'
import TaskMonitor from './TaskMonitor'

export default class CustomMonitor extends TaskMonitor {
  public tasksActive: string[]
  public lastTaskHits: {[key: string]: Task}
  public dashboardInstance: Dashboard | null
  public lastReportSpeed: number
  public lastReportStatus: string
  public lastReportSuccess: string
  public lastReportError: any
  public rootDirectory: string

  constructor (
    public anathemaInstance: Anathema,
    public name: string
  ) {
    super()
  }

  setMonitorContext (dash: Dashboard, rootDir: string) {
    this.dashboardInstance = dash
    this.rootDirectory = rootDir
  }

  outputStatusLine () {
    const name = "Monitor " + this.name

    if (this.lastReportStatus == "failed") {
      return ("{red-fg}" +
        name + " - failed"
      + "{/}")
    } else if (this.lastReportStatus == "success") {
      if (this.lastReportSpeed) {
        return ("{green-fg}" +
          name + " - success: " + this.lastReportSpeed + "ms"
        + "{/}")
      } else {
        return ("{green-fg}" +
          name + " - success"
        + "{/}")
      }
    }

    return ("{white-fg}" +
      name
    + "{/}")
  }

  outputTaskData () {
    const lines: string[] = []
    const log = (txt: string) => lines.push(txt)

    if (this.lastReportStatus == "failed") {
      log(chalk.red.bold('Monitor: ') + chalk.white.bold.underline(this.name))
      log(chalk.red("  Monitor reported a failure:"))
      if (this.lastReportError) {
        log(this.lastReportError.stack || this.lastReportError)
      }
    } else if (this.lastReportStatus == "success") {
      log(chalk.green.bold('Monitor: ') + chalk.white.bold.underline(this.name))
      log(chalk.green("  Monitor reported success:"))
      log(this.lastReportSuccess)
    }

    return lines.join('\n')
  }

  reportSuccess (messageData: string, speed?: number) {
    this.lastReportSpeed = speed || 0
    this.lastReportStatus = "success"
    this.lastReportSuccess = messageData
    this.lastReportError = null
    this.dashboardInstance.updateAndRender()
  }

  reportFailure (err: any) {
    this.lastReportStatus = "failed"
    this.lastReportSuccess = ""
    this.lastReportError = err
    this.lastReportSpeed = 0
    this.dashboardInstance.addToLog(this.outputTaskData())
    this.dashboardInstance.updateAndRender()
  }

  run () {
    return Promise.resolve(true)
  }
}


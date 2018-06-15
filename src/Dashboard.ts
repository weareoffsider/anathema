import {screen, list, listtable, log, box, Widgets} from 'blessed'
import Watcher, {WatchEntry} from './Watcher'
import RunOnceMonitor from './RunOnceMonitor'
import TaskMonitor from './TaskMonitor'
import {Anathema} from './index'
import {inspect} from 'util'
import * as process from 'process'

export default class Dashboard {
  public dashState: any
  private screen: Widgets.Screen
  private watcherBox: Widgets.ListElement
  private taskOutputBox: Widgets.ScrollableBoxElement
  private logOutputBox: Widgets.Log
  private oldLogFuncs: any
  private startupSchedule: any[][]

  constructor (
    public anathemaInstance: Anathema,
    public name: string,
    public rootDirectory: string,
    private endPromise: any,
    private crashPromise: any
  ) {
    this.startupSchedule = []
    this.dashState = {
      monitors: [],
      selected: null,
    }
  }

  init () {
    this.screen = screen({smartCSR: true})
    this.screen.title = "Anathema Task Runner"
    this.watcherBox = list({
      top: 0,
      left: 0,
      width: "50%",
      height: "50%",
      items: [],
      keys: true,
      align: 'left',
      tags: true,
      style: {
        selected: {
          underline: true,
        },
      },
      interactive: true,
      scrollable: true,
      invertSelected: false,
      border: {
        type: 'line',
      },
    })
    this.taskOutputBox = list({
      top: 0,
      right: 0,
      width: "50%",
      height: "50%",
      content: "",
      keys: true,
      align: 'left',
      label: 'Task Output',
      tags: true,
      scrollable: true,
      interactive: true,
      border: {
        type: 'line',
      },
    })
    this.logOutputBox = log({
      bottom: 0,
      left: 0,
      width: "100%",
      height: "50%",
      align: 'left',
      label: 'Console Output',
      scrollbar: {
        track: {
          bg: 'red',
          fg: 'blue',
        },
      },
      scrollable: true,
      style: {
        scrollbar: {
          bg: 'blue',
        }
      },
      border: {
        type: 'line',
      },
    })
    this.screen.append(this.watcherBox)
    this.screen.append(this.taskOutputBox)
    this.screen.append(this.logOutputBox)
    this.screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      return process.exit(0);
    });
    this.screen.key(['pageup'], (ch, key) => {
      this.logOutputBox.scroll(-10)
    });
    this.screen.key(['pagedown'], (ch, key) => {
      this.logOutputBox.scroll(10)
    });
    this.watcherBox.focus()
    this.watcherBox.on('select', this.updateSelection.bind(this))
    this.screen.render()
    this.watcherBox.setLabel('Tasks')
    this.patchLogger()
  }

  patchLogger () {
    this.oldLogFuncs = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    }

    function outputItem (item: any) {
      if (typeof item == "string") {
        return item
      } else {
        return inspect(item)
      }
    }

    console.log = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => outputItem(arg)).join(', '))
      this.updateAndRender()
    }
    console.warn = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => outputItem(arg)).join(', '))
      this.updateAndRender()
    }
    console.error = (...args: any[]) => {
      this.logOutputBox.log(args.map((arg) => outputItem(arg)).join(', '))
      this.updateAndRender()
    }
    
    process.on('uncaughtException', (err) => {
      console.log = this.oldLogFuncs.log
      console.warn = this.oldLogFuncs.error
      console.error = this.oldLogFuncs.warn
      this.screen.destroy()
      console.error(err.stack || err)
      process.exit(1)
    })
  }

  addToLog (str: string) {
    this.logOutputBox.log(str)
  }

  updateSelection (event: any) {
    this.dashState.selected = event.index - 2
    this.updateAndRender()
  }

  update () {
    const monitorItems: string[] = []
    this.dashState.monitors.forEach((monitor: any, ix: number) => {
      if (monitor instanceof TaskMonitor) {
        monitorItems.push(monitor.outputStatusLine())

        if (this.dashState.selected == ix) {
          let content = monitor.outputTaskData()
          this.taskOutputBox.setContent(content || "No output.")
        }
      }
    })
    this.watcherBox.setItems((monitorItems as any))
  }

  render () {
    this.screen.render()
  }

  monitor (monitorIds: string[]) {
    const monitors = monitorIds.map((monitorId) => {
      const customMonitor = this.anathemaInstance.monitorRegister[monitorId]
      customMonitor.setMonitorContext(
        this,
        this.rootDirectory
      )
      return customMonitor
    })

    this.dashState.monitors = this.dashState.monitors.concat(monitors)
    this.startupSchedule.push(monitors)

    this.update()
    this.render()
  }

  task (taskIds: string[]) {
    const runOnceMonitor = new RunOnceMonitor(
      this.anathemaInstance,
      this,
      this.rootDirectory,
      taskIds
    )

    this.dashState.monitors.push(runOnceMonitor)
    this.startupSchedule.push([runOnceMonitor])
  }

  watch (watcherIds: string[]) {
    const watchers = watcherIds.map((watcherId) => {
      const watchEntry = this.anathemaInstance.watchRegister[watcherId]
      if (!watchEntry) {
        throw new Error(`Watcher named '${watcherId}' not found`)
      }

      return new Watcher(
        this.anathemaInstance,
        this,
        watcherId,
        this.rootDirectory,
        watchEntry.matcher,
        watchEntry.tasks,
        watchEntry.options
      )
    })

    this.dashState.monitors = this.dashState.monitors.concat(watchers)
    this.startupSchedule.push(watchers)

    this.update()
    this.render()
  }

  run() {
    let promise: Promise<any> = Promise.resolve(true)

    this.startupSchedule.forEach((monitors) => {
      promise = promise.then(() => {
        return Promise.all(monitors.map((monitor) => {
          return monitor.run()
        }))
      })
    })

    return promise
  }

  updateAndRender () {
    this.update()
    this.render()
  }
}
